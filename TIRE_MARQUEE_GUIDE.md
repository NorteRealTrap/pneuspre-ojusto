# Guia de Uso - Componente TireMarquee

## Visão Geral

O componente `TireMarquee` é uma seção responsiva que exibe as marcas de pneus parceiras em um efeito de carrossel contínuo. O componente foi integrado à página inicial (HomePage) e apresenta as 15 principais marcas de pneus do mercado.

## Localização do Componente

- **Arquivo do Componente**: `src/app/components/TireMarquee.tsx`
- **Arquivo de Estilos**: `src/app/components/TireMarquee.css`
- **Integração**: `src/app/pages/HomePage.tsx`

## Características

✅ **Marquee Infinito**: Animação contínua e suave de rolagem
✅ **Responsivo**: Adapta-se perfeitamente a todos os tamanhos de tela
✅ **Hover Effect**: Logos em preto e branco que ganham cor ao passar o mouse
✅ **Carregamento Lazy**: Imagens carregadas sob demanda para melhor performance
✅ **Fallback Elegante**: Se uma logo não carregar, continua com opacidade reduzida

## Marcas Incluídas

1. Michelin
2. Goodyear
3. Pirelli
4. Continental
5. Bridgestone
6. Yokohama
7. Dunlop
8. Firestone
9. Hankook
10. Cooper
11. Maxxis
12. Toyo
13. Kumho
14. Nexen
15. Vredestein

## Como Personalizar

### Adicionar uma Nova Marca

Edite o arquivo `src/app/components/TireMarquee.tsx` e adicione um novo objeto ao array `TIRE_BRANDS`:

```typescript
const TIRE_BRANDS = [
  // ... marcas existentes
  {
    name: 'Nome da Marca',
    logo: 'URL_da_logo.svg',
  },
];
```

### Alterar URLs das Logos

As logos estão usando URLs do Wikimedia Commons, que são públicas e livres para uso. Se preferir usar logos diferentes:

1. Procure a logo em formato SVG (preferível) ou PNG com fundo transparente
2. Hospede a imagem em um CDN
3. Substitua a URL no array `TIRE_BRANDS`

**Fontes recomendadas para logos**:
- Wikimedia Commons (usado atualmente)
- GraphQL Brand Assets APIs
- Brand.com/media (sites oficiais das marcas)
- CDNs especializados como Clearbit ou LogoAPI

### Alterar Velocidade da Animação

Edite o arquivo `src/app/components/TireMarquee.css`:

```css
.tire-marquee {
  animation: scroll-marquee 30s linear infinite; /* Altere 30s para a duração desejada */
}

@media (max-width: 480px) {
  .tire-marquee {
    animation: scroll-marquee 25s linear infinite; /* Versão móvel */
  }
}
```

### Alterar Espaçamento e Tamanhos

**Gap entre logos**:
```css
.tire-marquee {
  gap: 2.5rem; /* Altere este valor */
}
```

**Tamanho das logos**:
```css
.tire-marquee-logo {
  max-width: 140px;  /* Largura máxima */
  max-height: 70px;  /* Altura máxima */
}
```

### Alterar Cores e Estilos

**Novo efeito ao passar o mouse**:
```css
.tire-marquee-item:hover .tire-marquee-logo {
  filter: grayscale(0%) drop-shadow(0 0 8px rgba(59, 130, 246, 0.5));
  opacity: 1;
  transform: scale(1.1);
}
```

**Alterar cor de fundo:**
```css
.tire-marquee-wrapper {
  background: linear-gradient(135deg, #f3f4f6, #ffffff);
}
```

## Integração no Projeto

O componente é automaticamente renderizado na homepage entre o banner do meio e a seção "Mais Vendidos":

```tsx
<TireMarquee />
```

Para adicionar em outras páginas, simplesmente importe e use:

```tsx
import { TireMarquee } from '../components/TireMarquee';

export function MinhaPage() {
  return (
    <div>
      <h1>Minha Página</h1>
      <TireMarquee />
    </div>
  );
}
```

## Performance

- ✅ Imagens carregadas com `loading="lazy"`
- ✅ Fallback para erro de carregamento
- ✅ CSS otimizado com `will-change` na animação
- ✅ Grayscale filter pré-aplicado (menos processamento no hover)

## Responsividade

O componente se adapta automaticamente:

- **Desktop**: Logos em tamanho completo com gap 2.5rem
- **Tablet (< 768px)**: Logos reduzidas com gap 1.5rem
- **Mobile (< 480px)**: Logos pequenas com gap 1rem

## Troubleshooting

### As logos não estão aparecendo

1. Verifique a conexão com a internet
2. Valide as URLs das imagens
3. Abra o Console do Navegador (F12) para ver erros

### A animação está travando

1. Reduza o número de imagens
2. Aumente o tempo de animação (`30s` para `40s`)
3. Limpe o cache do navegador

### As logos estão cortadas

Ajuste `max-width` e `max-height` no arquivo `TireMarquee.css`

## SEO

O componente inclui:
- ✅ Atributo `alt` em todas as imagens
- ✅ Semântica correta com `<section>`
- ✅ Heading `<h2>` para contexto
- ✅ Descrição da seção com `<p>`

## Acessibilidade

- ✅ Texto alternativo para todas as imagens
- ✅ Animação pausável (com `animation-play-state: paused`)
- ✅ Contraste adequado do texto

---

**Data de Criação**: 11 de fevereiro de 2026
**Componente**: TireMarquee v1.0
**Projeto**: Pneus Preçojusto
