import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Configure VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no arquivo .env');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// ============================================
// AUTENTICAÇÃO
// ============================================
export const authService = {
  signUp: async (email: string, password: string, metadata: any, redirectTo?: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: metadata,
        emailRedirectTo: redirectTo,
      }
    });
    return { data, error };
  },

  signIn: async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    return { data, error };
  },

  signOut: async () => {
    const { error } = await supabase.auth.signOut();
    return { error };
  },

  resetPassword: async (email: string, redirectTo?: string) => {
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo,
    });
    return { data, error };
  },

  verifyRecoveryToken: async (tokenHash: string) => {
    const { data, error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: 'recovery',
    });
    return { data, error };
  },

  updatePassword: async (password: string) => {
    const { data, error } = await supabase.auth.updateUser({ password });
    return { data, error };
  },

  resendConfirmation: async (email: string) => {
    const { data, error } = await supabase.auth.resend({
      type: 'signup',
      email
    });
    return { data, error };
  },

  getCurrentUser: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    return user;
  },

  getSession: async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return session;
  },

  onAuthStateChange: (callback: any) => {
    return supabase.auth.onAuthStateChange(callback);
  }
};

// ============================================
// PRODUTOS
// ============================================
export const productsService = {
  getAll: async (filters?: any) => {
    let query = supabase.from('products').select('*');

    if (filters?.category) {
      if (Array.isArray(filters.category)) query = query.in('category', filters.category);
      else query = query.eq('category', filters.category);
    }

    if (filters?.brand) {
      if (Array.isArray(filters.brand)) query = query.in('brand', filters.brand);
      else query = query.eq('brand', filters.brand);
    }

    if (typeof filters?.featured === 'boolean') {
      query = query.eq('featured', filters.featured);
    }
    
    const { data, error } = await query.order('created_at', { ascending: false });
    return { data, error };
  },

  getById: async (id: string) => {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('id', id)
      .single();
    return { data, error };
  },

  create: async (product: any) => {
    const { data, error } = await supabase
      .from('products')
      .insert([product])
      .select()
      .single();
    return { data, error };
  },

  update: async (id: string, product: any) => {
    const { data, error } = await supabase
      .from('products')
      .update(product)
      .eq('id', id)
      .select()
      .single();
    return { data, error };
  },

  delete: async (id: string) => {
    const { error } = await supabase
      .from('products')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id);
    return { error };
  }
};

// ============================================
// PEDIDOS
// ============================================
export const ordersService = {
  create: async (orderData: any) => {
    const user = await authService.getCurrentUser();
    if (!user) {
      return { data: null, error: { message: 'Usuario nao autenticado' } };
    }

    if (!orderData?.items || orderData.items.length === 0) {
      return { data: null, error: { message: 'Pedido sem itens' } };
    }

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert([{
        user_id: user.id,
        total: orderData.total,
        payment_method: orderData.payment_method,
        shipping_address: orderData.shipping_address,
        status: 'pending'
      }])
      .select()
      .single();

    if (orderError) return { data: null, error: orderError };

    // Criar itens do pedido
    const orderItems = orderData.items.map((item: any) => ({
      order_id: order.id,
      product_id: item.product_id,
      quantity: item.quantity,
      price: item.price
    }));

    const { error: itemsError } = await supabase
      .from('order_items')
      .insert(orderItems);

    if (itemsError) {
      await supabase.from('orders').delete().eq('id', order.id);
      return { data: null, error: itemsError };
    }

    return { data: order, error: null };
  },

  getMyOrders: async () => {
    const user = await authService.getCurrentUser();
    if (!user) {
      return { data: [], error: { message: 'Usuario nao autenticado' } };
    }
    
    const { data, error } = await supabase
      .from('orders')
      .select(`
        *,
        order_items (
          *,
          products (*)
        )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    return { data, error };
  },

  getById: async (id: string) => {
    const { data, error } = await supabase
      .from('orders')
      .select(`
        *,
        order_items (
          *,
          products (*)
        )
      `)
      .eq('id', id)
      .single();

    return { data, error };
  },

  updateStatus: async (id: string, status: string) => {
    const { data, error } = await supabase
      .from('orders')
      .update({ status })
      .eq('id', id)
      .select()
      .single();

    return { data, error };
  }
};

// ============================================
// PERFIL DO USUÁRIO
// ============================================
export const profileService = {
  get: async () => {
    const user = await authService.getCurrentUser();
    if (!user) {
      return { data: null, error: { message: 'Usuario nao autenticado' } };
    }
    
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    return { data, error };
  },

  update: async (profileData: any) => {
    const user = await authService.getCurrentUser();
    if (!user) {
      return { data: null, error: { message: 'Usuario nao autenticado' } };
    }
    
    const { data, error } = await supabase
      .from('profiles')
      .update(profileData)
      .eq('id', user.id)
      .select()
      .single();

    return { data, error };
  }
};
