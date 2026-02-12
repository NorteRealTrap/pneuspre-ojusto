import { create } from 'zustand';
import { productsService } from '../../services/supabase';

export interface Product {
  id: string;
  brand: string;
  model: string;
  width: string;
  profile: string;
  diameter: string;
  load_index: string;
  speed_rating: string;
  price: number;
  old_price?: number;
  stock: number;
  image: string;
  features: string[];
  category: string;
  season: string;
  runflat: boolean;
  featured: boolean;
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface ProductFilters {
  width: string[];
  profile: string[];
  diameter: string[];
  brand: string[];
  category: string[];
  season: string[];
  minPrice: number;
  maxPrice: number;
  runflat: boolean | null;
  featured: boolean | null;
  search: string;
}

export type ProductInput = Omit<Product, 'id' | 'created_at' | 'updated_at'>;

interface ProductsState {
  products: Product[];
  filteredProducts: Product[];
  loading: boolean;
  initialized: boolean;
  error: string | null;
  filters: ProductFilters;
  setProducts: (products: Product[]) => void;
  setLoading: (loading: boolean) => void;
  setFilters: (filters: Partial<ProductFilters>) => void;
  resetFilters: () => void;
  setSearchQuery: (query: string) => void;
  fetchProducts: (force?: boolean) => Promise<void>;
  refreshProducts: () => Promise<void>;
  fetchProductById: (id: string) => Promise<Product | null>;
  createProduct: (product: ProductInput) => Promise<Product | null>;
  updateProduct: (id: string, product: Partial<ProductInput>) => Promise<Product | null>;
  deleteProduct: (id: string) => Promise<boolean>;
  getFeaturedProducts: (limit?: number) => Product[];
  applyFilters: () => void;
}

const initialFilters: ProductFilters = {
  width: [],
  profile: [],
  diameter: [],
  brand: [],
  category: [],
  season: [],
  minPrice: 0,
  maxPrice: 100000,
  runflat: null,
  featured: null,
  search: '',
};

const categoryAliases: Record<string, string> = {
  passeio: 'passeio',
  automovel: 'passeio',
  automoveis: 'passeio',
  suv: 'suv',
  'suv e 4x4': 'suv',
  caminhonete: 'caminhonete',
  caminhonetes: 'caminhonete',
  van: 'van',
  vans: 'van',
  utilitario: 'van',
  utilitarios: 'van',
  moto: 'moto',
  motos: 'moto',
};

const seasonAliases: Record<string, string> = {
  'all season': 'all-season',
  'all-season': 'all-season',
  allseason: 'all-season',
  verao: 'summer',
  summer: 'summer',
  inverno: 'winter',
  winter: 'winter',
};

function normalizeText(value: unknown) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function normalizeCategory(value: unknown) {
  const normalized = normalizeText(value);
  return categoryAliases[normalized] ?? normalized;
}

function normalizeSeason(value: unknown) {
  const normalized = normalizeText(value);
  return seasonAliases[normalized] ?? normalized;
}

function normalizeStringArray(values: unknown, mapper: (value: string) => string = (value) => value) {
  if (!Array.isArray(values)) {
    return [];
  }

  const result: string[] = [];
  const seen = new Set<string>();

  for (const item of values) {
    const text = mapper(String(item ?? '').trim());
    if (!text) continue;

    const key = normalizeText(text);
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(text);
  }

  return result;
}

function normalizeProduct(raw: Product): Product {
  const normalizedCategory = normalizeCategory(raw.category);
  const normalizedSeason = normalizeSeason(raw.season);

  return {
    ...raw,
    brand: String(raw.brand ?? '').trim(),
    model: String(raw.model ?? '').trim(),
    width: String(raw.width ?? '').trim(),
    profile: String(raw.profile ?? '').trim(),
    diameter: String(raw.diameter ?? '').trim(),
    load_index: String(raw.load_index ?? '').trim(),
    speed_rating: String(raw.speed_rating ?? '').trim(),
    price: Number(raw.price) || 0,
    old_price: raw.old_price ? Number(raw.old_price) : undefined,
    stock: Number(raw.stock) || 0,
    image:
      String(raw.image ?? '').trim() ||
      'https://images.unsplash.com/photo-1606937933187-6f42b29de806?w=400&h=400&fit=crop',
    features: normalizeStringArray(raw.features, (value) => value.trim()),
    category: normalizedCategory,
    season: normalizedSeason,
    runflat: Boolean(raw.runflat),
    featured: Boolean(raw.featured),
    description: String(raw.description ?? '').trim(),
    created_at: raw.created_at,
    updated_at: raw.updated_at,
  };
}

function normalizeProductInput(payload: Partial<ProductInput>) {
  const normalized: Partial<ProductInput> = { ...payload };

  if (payload.brand !== undefined) normalized.brand = String(payload.brand).trim();
  if (payload.model !== undefined) normalized.model = String(payload.model).trim();
  if (payload.width !== undefined) normalized.width = String(payload.width).trim();
  if (payload.profile !== undefined) normalized.profile = String(payload.profile).trim();
  if (payload.diameter !== undefined) normalized.diameter = String(payload.diameter).trim();
  if (payload.load_index !== undefined) normalized.load_index = String(payload.load_index).trim();
  if (payload.speed_rating !== undefined) normalized.speed_rating = String(payload.speed_rating).trim();
  if (payload.image !== undefined) normalized.image = String(payload.image).trim();
  if (payload.description !== undefined) normalized.description = String(payload.description).trim();
  if (payload.price !== undefined) normalized.price = Number(payload.price);
  if (payload.old_price !== undefined) {
    const parsed = Number(payload.old_price);
    normalized.old_price = Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
  }
  if (payload.stock !== undefined) normalized.stock = Math.max(0, Number(payload.stock) || 0);
  if (payload.category !== undefined) normalized.category = normalizeCategory(payload.category);
  if (payload.season !== undefined) normalized.season = normalizeSeason(payload.season);
  if (payload.features !== undefined) {
    normalized.features = normalizeStringArray(payload.features, (value) => value.trim());
  }

  return normalized;
}

function normalizeFilters(current: ProductFilters, changes: Partial<ProductFilters>): ProductFilters {
  const merged = { ...current, ...changes };

  return {
    ...merged,
    width: normalizeStringArray(merged.width, (value) => value.trim()),
    profile: normalizeStringArray(merged.profile, (value) => value.trim()),
    diameter: normalizeStringArray(merged.diameter, (value) => value.trim()),
    brand: normalizeStringArray(merged.brand, (value) => value.trim()),
    category: normalizeStringArray(merged.category, (value) => normalizeCategory(value)),
    season: normalizeStringArray(merged.season, (value) => normalizeSeason(value)),
    search: String(merged.search ?? '').trim(),
    minPrice: Number(merged.minPrice) || 0,
    maxPrice: Number(merged.maxPrice) || 100000,
  };
}

function applyProductFilters(products: Product[], filters: ProductFilters) {
  let filtered = [...products];

  if (filters.search) {
    const query = normalizeText(filters.search);
    filtered = filtered.filter((product) => {
      const size = `${product.width}/${product.profile}r${product.diameter}`;
      return (
        normalizeText(product.brand).includes(query) ||
        normalizeText(product.model).includes(query) ||
        normalizeText(size).includes(query)
      );
    });
  }

  if (filters.width.length > 0) {
    filtered = filtered.filter((product) => filters.width.includes(product.width));
  }

  if (filters.profile.length > 0) {
    filtered = filtered.filter((product) => filters.profile.includes(product.profile));
  }

  if (filters.diameter.length > 0) {
    filtered = filtered.filter((product) => filters.diameter.includes(product.diameter));
  }

  if (filters.brand.length > 0) {
    const normalizedBrands = filters.brand.map((brand) => normalizeText(brand));
    filtered = filtered.filter((product) => normalizedBrands.includes(normalizeText(product.brand)));
  }

  if (filters.category.length > 0) {
    const normalizedCategories = filters.category.map((category) => normalizeCategory(category));
    filtered = filtered.filter((product) => normalizedCategories.includes(product.category));
  }

  if (filters.season.length > 0) {
    const normalizedSeasons = filters.season.map((season) => normalizeSeason(season));
    filtered = filtered.filter((product) => normalizedSeasons.includes(product.season));
  }

  filtered = filtered.filter(
    (product) => product.price >= filters.minPrice && product.price <= filters.maxPrice
  );

  if (filters.runflat !== null) {
    filtered = filtered.filter((product) => product.runflat === filters.runflat);
  }

  if (filters.featured !== null) {
    filtered = filtered.filter((product) => product.featured === filters.featured);
  }

  return filtered;
}

export const useProductsStore = create<ProductsState>((set, get) => ({
  products: [],
  filteredProducts: [],
  loading: false,
  initialized: false,
  error: null,
  filters: initialFilters,

  setProducts: (products) =>
    set((state) => {
      const normalizedProducts = products.map(normalizeProduct);
      return {
        products: normalizedProducts,
        filteredProducts: applyProductFilters(normalizedProducts, state.filters),
        initialized: true,
        error: null,
      };
    }),

  setLoading: (loading) => set({ loading }),

  setFilters: (filters) =>
    set((state) => {
      const nextFilters = normalizeFilters(state.filters, filters);
      return {
        filters: nextFilters,
        filteredProducts: applyProductFilters(state.products, nextFilters),
      };
    }),

  resetFilters: () =>
    set((state) => ({
      filters: initialFilters,
      filteredProducts: applyProductFilters(state.products, initialFilters),
    })),

  setSearchQuery: (query) =>
    set((state) => {
      const nextFilters = normalizeFilters(state.filters, { search: query });
      return {
        filters: nextFilters,
        filteredProducts: applyProductFilters(state.products, nextFilters),
      };
    }),

  fetchProducts: async (force = false) => {
    const { loading } = get();
    if (!force && loading) {
      return;
    }

    set({ loading: true });
    try {
      const { data, error } = await productsService.getAll();
      if (error) throw error;

      const nextProducts = (data || []).map(normalizeProduct);
      set((state) => ({
        products: nextProducts,
        filteredProducts: applyProductFilters(nextProducts, state.filters),
        loading: false,
        initialized: true,
        error: null,
      }));
    } catch (error) {
      console.error('Erro ao buscar produtos:', error);
      set({
        loading: false,
        initialized: false,
        error: 'Nao foi possivel carregar os produtos.',
      });
    }
  },

  refreshProducts: async () => {
    await get().fetchProducts(true);
  },

  fetchProductById: async (id) => {
    const existing = get().products.find((product) => product.id === id);
    if (existing) return existing;

    const { data, error } = await productsService.getById(id);
    if (error || !data) {
      return null;
    }

    const normalizedProduct = normalizeProduct(data);
    set((state) => {
      const alreadyExists = state.products.some((product) => product.id === normalizedProduct.id);
      const nextProducts = alreadyExists
        ? state.products.map((product) => (product.id === normalizedProduct.id ? normalizedProduct : product))
        : [...state.products, normalizedProduct];

      return {
        products: nextProducts,
        filteredProducts: applyProductFilters(nextProducts, state.filters),
      };
    });

    return normalizedProduct;
  },

  createProduct: async (product) => {
    set({ loading: true });
    const payload = normalizeProductInput(product) as ProductInput;
    const { data, error } = await productsService.create(payload);
    if (error || !data) {
      set({ loading: false, error: 'Nao foi possivel criar o produto.' });
      return null;
    }

    const createdProduct = normalizeProduct(data);
    set((state) => {
      const nextProducts = [createdProduct, ...state.products];
      return {
        products: nextProducts,
        filteredProducts: applyProductFilters(nextProducts, state.filters),
        loading: false,
        error: null,
      };
    });

    return createdProduct;
  },

  updateProduct: async (id, product) => {
    set({ loading: true });
    const payload = normalizeProductInput(product);
    const { data, error } = await productsService.update(id, payload);
    if (error || !data) {
      set({ loading: false, error: 'Nao foi possivel atualizar o produto.' });
      return null;
    }

    const updatedProduct = normalizeProduct(data);
    set((state) => {
      const nextProducts = state.products.map((existing) =>
        existing.id === id ? updatedProduct : existing
      );
      return {
        products: nextProducts,
        filteredProducts: applyProductFilters(nextProducts, state.filters),
        loading: false,
        error: null,
      };
    });

    return updatedProduct;
  },

  deleteProduct: async (id) => {
    set({ loading: true });
    const { error } = await productsService.delete(id);
    if (error) {
      set({ loading: false, error: 'Nao foi possivel remover o produto.' });
      return false;
    }

    set((state) => {
      const nextProducts = state.products.filter((product) => product.id !== id);
      return {
        products: nextProducts,
        filteredProducts: applyProductFilters(nextProducts, state.filters),
        loading: false,
        error: null,
      };
    });

    return true;
  },

  getFeaturedProducts: (limit = 4) => {
    const allProducts = get().products;
    const featured = allProducts.filter((product) => product.featured);
    if (featured.length > 0) {
      return featured.slice(0, limit);
    }

    return allProducts.slice(0, limit);
  },

  applyFilters: () => {
    set((state) => ({
      filteredProducts: applyProductFilters(state.products, state.filters),
    }));
  },
}));
