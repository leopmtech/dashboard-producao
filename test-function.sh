#!/bin/bash

# Script de teste para função Netlify
# Uso: ./test-function.sh [local|prod]

MODE=${1:-local}

echo "🧪 Testando função Netlify (modo: $MODE)"
echo ""

if [ "$MODE" = "local" ]; then
  echo "📋 Para testar localmente:"
  echo "   1. Execute: netlify dev"
  echo "   2. Em outro terminal, execute:"
  echo "      curl 'http://localhost:8888/.netlify/functions/notion?route=orders'"
  echo ""
  echo "📋 Ou teste o endpoint health:"
  echo "   curl 'http://localhost:8888/.netlify/functions/notion?route=health'"
  echo ""
elif [ "$MODE" = "prod" ]; then
  echo "📋 Para testar em produção:"
  echo "   curl -I 'https://SEU_SITE.netlify.app/.netlify/functions/notion?route=orders'"
  echo ""
  echo "   Ou teste o endpoint health:"
  echo "   curl 'https://SEU_SITE.netlify.app/.netlify/functions/notion?route=health'"
  echo ""
fi

echo "✅ Verificações de configuração:"
echo ""

# Verificar arquivos
if [ -f "netlify.toml" ]; then
  echo "✅ netlify.toml existe"
  if grep -q "/.netlify/functions/\*" netlify.toml; then
    echo "✅ Redirect para funções configurado no netlify.toml"
  else
    echo "❌ Redirect para funções NÃO encontrado no netlify.toml"
  fi
else
  echo "❌ netlify.toml não encontrado"
fi

if [ -f "public/_redirects" ]; then
  echo "✅ _redirects existe"
  if grep -q "/.netlify/functions/\*" public/_redirects; then
    echo "✅ Redirect para funções configurado no _redirects"
  else
    echo "❌ Redirect para funções NÃO encontrado no _redirects"
  fi
else
  echo "❌ _redirects não encontrado"
fi

if [ -f "netlify/functions/notion.js" ]; then
  echo "✅ notion.js existe"
else
  echo "❌ notion.js não encontrado"
fi

echo ""
echo "📝 IMPORTANTE:"
echo "   - O redirect para /.netlify/functions/* DEVE vir ANTES do redirect genérico /*"
echo "   - Isso garante que as funções não sejam interceptadas pelo React Router"
echo "   - Após fazer deploy, verifique os logs do Netlify para debug"

