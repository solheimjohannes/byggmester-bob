output "postgres_server_fqdn" {
  description = "PostgreSQL Flexible Server FQDN."
  value       = azurerm_postgresql_flexible_server.main.fqdn
}

output "postgres_database_name" {
  description = "Database name."
  value       = var.postgres_db_name
}

output "postgres_admin_login" {
  description = "PostgreSQL admin username."
  value       = azurerm_postgresql_flexible_server.main.administrator_login
}

output "key_vault_name" {
  description = "Key Vault name."
  value       = azurerm_key_vault.main.name
}

output "key_vault_uri" {
  description = "Key Vault URI."
  value       = azurerm_key_vault.main.vault_uri
}

output "database_url_keyvault_ref" {
  description = "App Service app-setting value to use for DATABASE_URL (Key Vault reference syntax)."
  value       = "@Microsoft.KeyVault(VaultName=${azurerm_key_vault.main.name};SecretName=${azurerm_key_vault_secret.database_url.name})"
}
