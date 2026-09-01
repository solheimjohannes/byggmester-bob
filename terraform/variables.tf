variable "prefix" {
  description = "Short prefix used for globally-unique resource names (Key Vault, Storage Account). Lowercase alphanumeric, max 8 chars."
  type        = string
  default     = "demo"

  validation {
    condition     = can(regex("^[a-z0-9]{1,8}$", var.prefix))
    error_message = "prefix must be 1-8 lowercase alphanumeric characters."
  }
}

variable "location" {
  description = "Azure region for all resources."
  type        = string
  default     = "West Europe"
}

variable "resource_group_name" {
  description = "Name of the resource group to create."
  type        = string
  default     = "rg-demo-westeu"
}

variable "vnet_address_space" {
  description = "Address space for the virtual network."
  type        = list(string)
  default     = ["10.0.0.0/16"]
}

variable "app_subnet_cidr" {
  description = "CIDR block for the application subnet."
  type        = string
  default     = "10.0.1.0/24"
}

variable "vm_size" {
  description = "Azure VM SKU."
  type        = string
  default     = "Standard_B2s"
}

variable "admin_username" {
  description = "Admin username for the Linux VM."
  type        = string
  default     = "azureuser"
}

variable "ssh_public_key" {
  description = "SSH public key material for VM admin authentication."
  type        = string
}

variable "tags" {
  description = "Tags to apply to all resources."
  type        = map(string)
  default = {
    environment = "demo"
    managed_by  = "terraform"
  }
}
