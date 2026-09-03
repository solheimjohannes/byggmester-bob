locals {
  name_suffix = "${var.project_name}-${var.environment}"
  tags = {
    project     = var.project_name
    environment = var.environment
  }
}

data "azurerm_client_config" "current" {}

resource "azurerm_resource_group" "main" {
  name     = var.resource_group_name
  location = var.location
  tags     = local.tags
}

# Strong random password — stored in Key Vault, never in tfstate at rest on disk in production.
# Use a remote backend (e.g. Azure Blob Storage with state encryption) before running in production.
resource "random_password" "db_admin" {
  length           = 40
  special          = true
  override_special = "!#%&*()-_=+[]{}:?"
  min_upper        = 4
  min_lower        = 4
  min_numeric      = 4
  min_special      = 2
}

resource "azurerm_postgresql_flexible_server" "main" {
  name                   = "psql-${local.name_suffix}"
  resource_group_name    = azurerm_resource_group.main.name
  location               = azurerm_resource_group.main.location
  version                = var.postgres_version
  administrator_login    = "pgadmin"
  administrator_password = random_password.db_admin.result
  storage_mb             = 32768
  sku_name               = var.postgres_sku
  backup_retention_days  = 7

  # Azure AD auth is on by default on Flexible Server but Prisma requires a plain connection URL.
  # The admin password is stored in Key Vault; the App Service reads it via managed identity.
  # Enabling Azure AD auth at the Entra level is possible but requires a token-refresh shim in
  # the Prisma datasource — out of scope here, documented as a follow-up if needed.

  tags = local.tags
}

resource "azurerm_postgresql_flexible_server_database" "main" {
  name      = var.postgres_db_name
  server_id = azurerm_postgresql_flexible_server.main.id
  collation = "en_US.utf8"
  charset   = "utf8"
}

# Firewall: only the App Service outbound IPs are allowed. Never 0.0.0.0/0.
# If no IPs are provided yet (first run), add them after App Service is provisioned.
resource "azurerm_postgresql_flexible_server_firewall_rule" "app_service" {
  for_each         = { for i, ip in var.app_service_outbound_ips : "app-${i}" => ip }
  name             = "allow-appservice-${each.key}"
  server_id        = azurerm_postgresql_flexible_server.main.id
  start_ip_address = each.value
  end_ip_address   = each.value
}

# Key Vault — names must be globally unique and 3-24 chars.
resource "azurerm_key_vault" "main" {
  name                       = "kv-${local.name_suffix}"
  location                   = azurerm_resource_group.main.location
  resource_group_name        = azurerm_resource_group.main.name
  tenant_id                  = data.azurerm_client_config.current.tenant_id
  sku_name                   = "standard"
  soft_delete_retention_days = 7
  purge_protection_enabled   = true

  # Access policy for the identity running terraform (CI service principal or developer).
  access_policy {
    tenant_id = data.azurerm_client_config.current.tenant_id
    object_id = data.azurerm_client_config.current.object_id

    secret_permissions = ["Get", "List", "Set", "Delete", "Recover", "Backup", "Restore"]
  }

  tags = local.tags
}

# DATABASE_URL stored as a Key Vault secret — the App Service reads it via managed identity.
# The connection string is marked sensitive so Terraform never prints it in plan output.
resource "azurerm_key_vault_secret" "database_url" {
  name  = "DATABASE-URL"
  value = "postgresql://pgadmin:${random_password.db_admin.result}@${azurerm_postgresql_flexible_server.main.fqdn}:5432/${var.postgres_db_name}?sslmode=require"

  key_vault_id = azurerm_key_vault.main.id

  depends_on = [azurerm_key_vault.main]
}

# Once the App Service managed identity is known, add an access policy so it can read the secret.
# Uncomment and set object_id to the App Service's system-assigned managed identity principal ID.
#
# resource "azurerm_key_vault_access_policy" "app_service" {
#   key_vault_id = azurerm_key_vault.main.id
#   tenant_id    = data.azurerm_client_config.current.tenant_id
#   object_id    = "<app-service-managed-identity-principal-id>"
#
#   secret_permissions = ["Get", "List"]
# }
