import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface SiteConfig {
  // Informações da Loja
  storeName: string;
  storeSlogan: string;
  storeDescription: string;
  storeLogo: string;
  primaryFont: string;
  headingFont: string;
  contentWidth: 'boxed' | 'full';
  
  // Contato
  phone: string;
  email: string;
  address: string;
  whatsapp: string;
  
  // Redes Sociais
  facebook: string;
  instagram: string;
  
  // Cores do Site
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  darkBg: string;
  layoutStyle: 'classic' | 'split' | 'immersive';
  heroAlignment: 'left' | 'center';
  productCardStyle: 'solid' | 'glass' | 'outline';
  galleryLayout: 'grid' | 'masonry' | 'carousel';
  bannerOverlay: boolean;
  
  // Textos da Homepage
  heroTitle: string;
  heroSubtitle: string;
  heroDescription: string;
  heroBadge: string;
  galleryTitle: string;
  galleryDescription: string;
  
  // Imagens
  heroImage: string;
  bannerImage: string;
  
  // Features
  features: {
    icon: string;
    title: string;
    description: string;
  }[];
  
  // CTA
  ctaTitle: string;
  ctaDescription: string;
  ctaButtonText: string;
  ctaVariant: 'solid' | 'outline';
  
  // SEO
  metaTitle: string;
  metaDescription: string;
  metaKeywords: string;
  
  // Inteligência e automação
  smartRecommendations: boolean;
  autoFeatureLowStock: boolean;
  allowExternalImageLinks: boolean;
}

interface SiteConfigStore {
  config: SiteConfig;
  updateConfig: (updates: Partial<SiteConfig>) => void;
  resetConfig: () => void;
}

const defaultConfig: SiteConfig = {
  storeName: 'Pneus Preçojusto',
  storeSlogan: 'Especialistas em Pneus desde 2010',
  storeDescription: 'Qualidade, segurança e preços competitivos para todos os tipos de veículos.',
  storeLogo: '',
  primaryFont: 'Inter',
  headingFont: 'Inter',
  contentWidth: 'boxed',
  
  phone: '(11) 99999-9999',
  email: 'contato@pneusprecojusto.com.br',
  address: 'São Paulo, SP - Brasil',
  whatsapp: '5511999999999',
  
  facebook: '',
  instagram: '',
  
  primaryColor: '#FDB913',
  secondaryColor: '#00A651',
  accentColor: '#FFD700',
  darkBg: '#1a1a1a',
  layoutStyle: 'split',
  heroAlignment: 'left',
  productCardStyle: 'glass',
  galleryLayout: 'grid',
  bannerOverlay: true,
  
  heroTitle: 'Pneus com Preço Justo e Qualidade Garantida',
  heroSubtitle: 'Especialistas em Pneus desde 2010',
  heroDescription: 'Amplo catálogo de pneus das principais marcas do mercado. Especificações técnicas completas, preços competitivos e entrega em todo Brasil.',
  heroBadge: 'Especialistas em Pneus desde 2010',
  galleryTitle: 'Mais Vendidos',
  galleryDescription: 'Coleção dinâmica com grades, masonry ou carrossel.',
  
  heroImage: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800',
  bannerImage: '',
  
  features: [
    {
      icon: 'Shield',
      title: 'Certificação e Garantia',
      description: 'Produtos certificados INMETRO com garantia de fábrica. Procedência garantida e nota fiscal.',
    },
    {
      icon: 'Truck',
      title: 'Logística Nacional',
      description: 'Entrega para todo Brasil com rastreamento. Prazos competitivos e embalagem reforçada.',
    },
    {
      icon: 'CreditCard',
      title: 'Condições Especiais',
      description: 'Parcelamento em até 12x sem juros. Aceitamos cartão, PIX com desconto e boleto bancário.',
    },
    {
      icon: 'Award',
      title: 'Marcas Homologadas',
      description: 'Goodyear, Michelin, Pirelli, Continental, Bridgestone. Certificação internacional.',
    },
  ],
  
  ctaTitle: 'Encontre o Pneu Ideal para seu Veículo',
  ctaDescription: 'Catálogo completo com especificações técnicas detalhadas e preços competitivos',
  ctaButtonText: 'Acessar Catálogo Completo',
  ctaVariant: 'solid',
  
  metaTitle: 'Pneus Preçojusto | Encontre o Pneu Ideal',
  metaDescription: 'Especialistas em pneus desde 2010. Qualidade, segurança e preços competitivos para todos os tipos de veículos.',
  metaKeywords: 'pneus, pneus online, comprar pneus, goodyear, michelin, pirelli',
  
  smartRecommendations: true,
  autoFeatureLowStock: true,
  allowExternalImageLinks: true,
};

const FALLBACK_WHATSAPP = defaultConfig.whatsapp;
const PRECOJUSTO_BRAND_REGEX = /pneus\s*pre[cç]o\s*justo/i;

function digitsOnly(value: string) {
  return value.replace(/\D/g, '');
}

function normalizeBrandText(value: string) {
  return value
    .replace(/Pneus\.PreçoJusto/gi, 'Pneus Preçojusto')
    .replace(/Pneus\.PrecoJusto/gi, 'Pneus Preçojusto')
    .replace(/Pneus PreçoJusto/gi, 'Pneus Preçojusto')
    .replace(/Pneus PrecoJusto/gi, 'Pneus Preçojusto');
}

function sanitizeConfig(config: SiteConfig): SiteConfig {
  const whatsappDigits = digitsOnly(config.whatsapp || '');
  const phoneDigits = digitsOnly(config.phone || '');
  const normalizedStoreName = normalizeBrandText(config.storeName || '');
  const keepCurrentBrandData = PRECOJUSTO_BRAND_REGEX.test(normalizedStoreName);

  return {
    ...config,
    storeName: keepCurrentBrandData ? normalizedStoreName : defaultConfig.storeName,
    storeSlogan: keepCurrentBrandData ? config.storeSlogan : defaultConfig.storeSlogan,
    storeDescription: keepCurrentBrandData ? config.storeDescription : defaultConfig.storeDescription,
    phone: phoneDigits ? config.phone : defaultConfig.phone,
    email: keepCurrentBrandData ? config.email : defaultConfig.email,
    address: keepCurrentBrandData ? config.address : defaultConfig.address,
    whatsapp: whatsappDigits || FALLBACK_WHATSAPP,
    metaTitle: normalizeBrandText(config.metaTitle || defaultConfig.metaTitle),
  };
}

export const useSiteConfigStore = create<SiteConfigStore>()(
  persist(
    (set) => ({
      config: sanitizeConfig(defaultConfig),
      
      updateConfig: (updates) => {
        set((state) => ({
          config: sanitizeConfig({ ...state.config, ...updates }),
        }));
      },
      
      resetConfig: () => {
        set({ config: sanitizeConfig(defaultConfig) });
      },
    }),
    {
      name: 'site-config-storage',
      merge: (persistedState, currentState) => {
        const persisted = (persistedState as Partial<SiteConfigStore> | undefined) ?? {};
        const mergedConfig = sanitizeConfig({
          ...currentState.config,
          ...(persisted.config ?? {}),
        });

        return {
          ...currentState,
          ...persisted,
          config: mergedConfig,
        };
      },
    }
  )
);
