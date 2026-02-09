# Guia de Teste - Motores de Busca

## ✅ Funcionalidades Implementadas

### 1. Barra de Categorias (Navbar)

#### Dropdown de Categorias
- **Automóveis** → Abre gaveta com:
  - Todos Automóveis
  - Perfil Baixo (40, 45)
  - Perfil Médio (50, 55)
  - Perfil Alto (60, 65)

- **SUV e 4x4** → Abre gaveta com:
  - Todos SUV e 4x4
  - On-Road
  - All-Terrain

- **Caminhonetes** → Abre gaveta com:
  - Todos Caminhonetes
  - Light Truck
  - Carga Pesada

- **Vans** → Abre gaveta com:
  - Todos Vans
  - Comercial
  - Passageiros

#### Dropdown de Marcas
- Goodyear
- Michelin
- Pirelli
- Continental
- Bridgestone

### 2. Produtos Cadastrados (Mock Data)

#### Produtos Disponíveis:
1. **Goodyear Eagle F1** - 225/45R17 - Passeio - R$ 789,90
2. **Michelin Primacy 4** - 205/55R16 - Passeio - R$ 649,90
3. **Pirelli Scorpion ATR** - 265/70R16 - SUV - R$ 899,90
4. **Continental ContiCrossContact** - 255/50R19 - SUV - R$ 1.199,90
5. **Bridgestone Turanza** - 195/65R15 - Passeio - R$ 549,90
6. **Goodyear Wrangler** - 235/60R16 - Caminhonete - R$ 729,90
7. **Michelin Pilot Sport 4** - 245/40R18 - Passeio - R$ 1.099,90
8. **Pirelli Cinturato P7** - 215/50R17 - Passeio - R$ 699,90
9. **Continental VanContact** - 215/65R16 - Van - R$ 679,90
10. **Bridgestone Dueler** - 265/65R17 - SUV - R$ 849,90

### 3. Como Testar

#### Teste 1: Categoria Automóveis
1. Passe o mouse sobre "Automóveis" na barra de categorias
2. Clique em "Perfil Baixo"
3. **Resultado esperado**: Mostra pneus 225/45R17 e 245/40R18

#### Teste 2: Marca Goodyear
1. Passe o mouse sobre "Marcas"
2. Clique em "Goodyear"
3. **Resultado esperado**: Mostra 2 produtos Goodyear

#### Teste 3: Categoria SUV
1. Passe o mouse sobre "SUV e 4x4"
2. Clique em "Todos SUV e 4x4"
3. **Resultado esperado**: Mostra 3 produtos SUV

#### Teste 4: Busca Avançada (HomePage)
1. Na página inicial, preencha:
   - Largura: 225
   - Perfil: 45
   - Diâmetro: 17
2. Clique em "Buscar"
3. **Resultado esperado**: Navega para /products com filtro aplicado

#### Teste 5: Filtros na Página de Produtos
1. Vá para /products
2. Abra o painel de filtros
3. Selecione marca "Michelin"
4. Clique em "Aplicar Filtros"
5. **Resultado esperado**: Mostra apenas produtos Michelin

### 4. Verificação de Conexão

#### ✅ Conexões Funcionando:
- Navbar → useTireStore (setFilters)
- Dropdown → navigate('/products') + setFilters
- HomePage busca → navigate('/products') + setFilters
- ProductsPage → filteredTires (produtos filtrados)
- Filtros laterais → applyFilters()

#### ✅ Fluxo de Dados:
```
Navbar/HomePage
    ↓ setFilters()
useTireStore
    ↓ applyFilters()
filteredTires
    ↓
ProductsPage (exibe produtos)
```

### 5. Produtos por Categoria

- **Passeio**: 5 produtos
- **SUV**: 3 produtos
- **Caminhonete**: 1 produto
- **Van**: 1 produto

### 6. Produtos por Marca

- **Goodyear**: 2 produtos
- **Michelin**: 2 produtos
- **Pirelli**: 2 produtos
- **Continental**: 2 produtos
- **Bridgestone**: 2 produtos

## 🔧 Troubleshooting

Se os filtros não funcionarem:
1. Limpe o cache do navegador (Ctrl+Shift+Delete)
2. Recarregue com Ctrl+F5
3. Verifique o console do navegador (F12)
4. Limpe o localStorage: `localStorage.clear()`

## ✅ Status Final

Todos os motores de busca estão **FUNCIONAIS** e conectados:
- ✅ Dropdown de categorias
- ✅ Dropdown de marcas
- ✅ Busca avançada (HomePage)
- ✅ Filtros laterais (ProductsPage)
- ✅ Conexão com produtos cadastrados
- ✅ Navegação entre páginas
