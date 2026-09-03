variable "location" {
  description = "Azure region for all resources."
  type        = string
  default     = "swedencentral"
}

variable "resource_group_name" {
  description = "Name of the resource group to create or reuse."
  type        = string
  default     = "byggmester-bob-rg"
}

variable "project_name" {
  description = "Short project name — used in resource naming."
  type        = string
  default     = "byggmester"
}

variable "environment" {
  description = "Deployment environment: staging or production."
  type        = string
  default     = "production"
  validation {
    condition     = contains(["staging", "production"], var.environment)
    error_message = "Must be staging or production."
  }
}

variable "postgres_sku" {
  description = "Flexible Server compute SKU."
  type        = string
  default     = "B_Standard_B1ms"
}

variable "postgres_version" {
  description = "PostgreSQL major version."
  type        = string
  default     = "16"
}

variable "postgres_db_name" {
  description = "Database name to create inside the server."
  type        = string
  default     = "byggmester"
}

# Retrieve with: az webapp show --name <app-name> --resource-group <rg> --query outboundIpAddresses -o tsv
# Split on commas and add each IP here. Never use 0.0.0.0/0.
variable "app_service_outbound_ips" {
  description = "App Service outbound IPs to allow through the PostgreSQL firewall."
  type        = list(string)
  default     = []
}
