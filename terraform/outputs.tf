output "resource_group_name" {
  description = "Name of the resource group."
  value       = azurerm_resource_group.main.name
}

output "vm_private_ip" {
  description = "Private IP address of the Linux VM."
  value       = azurerm_network_interface.vm.private_ip_address
}

output "bastion_public_ip" {
  description = "Public IP address of the Azure Bastion host (the only public-facing address)."
  value       = azurerm_public_ip.bastion.ip_address
}

output "key_vault_uri" {
  description = "URI of the Key Vault."
  value       = azurerm_key_vault.main.vault_uri
}

output "storage_account_name" {
  description = "Name of the Storage Account."
  value       = azurerm_storage_account.main.name
}

output "vm_identity_principal_id" {
  description = "Principal ID of the VM's system-assigned managed identity."
  value       = azurerm_linux_virtual_machine.main.identity[0].principal_id
}
