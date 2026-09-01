output "resource_group_name" {
  description = "Name of the created resource group."
  value       = azurerm_resource_group.main.name
}

output "vm_private_ip" {
  description = "Private IP address of the Linux VM."
  value       = azurerm_network_interface.vm.private_ip_address
}

output "vm_principal_id" {
  description = "Object ID of the VM's system-assigned managed identity."
  value       = azurerm_linux_virtual_machine.vm.identity[0].principal_id
}

output "key_vault_uri" {
  description = "URI of the Key Vault."
  value       = azurerm_key_vault.main.vault_uri
}

output "storage_account_name" {
  description = "Name of the Storage Account."
  value       = azurerm_storage_account.main.name
}

output "storage_primary_blob_endpoint" {
  description = "Primary blob service endpoint of the Storage Account."
  value       = azurerm_storage_account.main.primary_blob_endpoint
}
