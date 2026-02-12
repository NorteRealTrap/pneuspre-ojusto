# Fontes de Logos de Marcas de Pneus

Este documento lista várias fontes onde você pode encontrar logos de marcas de pneus para usar no componente `TireMarquee`.

## Wikimedia Commons (Usado Atualmente)

**Vantagem**: Logos em alta qualidade, formato SVG, completamente livres para uso
**Desvantagem**: Nem sempre tem todas as marcas

**Exemplos de URLs**:
```
https://upload.wikimedia.org/wikipedia/commons/a/a9/Michelin_logo.svg
https://upload.wikimedia.org/wikipedia/commons/thumb/f/f7/Goodyear_logo.svg
```

**Como encontrar**: Acesse [commons.wikimedia.org](https://commons.wikimedia.org) e busque pelo nome da marca + "logo"

## Clearbit Logo API

**Vantagem**: API automática que retorna logos com base no domínio
**Desvantagem**: Requer chamadas à API, pode ter limite de requisições

**Exemplo de uso**:
```typescript
const logoUrl = `https://logo.clearbit.com/${brand.website}`;
```

**URLs diretas para marcas populares**:
```
https://logo.clearbit.com/michelin.com
https://logo.clearbit.com/goodyear.com
https://logo.clearbit.com/pirelli.com
https://logo.clearbit.com/continental.com
https://logo.clearbit.com/bridgestone.com
```

## SVG Repo

**Vantagem**: Milhares de logos em SVG, muitas marcas disponíveis
**Website**: [svgrepo.com](https://svgrepo.com)

**Exemplo de busca**: Buscar "Michelin tire logo" no site

## Wikipedia (Método Manual)

**Vantagem**: Logos de alta qualidade
**Processo**: 
1. Abra wikipedia.org
2. Procure pela página da marca
3. Clique com botão direito na logo
4. "Copiar endereço da imagem"

**Exemplo**:
```
https://en.wikipedia.org/wiki/Michelin
```

## Logos Oficiais Diretos

Algumas marcas hospedam suas logos em CDNs próprias:

```typescript
// Michelin
https://www.michelin.com/_assets/app/images/logos/michelin-logo.svg

// Goodyear
https://www.goodyear.com/en-US/misc/logos

// Bridgestone
https://www.bridgestone.com/en/common/img/brands/bridgestone_logo.svg
```

## FontAwesome (Ícones)

Se preferir ícones ao invés de logos:
```typescript
// Não tem logos específicas, mas tem ícones de pneus
import { Tire } from 'lucide-react';
```

## Como Implementar Diferentes Fontes

### Opção 1: Usando Clearbit API (Recomendado para atualizações automáticas)

```typescript
const TIRE_BRANDS = [
  {
    name: 'Michelin',
    logo: 'https://logo.clearbit.com/michelin.com',
  },
  {
    name: 'Goodyear',
    logo: 'https://logo.clearbit.com/goodyear.com',
  },
  // ... mais marcas
];
```

### Opção 2: Misturar Fontes (Flexibilidade)

```typescript
const TIRE_BRANDS = [
  {
    name: 'Michelin',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/a/a9/Michelin_logo.svg',
    source: 'wikimedia',
  },
  {
    name: 'GoodyearBrand',
    logo: 'https://logo.clearbit.com/goodyear.com',
    source: 'clearbit',
  },
  {
    name: 'CustomBrand',
    logo: 'https://seu-cdn.com/logos/custombrand.png',
    source: 'custom',
  },
];
```

### Opção 3: Hospedar Localmente (Melhor Performance)

1. Salve as imagens em `public/logos/`
2. Referencie-as localmente:

```typescript
const TIRE_BRANDS = [
  {
    name: 'Michelin',
    logo: '/logos/michelin.svg',
  },
  // ... mais marcas
];
```

## Lista Completa de Marcas com URLs do Clearbit

```typescript
const TIRE_BRANDS = [
  { name: 'Michelin', logo: 'https://logo.clearbit.com/michelin.com' },
  { name: 'Goodyear', logo: 'https://logo.clearbit.com/goodyear.com' },
  { name: 'Pirelli', logo: 'https://logo.clearbit.com/pirelli.com' },
  { name: 'Continental', logo: 'https://logo.clearbit.com/continental.com' },
  { name: 'Bridgestone', logo: 'https://logo.clearbit.com/bridgestone.com' },
  { name: 'Yokohama', logo: 'https://logo.clearbit.com/yokohama.com' },
  { name: 'Dunlop', logo: 'https://logo.clearbit.com/dunloptyres.com' },
  { name: 'Firestone', logo: 'https://logo.clearbit.com/firestonetyres.com' },
  { name: 'Hankook', logo: 'https://logo.clearbit.com/hankooktire.com' },
  { name: 'Cooper', logo: 'https://logo.clearbit.com/coopertire.com' },
  { name: 'Maxxis', logo: 'https://logo.clearbit.com/maxxis.com' },
  { name: 'Toyo', logo: 'https://logo.clearbit.com/toyotires.com' },
  { name: 'Kumho', logo: 'https://logo.clearbit.com/kumhotire.co.kr' },
  { name: 'Nexen', logo: 'https://logo.clearbit.com/nexentire.com' },
  { name: 'Vredestein', logo: 'https://logo.clearbit.com/vredestein.com' },
];
```

## Considerações de Licença

| Fonte | Licença | Uso Comercial | Atribuição |
|-------|---------|---------------|-----------|
| Wikimedia Commons | CC BY-SA 3.0 | ✅ Sim | ✅ Requerida |
| Clearbit | Comercial | ✅ Sim | ⚠️ Verifique termos |
| Wikipedia | CC BY-SA | ✅ Sim | ✅ Requerida |
| SVG Repo | Variada | ⚠️ Verifique | ⚠️ Verifique |
| Logos Oficiais | Propriedade | ⚠️ Verifique | ✅ Recomendada |

## Recomendação Final

**Para o seu projeto de e-commerce (Pneus Preçojusto):**

1. Use Wikimedia Commons para o MVP (atual)
2. Considere migrar para Clearbit API quando quiser adicionar novas marcas automaticamente
3. Se performace for crítica, hospede as imagens localmente em `public/logos/`

---

**Última atualização**: 11 de fevereiro de 2026
