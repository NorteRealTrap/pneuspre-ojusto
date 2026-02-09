// Tipos para o projeto Pneus.PreçoJusto

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

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface Order {
  id: string;
  user_id: string;
  total: number;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  payment_method: 'credit_card' | 'pix' | 'boleto';
  payment_id?: string;
  shipping_address: ShippingAddress;
  created_at: string;
  updated_at: string;
  order_items?: OrderItem[];
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  quantity: number;
  price: number;
  created_at: string;
  products?: Product;
}

export interface ShippingAddress {
  street: string;
  number: string;
  complement?: string;
  city: string;
  state: string;
  zipcode: string;
}

export interface UserProfile {
  id: string;
  name: string;
  cpf: string;
  phone: string;
  role: 'client' | 'admin';
  address?: ShippingAddress;
  created_at: string;
  updated_at: string;
}

export interface PaymentData {
  method: 'credit_card' | 'pix' | 'boleto';
  amount: number;
  orderId: string;
  description: string;
}

export interface CreditCardData {
  number: string;
  holder: string;
  expiry: string;
  cvv: string;
  installments: number;
}

export interface ApiResponse<T> {
  data?: T;
  error?: {
    message: string;
    code?: string;
  };
}
