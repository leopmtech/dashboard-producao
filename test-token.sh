#!/bin/bash

# Script shell para testar o token do Notion rapidamente
# Uso: ./test-token.sh SEU_TOKEN

TOKEN="${1:-$NOTION_TOKEN}"

if [ -z "$TOKEN" ]; then
  echo "❌ Token não fornecido!"
  echo ""
  echo "📝 Como usar:"
  echo "   ./test-token.sh SEU_TOKEN"
  echo "   ou"
  echo "   NOTION_TOKEN=seu_token ./test-token.sh"
  exit 1
fi

echo "🔍 Testando token do Notion..."
echo "📋 Token (primeiros 10 caracteres): ${TOKEN:0:10}..."
echo ""

echo "✅ Testando acesso à API..."
RESPONSE=$(curl -s -w "\n%{http_code}" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Notion-Version: 2022-06-28" \
  https://api.notion.com/v1/users/me)

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" = "200" ]; then
  echo "✅ Token VÁLIDO!"
  echo "📋 Resposta:"
  echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
  echo ""
  echo "✅ RESUMO: Token está funcionando corretamente!"
else
  echo "❌ Token INVÁLIDO ou EXPIRADO"
  echo "📊 Status HTTP: $HTTP_CODE"
  echo "📋 Resposta:"
  echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
  echo ""
  echo "💡 Solução: Gere um novo token em https://www.notion.so/my-integrations"
  exit 1
fi

