@echo off
REM Script para limpar e reinstalar o projeto

echo ========================================
echo Limpando projeto...
echo ========================================

REM Remover node_modules
if exist node_modules (
    echo Removendo node_modules...
    rmdir /s /q node_modules
)

REM Remover package-lock.json
if exist package-lock.json (
    echo Removendo package-lock.json...
    del package-lock.json
)

REM Remover dist
if exist dist (
    echo Removendo dist...
    rmdir /s /q dist
)

echo.
echo ========================================
echo Instalando dependências...
echo ========================================

npm install

echo.
echo ========================================
echo Pronto! Execute: npm run dev
echo ========================================
