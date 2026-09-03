#!/usr/bin/env bash
# Deploy (or update) the PostgreSQL Flexible Server and Key Vault for byggmester.
# Prerequisites: Terraform >= 1.5, Azure CLI logged in, Owner or Contributor + Key Vault
# Administrator role on the target subscription.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
INFRA_DIR="$SCRIPT_DIR/../infra/terraform"

ENVIRONMENT="${ENVIRONMENT:-production}"
RESOURCE_GROUP="${RESOURCE_GROUP:-byggmester-bob-rg}"
LOCATION="${LOCATION:-swedencentral}"

echo "==> Deploying PostgreSQL to environment: $ENVIRONMENT"
echo "==> Resource group: $RESOURCE_GROUP | Location: $LOCATION"

# ── 1. Confirm Azure CLI is authenticated ─────────────────────────────────────
if ! az account show --query id -o tsv &>/dev/null; then
  echo "ERROR: Not logged in to Azure CLI. Run: az login"
  exit 1
fi

SUBSCRIPTION_ID=$(az account show --query id -o tsv)
echo "==> Subscription: $SUBSCRIPTION_ID"

# ── 2. (Optional) Configure remote Terraform backend ─────────────────────────
# For production use, store tfstate in Azure Blob Storage (not local disk).
# Uncomment and fill in before first run:
#
# STORAGE_ACCOUNT="<your-tfstate-storage-account>"
# CONTAINER="tfstate"
# az storage account create --name "$STORAGE_ACCOUNT" --resource-group "$RESOURCE_GROUP" \
#   --sku Standard_LRS --encryption-services blob
# az storage container create --name "$CONTAINER" --account-name "$STORAGE_ACCOUNT"
#
# Then add a backend block to infra/terraform/providers.tf:
#   backend "azurerm" {
#     resource_group_name  = "<rg>"
#     storage_account_name = "<storage-account>"
#     container_name       = "tfstate"
#     key                  = "byggmester-${ENVIRONMENT}.tfstate"
#   }

# ── 3. Collect App Service outbound IPs (if the App Service already exists) ───
APP_SERVICE_NAME="${APP_SERVICE_NAME:-}"
TF_APP_IPS_ARG=""

if [[ -n "$APP_SERVICE_NAME" ]]; then
  echo "==> Fetching outbound IPs for App Service: $APP_SERVICE_NAME"
  RAW_IPS=$(az webapp show \
    --name "$APP_SERVICE_NAME" \
    --resource-group "$RESOURCE_GROUP" \
    --query outboundIpAddresses -o tsv 2>/dev/null || echo "")

  if [[ -n "$RAW_IPS" ]]; then
    # Convert comma-separated string to Terraform list syntax: ["1.2.3.4","5.6.7.8"]
    TF_IP_LIST=$(echo "$RAW_IPS" | tr ',' '\n' | awk '{printf "\"%s\",", $0}' | sed 's/,$//')
    TF_APP_IPS_ARG="-var=app_service_outbound_ips=[${TF_IP_LIST}]"
    echo "==> Will allow IPs: $RAW_IPS"
  else
    echo "WARN: Could not fetch App Service IPs. PostgreSQL firewall will have no rules until re-run."
  fi
else
  echo "WARN: APP_SERVICE_NAME not set. PostgreSQL firewall rules skipped."
  echo "      Re-run with APP_SERVICE_NAME=<name> after the App Service is provisioned."
fi

# ── 4. Terraform init + apply ─────────────────────────────────────────────────
cd "$INFRA_DIR"

echo "==> terraform init"
terraform init

echo "==> terraform apply"
terraform apply \
  -auto-approve \
  -var="environment=$ENVIRONMENT" \
  -var="resource_group_name=$RESOURCE_GROUP" \
  -var="location=$LOCATION" \
  ${TF_APP_IPS_ARG}

# ── 5. Print outputs ──────────────────────────────────────────────────────────
echo ""
echo "==> Deployment complete. Outputs:"
terraform output

FQDN=$(terraform output -raw postgres_server_fqdn)
KV_NAME=$(terraform output -raw key_vault_name)
DB_URL_REF=$(terraform output -raw database_url_keyvault_ref)

echo ""
echo "==> PostgreSQL FQDN:         $FQDN"
echo "==> Key Vault name:          $KV_NAME"
echo ""
echo "==> App Service DATABASE_URL app setting (Key Vault reference):"
echo "    $DB_URL_REF"
echo ""
echo "==> To read the full DATABASE_URL locally (for backend dev/migration):"
echo "    az keyvault secret show --vault-name $KV_NAME --name DATABASE-URL --query value -o tsv"
echo ""
echo "==> Next steps:"
echo "    1. Run Prisma migrations: DATABASE_URL=\$(az keyvault secret show --vault-name $KV_NAME --name DATABASE-URL --query value -o tsv) npx prisma migrate deploy"
echo "    2. Set the App Service app setting:  DATABASE_URL = $DB_URL_REF"
echo "    3. Give the App Service managed identity 'Key Vault Secrets User' on the vault."
