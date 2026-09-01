# Azure Demo — Terraform Configuration

Deploys a private Linux VM with a Key Vault and Storage Account in West Europe, using a System Assigned Managed Identity for credential-free access to both services.

## Architecture

```
Resource Group
├── Virtual Network (10.0.0.0/16)
│   └── App Subnet (10.0.1.0/24) — service endpoints: KeyVault + Storage
│       └── NSG (deny Internet inbound/outbound, allow service tags)
├── Network Interface (no public IP)
├── Linux VM (Standard_B2s, Ubuntu 22.04 LTS)
│   └── System Assigned Managed Identity
│       ├── Key Vault Secrets User → Key Vault
│       └── Storage Blob Data Contributor → Storage Account
├── Key Vault (Standard SKU, RBAC, network ACL: Deny public)
└── Storage Account (StorageV2, LRS, no public blob access)
```

## Prerequisites

- [Terraform](https://developer.hashicorp.com/terraform/downloads) >= 1.5
- Azure CLI authenticated (`az login`) with sufficient permissions:
  - Contributor on the target subscription (to create all resources)
  - User Access Administrator on the target subscription (to create role assignments)
- An SSH key pair — provide the **public** key as the `ssh_public_key` variable

## Usage

```bash
cd terraform/

# Copy and edit the example tfvars
cp terraform.tfvars.example terraform.tfvars
# Edit terraform.tfvars with your prefix and SSH public key

terraform init
terraform fmt
terraform validate
terraform plan -var-file=terraform.tfvars
terraform apply -var-file=terraform.tfvars   # only when ready to deploy
```

### Example `terraform.tfvars`

```hcl
prefix         = "myapp"       # 1-8 lowercase alphanumeric chars, globally unique
ssh_public_key = "ssh-rsa AAAA..."
```

## Input Variables

| Name | Description | Default |
|---|---|---|
| `prefix` | Short prefix for globally-unique names (KV, Storage). Max 8 chars. | `demo` |
| `location` | Azure region | `West Europe` |
| `resource_group_name` | Resource group name | `rg-demo-westeu` |
| `vnet_address_space` | VNet CIDR | `["10.0.0.0/16"]` |
| `app_subnet_cidr` | App subnet CIDR | `10.0.1.0/24` |
| `vm_size` | VM SKU | `Standard_B2s` |
| `admin_username` | VM admin username | `azureuser` |
| `ssh_public_key` | SSH public key **(required)** | — |
| `tags` | Resource tags | `{environment=demo, managed_by=terraform}` |

## Outputs

| Name | Description |
|---|---|
| `resource_group_name` | Created resource group name |
| `vm_private_ip` | Private IP of the VM |
| `vm_principal_id` | Managed identity object ID |
| `key_vault_uri` | Key Vault URI |
| `storage_account_name` | Storage Account name |
| `storage_primary_blob_endpoint` | Storage blob endpoint |

## SSH Access Caveat

**The VM has no public IP address.** This is intentional — it removes the VM from the internet attack surface entirely.

Direct SSH access requires one of the following:
- A jump host (bastion VM) in a second subnet within the same VNet
- Azure Bastion (add separately; not included to keep costs minimal)
- A VPN Gateway or ExpressRoute connection to the VNet

To add a jump host, create a second subnet and a VM with a public IP in that subnet, then SSH via:
```
ssh -J jumphost-user@<jump-public-ip> azureuser@<vm-private-ip>
```

## Security Notes

- Password authentication is disabled on the VM; SSH key only
- Key Vault uses RBAC authorization (not legacy access policies)
- Storage Account disables public blob access regardless of container ACLs
- NSG denies all Internet inbound; outbound is restricted to Key Vault and Storage service tags
- The VM authenticates to Key Vault and Storage via managed identity tokens (no stored credentials)
- Service endpoints route traffic over the Azure backbone; no internet traversal

## State

Uses a local Terraform backend (`terraform.tfstate` in the working directory). For team use, migrate to a remote backend (Azure Storage) and enable state locking.
