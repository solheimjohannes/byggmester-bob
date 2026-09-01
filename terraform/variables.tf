variable "prefix" {
  description = "Prefix for all resource names. Use lowercase alphanumeric (e.g. 'bygg'). Must be short enough to keep Key Vault names under 24 chars."
  type        = string
  default     = "bygg"

  validation {
    condition     = can(regex("^[a-z][a-z0-9]{1,8}$", var.prefix))
    error_message = "prefix must be 2-9 lowercase alphanumeric characters starting with a letter."
  }
}

variable "location" {
  description = "Azure region for all resources."
  type        = string
  default     = "westeurope"
}

variable "ssh_public_key" {
  description = "SSH public key content for the VM admin user."
  type        = string
  sensitive   = true
}

variable "admin_username" {
  description = "Admin username for the Linux VM."
  type        = string
  default     = "azureuser"
}

variable "vm_size" {
  description = "Azure VM size."
  type        = string
  default     = "Standard_B2s"
}

variable "storage_replication_type" {
  description = "Storage account replication type (LRS for dev, ZRS/GRS for production)."
  type        = string
  default     = "LRS"

  validation {
    condition     = contains(["LRS", "ZRS", "GRS", "RAGRS", "GZRS", "RAGZRS"], var.storage_replication_type)
    error_message = "storage_replication_type must be one of LRS, ZRS, GRS, RAGRS, GZRS, RAGZRS."
  }
}
