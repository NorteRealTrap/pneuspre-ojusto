# Exemplos de Uso - TireMarquee

Este documento contém exemplos práticos de como usar e customizar o componente TireMarquee.

## 1. Uso Básico (Atual)

```tsx
// src/app/pages/HomePage.tsx
import { TireMarquee } from '../components/TireMarquee';

export function HomePage() {
  return (
    <div>
      <h1>Bem-vindo</h1>
      <TireMarquee /> {/* Renderiza o componente com todas as marcas padrão */}
    </div>
  );
}
```

## 2. Adicionar Mais Marcas

Edite `src/app/components/TireMarquee.tsx`:

```typescript
const TIRE_BRANDS = [
  // Marcas existentes...
  
  // Adicione novas marcas no final:
  {
    name: 'BBS',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/9/96/BBS_logo.svg',
  },
  {
    name: 'Falken',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/5/52/Falken_Tires_logo.svg',
  },
  {
    name: 'Nitto',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/e/e5/NITTO_TIRE_LOGO.svg',
  },
];
```

## 3. Usar Logos Locais (Melhor Performance)

1. Crie uma pasta: `public/logos/tire-brands/`
2. Salve as imagens lá: `michelin.svg`, `goodyear.svg`, etc.
3. Atualize o componente:

```typescript
const TIRE_BRANDS = [
  {
    name: 'Michelin',
    logo: '/logos/tire-brands/michelin.svg',
  },
  {
    name: 'Goodyear',
    logo: '/logos/tire-brands/goodyear.svg',
  },
  // ... resto das marcas
];
```

## 4. Usar com API Dinâmica (Avançado)

Se quiser buscar marcas do banco de dados:

```typescript
// src/app/components/TireMarquee.tsx
import { useEffect, useState } from 'react';

interface TireBrand {
  id: string;
  name: string;
  logo: string;
}

export function TireMarquee() {
  const [brands, setBrands] = useState<TireBrand[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBrands = async () => {
      try {
        const response = await fetch('/api/tire-brands');
        const data = await response.json();
        setBrands(data);
      } catch (error) {
        console.error('Erro ao carregar marcas:', error);
        // Usar marcas padrão como fallback
        setBrands(DEFAULT_BRANDS);
      } finally {
        setLoading(false);
      }
    };

    fetchBrands();
  }, []);

  if (loading) return <div>Carregando marcas...</div>;

  return (
    <section className="tire-marquee-section">
      {/* ... resto do componente */}
      <div className="tire-marquee">
        {brands.map((brand, index) => (
          <div key={`${brand.id}-1-${index}`} className="tire-marquee-item">
            <img
              src={brand.logo}
              alt={`Logo ${brand.name}`}
              className="tire-marquee-logo"
              loading="lazy"
              onError={(e) => {
                e.currentTarget.style.opacity = '0.5';
              }}
            />
          </div>
        ))}
        {/* Duplicar para efeito contínuo */}
        {brands.map((brand, index) => (
          <div key={`${brand.id}-2-${index}`} className="tire-marquee-item">
            <img
              src={brand.logo}
              alt={`Logo ${brand.name}`}
              className="tire-marquee-logo"
              loading="lazy"
              onError={(e) => {
                e.currentTarget.style.opacity = '0.5';
              }}
            />
          </div>
        ))}
      </div>
    </section>
  );
}
```

## 5. Versão com Navegação (Clicável)

```typescript
// src/app/components/TireMarqueeClickable.tsx
import { useNavigate } from 'react-router-dom';
import './TireMarquee.css';

// ... mesmo array de TIRE_BRANDS, mas agora com slug:
const TIRE_BRANDS = [
  {
    name: 'Michelin',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/a/a9/Michelin_logo.svg',
    slug: 'michelin',
  },
  // ... resto das marcas com slug
];

export function TireMarqueeClickable() {
  const navigate = useNavigate();

  const handleBrandClick = (slug: string) => {
    navigate(`/marcas/${slug}`);
  };

  return (
    <section className="tire-marquee-section">
      <div className="tire-marquee-container">
        <h2 className="tire-marquee-title">Marcas Parceiras</h2>
        
        <div className="tire-marquee-wrapper">
          <div className="tire-marquee">
            {TIRE_BRANDS.map((brand, index) => (
              <div 
                key={`${brand.slug}-1-${index}`} 
                className="tire-marquee-item cursor-pointer"
                onClick={() => handleBrandClick(brand.slug)}
                role="button"
                tabIndex={0}
              >
                <img
                  src={brand.logo}
                  alt={`Logo ${brand.name}`}
                  className="tire-marquee-logo"
                  loading="lazy"
                />
              </div>
            ))}
            {/* Duplicar para efeito contínuo */}
            {TIRE_BRANDS.map((brand, index) => (
              <div 
                key={`${brand.slug}-2-${index}`}
                className="tire-marquee-item cursor-pointer"
                onClick={() => handleBrandClick(brand.slug)}
                role="button"
                tabIndex={0}
              >
                <img
                  src={brand.logo}
                  alt={`Logo ${brand.name}`}
                  className="tire-marquee-logo"
                  loading="lazy"
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
```

## 6. Versão com Rótulos

```typescript
// src/app/components/TireMarqueeWithLabels.tsx
export function TireMarqueeWithLabels() {
  return (
    <section className="tire-marquee-section">
      <div className="tire-marquee-wrapper">
        <div className="tire-marquee">
          {TIRE_BRANDS.map((brand, index) => (
            <div 
              key={`${brand.name}-1-${index}`} 
              className="tire-marquee-item flex flex-col items-center gap-2"
            >
              <img
                src={brand.logo}
                alt={`Logo ${brand.name}`}
                className="tire-marquee-logo"
                loading="lazy"
              />
              <span className="text-xs font-semibold text-gray-700">
                {brand.name}
              </span>
            </div>
          ))}
          {/* Duplicação... */}
        </div>
      </div>
    </section>
  );
}
```

## 7. Customizar Animação (Mais Rápida)

```css
/* TireMarquee.css - Alterar animação */

/* Original: 30s */
.tire-marquee {
  animation: scroll-marquee 30s linear infinite;
}

/* Mais rápida: 20s */
.tire-marquee {
  animation: scroll-marquee 20s linear infinite;
}

/* Bem mais rápida: 15s */
.tire-marquee {
  animation: scroll-marquee 15s linear infinite;
}

/* Com easing (menos linear) */
.tire-marquee {
  animation: scroll-marquee 30s ease-in-out infinite;
}
```

## 8. Grid em Vez de Marquee

Se preferir uma grade fixa ao invés de animação:

```tsx
export function TireGrid() {
  return (
    <section className="py-16 bg-gray-50">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl font-bold mb-12 text-center">Nossas Marcas</h2>
        
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-8">
          {TIRE_BRANDS.map((brand) => (
            <div 
              key={brand.name}
              className="flex items-center justify-center p-4 bg-white rounded-lg hover:shadow-md transition"
            >
              <img
                src={brand.logo}
                alt={`Logo ${brand.name}`}
                className="max-w-[120px] max-h-[60px] object-contain"
                loading="lazy"
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
```

## 9. Teste em Diferentes Resoluções

```bash
# Desktop (1920x1080)
# Tablet (768x1024)
# Mobile (375x667)
# Verifique se a animação funciona bem em todas as resoluções
```

## 10. Otimizações de Performance

```typescript
// src/app/components/TireMarquee.tsx

// Usar React.memo para evitar re-renders desnecessários
export const TireMarquee = React.memo(function TireMarquee() {
  // ... componente
});

// Lazy load do componente (opcional)
// src/app/pages/HomePage.tsx
import { lazy, Suspense } from 'react';

const TireMarquee = lazy(() => import('../components/TireMarquee').then(m => ({ default: m.TireMarquee })));

export function HomePage() {
  return (
    <div>
      <Suspense fallback={<div>Carregando marcas...</div>}>
        <TireMarquee />
      </Suspense>
    </div>
  );
}
```

## 11. Acessibilidade Melhorada

```tsx
export function TireMarquee() {
  return (
    <section 
      className="tire-marquee-section"
      aria-label="Marcas parceiras de pneus"
    >
      <div className="tire-marquee-container">
        <h2 className="tire-marquee-title">Marcas Parceiras</h2>
        <p className="tire-marquee-subtitle">
          As melhores marcas de pneus do mercado em um só lugar
        </p>
        
        <div 
          className="tire-marquee-wrapper"
          role="region"
          aria-live="polite"
        >
          <div className="tire-marquee" role="list">
            {TIRE_BRANDS.map((brand) => (
              <div 
                key={brand.name} 
                className="tire-marquee-item"
                role="listitem"
              >
                <img
                  src={brand.logo}
                  alt={`${brand.name} - Pneus de alta qualidade`}
                  className="tire-marquee-logo"
                  loading="lazy"
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
```

---

**Dicas Importantes**:
- Sempre teste em diferentes dispositivos
- Verifique licenças das imagens
- Comprima as imagens para melhor performance
- Use WebP quando possível (com fallback SVG)

**Data**: 11 de fevereiro de 2026
