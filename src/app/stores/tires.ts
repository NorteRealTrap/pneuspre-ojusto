import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Tire {
  id: string;
  brand: string;
  model: string;
  width: string; // ex: "225"
  profile: string; // ex: "45"
  diameter: string; // ex: "17"
  loadIndex: string; // ex: "91"
  speedRating: string; // ex: "W"
  price: number;
  oldPrice?: number;
  stock: number;
  image: string;
  features: string[];
  category: 'passeio' | 'suv' | 'caminhonete' | 'van' | 'moto';
  season: 'all-season' | 'summer' | 'winter';
  runflat: boolean;
  featured?: boolean;
  description?: string;
}

export interface TireFilters {
  width: string[];
  profile: string[];
  diameter: string[];
  brand: string[];
  category: string[];
  minPrice: number;
  maxPrice: number;
  runflat: boolean | null;
  season: string[];
}

interface TireStore {
  tires: Tire[];
  filteredTires: Tire[];
  filters: TireFilters;
  searchQuery: string;
  
  // Actions
  setTires: (tires: Tire[]) => void;
  addTire: (tire: Tire) => void;
  updateTire: (id: string, tire: Partial<Tire>) => void;
  deleteTire: (id: string) => void;
  setFilters: (filters: Partial<TireFilters>) => void;
  resetFilters: () => void;
  setSearchQuery: (query: string) => void;
  applyFilters: () => void;
  getTireById: (id: string) => Tire | undefined;
  getFeaturedTires: () => Tire[];
}

// Dados mock de pneus
const mockTires: Tire[] = [
  {
    id: '1',
    brand: 'Goodyear',
    model: 'Eagle F1 Asymmetric 5',
    width: '225',
    profile: '45',
    diameter: '17',
    loadIndex: '91',
    speedRating: 'W',
    price: 789.90,
    oldPrice: 899.90,
    stock: 15,
    image: 'https://images.unsplash.com/photo-1606937933187-6f42b29de806?w=400&h=400&fit=crop',
    features: ['Alta Performance', 'Aderência em curvas', 'Baixo ruído'],
    category: 'passeio',
    season: 'all-season',
    runflat: false,
    featured: true,
    description: 'Pneu de alta performance para carros esportivos e sedãs premium',
  },
  {
    id: '2',
    brand: 'Michelin',
    model: 'Primacy 4',
    width: '205',
    profile: '55',
    diameter: '16',
    loadIndex: '91',
    speedRating: 'V',
    price: 649.90,
    oldPrice: 749.90,
    stock: 25,
    image: 'https://images.unsplash.com/photo-1606937933187-6f42b29de806?w=400&h=400&fit=crop',
    features: ['Longa Durabilidade', 'Economia de Combustível', 'Segurança'],
    category: 'passeio',
    season: 'all-season',
    runflat: false,
    featured: true,
    description: 'Excelente equilíbrio entre conforto, durabilidade e segurança',
  },
  {
    id: '3',
    brand: 'Pirelli',
    model: 'Scorpion ATR',
    width: '265',
    profile: '70',
    diameter: '16',
    loadIndex: '112',
    speedRating: 'T',
    price: 899.90,
    stock: 12,
    image: 'https://images.unsplash.com/photo-1606937933187-6f42b29de806?w=400&h=400&fit=crop',
    features: ['On/Off Road', 'Alta Resistência', 'Aderência em Terra'],
    category: 'suv',
    season: 'all-season',
    runflat: false,
    featured: true,
    description: 'Ideal para SUVs e veículos off-road',
  },
  {
    id: '4',
    brand: 'Continental',
    model: 'ContiCrossContact UHP',
    width: '255',
    profile: '50',
    diameter: '19',
    loadIndex: '107',
    speedRating: 'Y',
    price: 1199.90,
    oldPrice: 1399.90,
    stock: 8,
    image: 'https://images.unsplash.com/photo-1606937933187-6f42b29de806?w=400&h=400&fit=crop',
    features: ['Ultra High Performance', 'SUV Esportivo', 'Estabilidade'],
    category: 'suv',
    season: 'summer',
    runflat: false,
    featured: true,
    description: 'Performance máxima para SUVs esportivos',
  },
  {
    id: '5',
    brand: 'Bridgestone',
    model: 'Turanza T005',
    width: '195',
    profile: '65',
    diameter: '15',
    loadIndex: '91',
    speedRating: 'H',
    price: 549.90,
    stock: 30,
    image: 'https://images.unsplash.com/photo-1606937933187-6f42b29de806?w=400&h=400&fit=crop',
    features: ['Conforto', 'Silencioso', 'Economia'],
    category: 'passeio',
    season: 'all-season',
    runflat: false,
    featured: true,
    description: 'Conforto e economia para o dia a dia',
  },
  {
    id: '6',
    brand: 'Goodyear',
    model: 'Wrangler HP',
    width: '235',
    profile: '60',
    diameter: '16',
    loadIndex: '100',
    speedRating: 'H',
    price: 729.90,
    stock: 18,
    image: 'https://images.unsplash.com/photo-1606937933187-6f42b29de806?w=400&h=400&fit=crop',
    features: ['SUV/Pickup', 'Durabilidade', 'Conforto'],
    category: 'caminhonete',
    season: 'all-season',
    runflat: false,
    featured: true,
    description: 'Robustez e durabilidade para caminhonetes',
  },
  {
    id: '7',
    brand: 'Michelin',
    model: 'Pilot Sport 4',
    width: '245',
    profile: '40',
    diameter: '18',
    loadIndex: '97',
    speedRating: 'Y',
    price: 1099.90,
    oldPrice: 1299.90,
    stock: 10,
    image: 'https://images.unsplash.com/photo-1606937933187-6f42b29de806?w=400&h=400&fit=crop',
    features: ['Esportivo', 'Alta Velocidade', 'Controle Preciso'],
    category: 'passeio',
    season: 'summer',
    runflat: false,
    featured: true,
    description: 'Para quem busca performance máxima',
  },
  {
    id: '8',
    brand: 'Pirelli',
    model: 'Cinturato P7',
    width: '215',
    profile: '50',
    diameter: '17',
    loadIndex: '95',
    speedRating: 'W',
    price: 699.90,
    stock: 20,
    image: 'https://images.unsplash.com/photo-1606937933187-6f42b29de806?w=400&h=400&fit=crop',
    features: ['Eco-friendly', 'Baixo Consumo', 'Segurança'],
    category: 'passeio',
    season: 'all-season',
    runflat: true,
    featured: true,
    description: 'Tecnologia verde com alto desempenho',
  },
  {
    id: '9',
    brand: 'Continental',
    model: 'VanContact 200',
    width: '215',
    profile: '65',
    diameter: '16',
    loadIndex: '109',
    speedRating: 'T',
    price: 679.90,
    stock: 14,
    image: 'https://images.unsplash.com/photo-1606937933187-6f42b29de806?w=400&h=400&fit=crop',
    features: ['Alta Carga', 'Durabilidade', 'Estabilidade'],
    category: 'van',
    season: 'all-season',
    runflat: false,
    featured: true,
    description: 'Especial para vans e veículos comerciais',
  },
  {
    id: '10',
    brand: 'Bridgestone',
    model: 'Dueler H/T 684',
    width: '265',
    profile: '65',
    diameter: '17',
    loadIndex: '112',
    speedRating: 'S',
    price: 849.90,
    stock: 16,
    image: 'https://images.unsplash.com/photo-1606937933187-6f42b29de806?w=400&h=400&fit=crop',
    features: ['SUV Highway', 'Conforto', 'Baixo Ruído'],
    category: 'suv',
    season: 'all-season',
    runflat: false,
    featured: true,
    description: 'Conforto e segurança para SUVs',
  },
];

const initialFilters: TireFilters = {
  width: [],
  profile: [],
  diameter: [],
  brand: [],
  category: [],
  minPrice: 0,
  maxPrice: 10000,
  runflat: null,
  season: [],
};

export const useTireStore = create<TireStore>()(
  persist(
    (set, get) => ({
      tires: mockTires,
      filteredTires: mockTires,
      filters: initialFilters,
      searchQuery: '',

      setTires: (tires) => {
        set({ tires, filteredTires: tires });
      },

      addTire: (tire) => {
        set((state) => {
          const newTires = [...state.tires, tire];
          return { tires: newTires, filteredTires: newTires };
        });
      },

      updateTire: (id, updatedTire) => {
        set((state) => {
          const newTires = state.tires.map((tire) =>
            tire.id === id ? { ...tire, ...updatedTire } : tire
          );
          return { tires: newTires };
        });
        get().applyFilters();
      },

      deleteTire: (id) => {
        set((state) => {
          const newTires = state.tires.filter((tire) => tire.id !== id);
          return { tires: newTires };
        });
        get().applyFilters();
      },

      setFilters: (newFilters) => {
        set((state) => ({
          filters: { ...state.filters, ...newFilters },
        }));
        get().applyFilters();
      },

      resetFilters: () => {
        set({ filters: initialFilters });
        get().applyFilters();
      },

      setSearchQuery: (query) => {
        set({ searchQuery: query });
        get().applyFilters();
      },

      applyFilters: () => {
        const { tires, filters, searchQuery } = get();
        
        let filtered = [...tires];

        // Filtro de busca por texto
        if (searchQuery) {
          const query = searchQuery.toLowerCase();
          filtered = filtered.filter(
            (tire) =>
              tire.brand.toLowerCase().includes(query) ||
              tire.model.toLowerCase().includes(query) ||
              `${tire.width}/${tire.profile}R${tire.diameter}`.includes(query)
          );
        }

        // Filtro por largura
        if (filters.width.length > 0) {
          filtered = filtered.filter((tire) => filters.width.includes(tire.width));
        }

        // Filtro por perfil
        if (filters.profile.length > 0) {
          filtered = filtered.filter((tire) => filters.profile.includes(tire.profile));
        }

        // Filtro por aro
        if (filters.diameter.length > 0) {
          filtered = filtered.filter((tire) => filters.diameter.includes(tire.diameter));
        }

        // Filtro por marca
        if (filters.brand.length > 0) {
          filtered = filtered.filter((tire) => filters.brand.includes(tire.brand));
        }

        // Filtro por categoria
        if (filters.category.length > 0) {
          filtered = filtered.filter((tire) => filters.category.includes(tire.category));
        }

        // Filtro por preço
        filtered = filtered.filter(
          (tire) => tire.price >= filters.minPrice && tire.price <= filters.maxPrice
        );

        // Filtro por runflat
        if (filters.runflat !== null) {
          filtered = filtered.filter((tire) => tire.runflat === filters.runflat);
        }

        // Filtro por temporada
        if (filters.season.length > 0) {
          filtered = filtered.filter((tire) => filters.season.includes(tire.season));
        }

        set({ filteredTires: filtered });
      },

      getTireById: (id) => {
        return get().tires.find((tire) => tire.id === id);
      },

      getFeaturedTires: () => {
        return get().tires.filter((tire) => tire.featured);
      },
    }),
    {
      name: 'tire-storage',
      partialize: (state) => ({
        tires: state.tires,
        filters: state.filters,
      }),
    }
  )
);
