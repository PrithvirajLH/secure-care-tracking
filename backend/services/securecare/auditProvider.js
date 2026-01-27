/**
 * Audit Provider - Automatically selects the appropriate audit implementation
 * based on environment configuration.
 * 
 * If AZURE_STORAGE_CONNECTION_STRING is set, uses Azure Table Storage.
 * Otherwise, falls back to SQL Server.
 */

require('dotenv').config();

const useAzureTableAudit = !!process.env.AZURE_STORAGE_CONNECTION_STRING;

let auditModule;

if (useAzureTableAudit) {
  auditModule = require('./auditAzureTable');
  console.log('📋 Audit Provider: Azure Table Storage');
} else {
  auditModule = require('./audit');
  console.log('📋 Audit Provider: SQL Server');
}

module.exports = auditModule;
