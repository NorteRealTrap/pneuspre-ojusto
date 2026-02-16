import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { siteConfigService } from '../../services/supabase';
import { sanitizeImageUrl } from '../utils/urlSafety';

export interface SiteConfig {
  // Informacoes da loja
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

  // Redes sociais
  facebook: string;
  instagram: string;

  // Cores e layout
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  darkBg: string;
  layoutStyle: 'classic' | 'split' | 'immersive';
  heroAlignment: 'left' | 'center';
  productCardStyle: 'solid' | 'glass' | 'outline';
  galleryLayout: 'grid' | 'masonry' | 'carousel';
  bannerOverlay: boolean;

  // Homepage
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

  // Inteligencia
  smartRecommendations: boolean;
  autoFeatureLowStock: boolean;
  allowExternalImageLinks: boolean;
  autoMergeShowcaseSections: boolean;
  topSellerProductIds: string[];
  highlightProductIds: string[];

  // Linha de base para calculos de producao
  revenueBaselineAt: string | null;
}

type ConfigSyncStatus = 'idle' | 'saving' | 'error';

interface SiteConfigStore {
  config: SiteConfig;
  isLoadingRemote: boolean;
  syncStatus: ConfigSyncStatus;
  lastSyncError: string | null;
  updateConfig: (updates: Partial<SiteConfig>) => void;
  resetConfig: () => void;
  loadConfig: () => Promise<void>;
  saveConfig: () => Promise<void>;
}

const envStoreName = String(import.meta.env.VITE_STORE_NAME || '').trim();
const envStorePhone = String(import.meta.env.VITE_STORE_PHONE || '').trim();
const envStoreEmail = String(import.meta.env.VITE_STORE_EMAIL || '').trim();
const envWhatsapp = String(import.meta.env.VITE_WHATSAPP_NUMBER || '')
  .trim()
  .replace(/\D/g, '');
const envFacebook = String(import.meta.env.VITE_FACEBOOK_PAGE || '').trim();
const envInstagram = String(import.meta.env.VITE_INSTAGRAM_HANDLE || '').trim();

const defaultConfig: SiteConfig = {
  storeName: envStoreName || 'Pneus PrecoJusto',
  storeSlogan: 'Pneus com garantia e entrega rapida',
  storeDescription:
    'Compre pneus das melhores marcas, modelos e medidas com condicoes especiais e atendimento especialista.',
  storeLogo: '',
  primaryFont: 'Nunito',
  headingFont: 'Nunito',
  contentWidth: 'boxed',

  phone: envStorePhone || '(11) 99999-9999',
  email: envStoreEmail || 'contato@pneusprecojusto.com.br',
  address: 'Atendimento nacional - Brasil',
  whatsapp: envWhatsapp || '5511999999999',

  facebook: envFacebook || 'https://www.facebook.com',
  instagram: envInstagram || 'https://www.instagram.com',

  primaryColor: '#009933',
  secondaryColor: '#1e1e1e',
  accentColor: '#ffe500',
  darkBg: '#1e1e1e',
  layoutStyle: 'immersive',
  heroAlignment: 'left',
  productCardStyle: 'outline',
  galleryLayout: 'grid',
  bannerOverlay: true,

  heroTitle: 'Compre Pneus das Melhores Marcas com Garantia',
  heroSubtitle: 'Pneus de qualidade com entrega nacional',
  heroDescription:
    'Pneus para carro, SUV, caminhonete, moto, caminhao e linha agricola. Condicoes especiais em PIX e cartao.',
  heroBadge: 'Entrega garantida para todo Brasil',
  galleryTitle: 'Produtos em Destaque',
  galleryDescription: 'Selecao especial de pneus para cada tipo de veiculo.',

  heroImage: '',
  bannerImage: '',

  features: [
    {
      icon: 'Shield',
      title: 'Compra Segura',
      description: 'Pagamento em ambiente protegido, politicas claras e acompanhamento do pedido.',
    },
    {
      icon: 'Truck',
      title: 'Entrega Garantida',
      description: 'Envio com rastreamento e operacao logistica para todo o Brasil.',
    },
    {
      icon: 'CreditCard',
      title: 'Pagamento Facilitado',
      description: 'PIX, boleto e cartao em ate 12x sem juros conforme campanha vigente.',
    },
    {
      icon: 'Award',
      title: 'Marcas Consolidadas',
      description: 'Michelin, Pirelli, Continental, Bridgestone e outras marcas reconhecidas.',
    },
  ],

  ctaTitle: 'Encontre o Pneu Ideal para seu Veiculo',
  ctaDescription: 'Catalogo completo com especificacoes por medida, marca e aplicacao.',
  ctaButtonText: 'Acessar Catalogo Completo',
  ctaVariant: 'solid',

  metaTitle: 'Pneus PrecoJusto | Pneus para carro, SUV, moto e linha pesada',
  metaDescription:
    'Compre pneus das melhores marcas com garantia, pagamento facilitado e entrega rapida para todo o Brasil.',
  metaKeywords:
    'pneus, pneus precojusto, pneu para moto, pneu para carro, pneus michelin, pneus pirelli, pneus continental',

  smartRecommendations: true,
  autoFeatureLowStock: true,
  allowExternalImageLinks: true,
  autoMergeShowcaseSections: true,
  topSellerProductIds: [],
  highlightProductIds: [],
  revenueBaselineAt: null,
};

let configSyncTimer: ReturnType<typeof setTimeout> | null = null;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function sanitizeString(value: unknown, fallback: string): string {
  return typeof value === 'string' ? value : fallback;
}

function sanitizeIsoDatetime(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const normalized = value.trim();
  if (!normalized) return null;

  const timestamp = Date.parse(normalized);
  if (Number.isNaN(timestamp)) return null;

  return new Date(timestamp).toISOString();
}

function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const result: string[] = [];
  const seen = new Set<string>();

  for (const item of value) {
    const text = String(item ?? '').trim();
    if (!text || seen.has(text)) continue;
    seen.add(text);
    result.push(text);
  }

  return result;
}

function sanitizeFeature(value: unknown): { icon: string; title: string; description: string } {
  if (!isPlainObject(value)) {
    return { icon: 'Star', title: '', description: '' };
  }

  return {
    icon: sanitizeString(value.icon, 'Star'),
    title: sanitizeString(value.title, ''),
    description: sanitizeString(value.description, ''),
  };
}

function sanitizeSiteConfig(raw: unknown): SiteConfig {
  if (!isPlainObject(raw)) return defaultConfig;

  const rawConfig = raw as Partial<SiteConfig>;

  const features = Array.isArray(rawConfig.features)
    ? rawConfig.features.map((item) => sanitizeFeature(item))
    : defaultConfig.features;

  const layoutStyle =
    rawConfig.layoutStyle === 'classic' ||
    rawConfig.layoutStyle === 'split' ||
    rawConfig.layoutStyle === 'immersive'
      ? rawConfig.layoutStyle
      : defaultConfig.layoutStyle;

  const heroAlignment = rawConfig.heroAlignment === 'center' ? 'center' : 'left';

  const productCardStyle =
    rawConfig.productCardStyle === 'solid' ||
    rawConfig.productCardStyle === 'glass' ||
    rawConfig.productCardStyle === 'outline'
      ? rawConfig.productCardStyle
      : defaultConfig.productCardStyle;

  const galleryLayout =
    rawConfig.galleryLayout === 'grid' ||
    rawConfig.galleryLayout === 'masonry' ||
    rawConfig.galleryLayout === 'carousel'
      ? rawConfig.galleryLayout
      : defaultConfig.galleryLayout;

  const ctaVariant = rawConfig.ctaVariant === 'outline' ? 'outline' : 'solid';
  const contentWidth = rawConfig.contentWidth === 'full' ? 'full' : 'boxed';

  return {
    ...defaultConfig,
    ...rawConfig,
    contentWidth,
    layoutStyle,
    heroAlignment,
    productCardStyle,
    galleryLayout,
    ctaVariant,
    storeName: sanitizeString(rawConfig.storeName, defaultConfig.storeName),
    storeSlogan: sanitizeString(rawConfig.storeSlogan, defaultConfig.storeSlogan),
    storeDescription: sanitizeString(rawConfig.storeDescription, defaultConfig.storeDescription),
    storeLogo: sanitizeString(rawConfig.storeLogo, defaultConfig.storeLogo),
    primaryFont: sanitizeString(rawConfig.primaryFont, defaultConfig.primaryFont),
    headingFont: sanitizeString(rawConfig.headingFont, defaultConfig.headingFont),
    phone: sanitizeString(rawConfig.phone, defaultConfig.phone),
    email: sanitizeString(rawConfig.email, defaultConfig.email),
    address: sanitizeString(rawConfig.address, defaultConfig.address),
    whatsapp: sanitizeString(rawConfig.whatsapp, defaultConfig.whatsapp),
    facebook: sanitizeString(rawConfig.facebook, defaultConfig.facebook),
    instagram: sanitizeString(rawConfig.instagram, defaultConfig.instagram),
    primaryColor: sanitizeString(rawConfig.primaryColor, defaultConfig.primaryColor),
    secondaryColor: sanitizeString(rawConfig.secondaryColor, defaultConfig.secondaryColor),
    accentColor: sanitizeString(rawConfig.accentColor, defaultConfig.accentColor),
    darkBg: sanitizeString(rawConfig.darkBg, defaultConfig.darkBg),
    heroTitle: sanitizeString(rawConfig.heroTitle, defaultConfig.heroTitle),
    heroSubtitle: sanitizeString(rawConfig.heroSubtitle, defaultConfig.heroSubtitle),
    heroDescription: sanitizeString(rawConfig.heroDescription, defaultConfig.heroDescription),
    heroBadge: sanitizeString(rawConfig.heroBadge, defaultConfig.heroBadge),
    galleryTitle: sanitizeString(rawConfig.galleryTitle, defaultConfig.galleryTitle),
    galleryDescription: sanitizeString(rawConfig.galleryDescription, defaultConfig.galleryDescription),
    heroImage: sanitizeImageUrl(sanitizeString(rawConfig.heroImage, defaultConfig.heroImage)),
    bannerImage: sanitizeImageUrl(sanitizeString(rawConfig.bannerImage, defaultConfig.bannerImage)),
    ctaTitle: sanitizeString(rawConfig.ctaTitle, defaultConfig.ctaTitle),
    ctaDescription: sanitizeString(rawConfig.ctaDescription, defaultConfig.ctaDescription),
    ctaButtonText: sanitizeString(rawConfig.ctaButtonText, defaultConfig.ctaButtonText),
    metaTitle: sanitizeString(rawConfig.metaTitle, defaultConfig.metaTitle),
    metaDescription: sanitizeString(rawConfig.metaDescription, defaultConfig.metaDescription),
    metaKeywords: sanitizeString(rawConfig.metaKeywords, defaultConfig.metaKeywords),
    bannerOverlay:
      typeof rawConfig.bannerOverlay === 'boolean' ? rawConfig.bannerOverlay : defaultConfig.bannerOverlay,
    smartRecommendations:
      typeof rawConfig.smartRecommendations === 'boolean'
        ? rawConfig.smartRecommendations
        : defaultConfig.smartRecommendations,
    autoFeatureLowStock:
      typeof rawConfig.autoFeatureLowStock === 'boolean'
        ? rawConfig.autoFeatureLowStock
        : defaultConfig.autoFeatureLowStock,
    allowExternalImageLinks:
      typeof rawConfig.allowExternalImageLinks === 'boolean'
        ? rawConfig.allowExternalImageLinks
        : defaultConfig.allowExternalImageLinks,
    autoMergeShowcaseSections:
      typeof rawConfig.autoMergeShowcaseSections === 'boolean'
        ? rawConfig.autoMergeShowcaseSections
        : defaultConfig.autoMergeShowcaseSections,
    topSellerProductIds: normalizeStringArray(rawConfig.topSellerProductIds),
    highlightProductIds: normalizeStringArray(rawConfig.highlightProductIds),
    revenueBaselineAt: sanitizeIsoDatetime(rawConfig.revenueBaselineAt),
    features,
  };
}

function isMissingSiteConfigTableError(error: any): boolean {
  const code = String(error?.code || '');
  if (code === '42P01' || code === 'PGRST205') return true;

  const message = String(error?.message || '').toLowerCase();
  return message.includes('site_config') && message.includes('does not exist');
}

export const useSiteConfigStore = create<SiteConfigStore>()(
  persist(
    (set, get) => {
      const scheduleSave = () => {
        if (configSyncTimer) {
          clearTimeout(configSyncTimer);
        }

        configSyncTimer = setTimeout(() => {
          void get().saveConfig();
        }, 650);
      };

      return {
        config: defaultConfig,
        isLoadingRemote: false,
        syncStatus: 'idle',
        lastSyncError: null,

        updateConfig: (updates) => {
          set((state) => ({
            config: sanitizeSiteConfig({ ...state.config, ...updates }),
          }));
          scheduleSave();
        },

        resetConfig: () => {
          set({ config: defaultConfig });
          scheduleSave();
        },

        loadConfig: async () => {
          set({ isLoadingRemote: true });

          const { data, error } = await siteConfigService.get();
          if (error) {
            if (isMissingSiteConfigTableError(error)) {
              set({
                syncStatus: 'error',
                lastSyncError:
                  'Tabela public.site_config ausente. Aplique a migration 20260212_ensure_site_config_table.sql.',
              });
            } else {
              set({
                syncStatus: 'error',
                lastSyncError: String(error.message || 'Falha ao carregar configuracoes do banco.'),
              });
            }
            set({ isLoadingRemote: false });
            return;
          }

          if (data?.config_json) {
            set({
              config: sanitizeSiteConfig(data.config_json),
              syncStatus: 'idle',
              lastSyncError: null,
              isLoadingRemote: false,
            });
            return;
          }

          set({
            syncStatus: 'idle',
            lastSyncError: null,
            isLoadingRemote: false,
          });
        },

        saveConfig: async () => {
          const config = sanitizeSiteConfig(get().config);
          set({ syncStatus: 'saving', lastSyncError: null });

          const { data, error } = await siteConfigService.upsert(config as unknown as Record<string, unknown>);
          if (error) {
            if (isMissingSiteConfigTableError(error)) {
              set({
                syncStatus: 'error',
                lastSyncError:
                  'Tabela public.site_config ausente. Aplique a migration 20260212_ensure_site_config_table.sql.',
              });
              return;
            }

            set({
              syncStatus: 'error',
              lastSyncError: String(error.message || 'Falha ao salvar configuracoes no banco.'),
            });
            return;
          }

          if (!data?.id) {
            set({
              syncStatus: 'error',
              lastSyncError:
                'Persistencia incompleta em site_config. Nenhum registro atualizado no banco.',
            });
            return;
          }

          set({ syncStatus: 'idle', lastSyncError: null });
        },
      };
    },
    {
      name: 'site-config-storage-v2',
    }
  )
);
