# Pasta de Imagens Públicas

Esta pasta contém as imagens estáticas do site que são acessíveis publicamente.

## Imagens Necessárias

### 1. Logo da Loja
**Arquivo:** `logo.png`
- **Tamanho recomendado:** 200x50px (largura x altura)
- **Formato:** PNG com fundo transparente
- **Uso:** Aparece no topo do site (Navbar)
- **Cores:** Verde (#00A651) e Amarelo (#FDB913)

### 2. Banner de Topo
**Arquivo:** `banner-topo.png`
- **Tamanho recomendado:** 1920x600px (largura x altura)
- **Formato:** PNG ou JPG otimizado
- **Uso:** Banner principal da página inicial (Hero Section)
- **Dica:** Use imagens relacionadas a pneus, carros ou estradas

### 3. Selo de Segurança
**Arquivo:** `selo-seguranca.png`
- **Tamanho recomendado:** 200x200px (quadrado)
- **Formato:** PNG com fundo transparente
- **Uso:** Aparece no rodapé do site (Footer)
- **Dica:** Selo de certificação, segurança ou autenticidade

## Como Adicionar as Imagens

1. Coloque suas imagens nesta pasta (`public/`)
2. Renomeie os arquivos exatamente como:
   - `logo.png` (para a logo)
   - `banner-topo.png` (para o banner)
   - `selo-seguranca.png` (para o selo)
3. Reinicie o servidor de desenvolvimento se estiver rodando

## Fallback

Se as imagens não forem adicionadas:
- **Logo:** Mostrará texto "Pneus Preçojusto" com gradiente verde/amarelo
- **Banner:** Mostrará gradiente verde/amarelo de fundo
- **Selo:** Não aparecerá (oculto automaticamente)

## Otimização

Para melhor performance, otimize suas imagens antes de adicionar:
- Use ferramentas como TinyPNG, ImageOptim ou Squoosh
- Considere usar formato WebP para melhor compressão
- Mantenha o tamanho dos arquivos abaixo de 500KB

