#!/bin/bash

# Script para otorgar admin consent para permisos de aplicación
# Requiere: az cli autenticado con permisos de admin

APP_ID="30502fe2-c2b9-438f-8d0e-c5efb490b324"
SP_ID="4bbee7fd-3855-4f7b-8887-88a6cc4097f3"
GRAPH_SP_ID="aa5db63b-7bbd-4a96-80cd-ac8d108804d9"

# Mail.Read (Application permission)
MAIL_READ_ID="810c84a8-4a9e-49e8-89a3-50998cb0b8f0"

# Mail.ReadWrite (Application permission) 
MAIL_READWRITE_ID="e2a3a72e-5f79-4c64-b1b1-878b674786c9"

echo "Otorgando admin consent para Mail.Read..."
az rest --method POST \
  --uri "https://graph.microsoft.com/v1.0/servicePrincipals/$SP_ID/appRoleAssignments" \
  --body "{
    \"principalId\": \"$SP_ID\",
    \"resourceId\": \"$GRAPH_SP_ID\",
    \"appRoleId\": \"$MAIL_READ_ID\"
  }" \
  --headers "Content-Type=application/json" || echo "Mail.Read might already be granted"

echo ""
echo "Otorgando admin consent para Mail.ReadWrite..."
az rest --method POST \
  --uri "https://graph.microsoft.com/v1.0/servicePrincipals/$SP_ID/appRoleAssignments" \
  --body "{
    \"principalId\": \"$SP_ID\",
    \"resourceId\": \"$GRAPH_SP_ID\",
    \"appRoleId\": \"$MAIL_READWRITE_ID\"
  }" \
  --headers "Content-Type=application/json" || echo "Mail.ReadWrite might already be granted"

echo ""
echo "✅ Admin consent otorgado. Probando..."
node test-outlook.js
