#!/bin/bash

# Script para build rápido instalando dependencias localmente primero
# Uso: ./build-fast.sh

set -e

echo "🚀 Build rápido de API Vekino..."

# Verificar que Docker está instalado
if ! command -v docker &> /dev/null; then
    echo "❌ Docker no está instalado"
    exit 1
fi

# Habilitar BuildKit
export DOCKER_BUILDKIT=1
export COMPOSE_DOCKER_CLI_BUILD=1

# Opción 1: Si node_modules existe localmente, usarlo
if [ -d "node_modules" ]; then
    echo "📦 Usando node_modules existente..."
    docker build --build-arg USE_LOCAL_NODE_MODULES=true -t api-vekino .
else
    echo "📦 Instalando dependencias localmente primero..."
    npm install --legacy-peer-deps --no-audit --no-fund
    
    echo "🐳 Construyendo imagen Docker..."
    docker build --build-arg USE_LOCAL_NODE_MODULES=true -t api-vekino .
fi

echo "✅ Build completado!"

