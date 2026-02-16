import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    'Supabase nao configurado corretamente. Defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY.'
  );
}

export const supabase = createClient(
  supabaseUrl || 'https://invalid.local',
  supabaseAnonKey || 'invalid-anon-key'
);

const apiBaseUrl = String(import.meta.env.VITE_API_URL || '')
  .trim()
  .replace(/\/+$/, '');

function buildApiUrl(path: string) {
  if (!apiBaseUrl) return '';
  return `${apiBaseUrl}${path.startsWith('/') ? path : `/${path}`}`;
}

async function readApiResponse(response: Response) {
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    try {
      return await response.json();
    } catch {
      return null;
    }
  }

  try {
    const text = await response.text();
    return text ? { message: text } : null;
  } catch {
    return null;
  }
}

async function getAccessToken() {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token || null;
}

async function requestAdminApi(path: string, init: RequestInit = {}) {
  const url = buildApiUrl(path);
  if (!url) {
    return {
      data: null,
      error: { message: 'VITE_API_URL nao configurada para operacoes administrativas seguras.' },
    };
  }

  const token = await getAccessToken();
  if (!token) {
    return { data: null, error: { message: 'Sessao expirada. Faca login novamente.' } };
  }

  const headers: HeadersInit = {
    Authorization: `Bearer ${token}`,
    ...(init.headers || {}),
  };

  const hasBody = init.body !== undefined && init.body !== null;
  if (hasBody && !Object.keys(headers).some((key) => key.toLowerCase() === 'content-type')) {
    headers['Content-Type'] = 'application/json';
  }

  try {
    const response = await fetch(url, {
      ...init,
      headers,
    });
    const payload = await readApiResponse(response);

    if (!response.ok) {
      return {
        data: null,
        error: {
          message:
            payload?.error ||
            payload?.message ||
            `Falha na operacao administrativa (HTTP ${response.status}).`,
        },
      };
    }

    return { data: payload?.data ?? payload ?? null, error: null };
  } catch (error: any) {
    return {
      data: null,
      error: { message: String(error?.message || 'Falha de comunicacao com backend administrativo.') },
    };
  }
}

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
    const { data, error } = await supabase.auth.getUser();
    if (data.user) {
      return data.user;
    }

    if (error) {
      const { data: sessionData } = await supabase.auth.getSession();
      return sessionData.session?.user ?? null;
    }

    return null;
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
    let query = supabase.from('products').select('*').is('deleted_at', null);

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
      .is('deleted_at', null)
      .single();
    return { data, error };
  },

  create: async (product: any) => {
    const backendResult = await requestAdminApi('/api/admin/products', {
      method: 'POST',
      body: JSON.stringify(product),
    });

    if (!backendResult.error) {
      return backendResult;
    }

    const { data, error } = await supabase.from('products').insert([product]).select().single();
    return { data, error };
  },

  update: async (id: string, product: any) => {
    const backendResult = await requestAdminApi(`/api/admin/products/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(product),
    });

    if (!backendResult.error) {
      return backendResult;
    }

    const { data, error } = await supabase
      .from('products')
      .update(product)
      .eq('id', id)
      .select()
      .single();
    return { data, error };
  },

  delete: async (id: string) => {
    const backendResult = await requestAdminApi(`/api/admin/products/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });

    if (!backendResult.error) {
      return { error: backendResult.error };
    }

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

    const payloadItems = orderData.items.map((item: any) => ({
      product_id: item.product_id,
      quantity: Number(item.quantity),
      price: Number(item.price),
    }));

    const { data: order, error } = await supabase.rpc('create_order_with_items', {
      p_total: Number(orderData.total),
      p_payment_method: String(orderData.payment_method || ''),
      p_shipping_address: orderData.shipping_address,
      p_items: payloadItems,
    });

    if (error) {
      return {
        data: null,
        error: {
          ...error,
          message: error.message || 'Nao foi possivel criar pedido com controle de estoque',
        },
      };
    }

    const normalizedOrder = Array.isArray(order) ? order[0] : order;
    return { data: normalizedOrder ?? null, error: null };
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

  getAdminSummary: async (options?: { since?: string | null }) => {
    if (apiBaseUrl) {
      const since = typeof options?.since === 'string' ? options.since.trim() : '';
      const query = since ? `?since=${encodeURIComponent(since)}` : '';
      const backendResult = await requestAdminApi(`/api/admin/orders/summary${query}`, { method: 'GET' });
      if (!backendResult.error) {
        return backendResult;
      }
    }

    let query = supabase.from('orders').select('id, total, status, created_at');
    const since = typeof options?.since === 'string' ? options.since.trim() : '';

    if (since && !Number.isNaN(Date.parse(since))) {
      query = query.gte('created_at', since);
    }

    const { data, error } = await query;

    if (error) {
      return { data: null, error };
    }

    const paidStatuses = new Set(['processing', 'confirmed', 'approved', 'shipped', 'delivered']);
    const pendingStatuses = new Set(['pending']);
    const cancelledStatuses = new Set(['cancelled', 'refunded', 'declined']);

    const rows = Array.isArray(data) ? data : [];
    const totals = rows.reduce(
      (acc, row: any) => {
        const total = Number(row.total) || 0;
        const status = String(row.status || '').toLowerCase();

        acc.totalOrders += 1;

        if (paidStatuses.has(status)) {
          acc.confirmedRevenue += total;
          acc.confirmedOrders += 1;
        } else if (pendingStatuses.has(status)) {
          acc.pendingRevenue += total;
          acc.pendingOrders += 1;
        } else if (cancelledStatuses.has(status)) {
          acc.cancelledOrders += 1;
        }

        return acc;
      },
      {
        confirmedRevenue: 0,
        pendingRevenue: 0,
        confirmedOrders: 0,
        pendingOrders: 0,
        cancelledOrders: 0,
        totalOrders: 0,
      }
    );

    return { data: totals, error: null };
  },

  updateStatus: async (id: string, status: string) => {
    if (apiBaseUrl) {
      const backendResult = await requestAdminApi(`/api/admin/orders/${encodeURIComponent(id)}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      if (!backendResult.error) {
        return backendResult;
      }
    }

    if (status === 'cancelled') {
      const { data, error } = await supabase.rpc('cancel_order_with_restock', {
        p_order_id: id,
      });

      const normalized = Array.isArray(data) ? data[0] : data;
      return { data: normalized ?? null, error };
    }

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
  },

  ensure: async (profileData?: any) => {
    const user = await authService.getCurrentUser();
    if (!user) {
      return { data: null, error: { message: 'Usuario nao autenticado' } };
    }

    const metadata = user.user_metadata || {};
    const nextCpf = String(profileData?.cpf ?? metadata.cpf ?? '').replace(/\D/g, '');
    const nextPhone = String(profileData?.phone ?? metadata.phone ?? '').trim();

    const payload = {
      id: user.id,
      name: String(profileData?.name ?? metadata.name ?? user.email ?? '').trim(),
      cpf: nextCpf || null,
      phone: nextPhone || null,
      address: profileData?.address ?? metadata.address ?? null,
    };

    const { data, error } = await supabase
      .from('profiles')
      .upsert(payload, { onConflict: 'id' })
      .select()
      .single();

    return { data, error };
  }
};

// ============================================
// CONFIGURACOES DO SITE
// ============================================
const SITE_CONFIG_DEFAULT_ROW_ID = 'default';

export const siteConfigService = {
  get: async () => {
    const { data, error } = await supabase
      .from('site_config')
      .select('id, config_json, updated_at')
      .eq('id', SITE_CONFIG_DEFAULT_ROW_ID)
      .maybeSingle();

    return { data, error };
  },

  upsert: async (config: Record<string, unknown>) => {
    if (apiBaseUrl) {
      const backendResult = await requestAdminApi('/api/admin/site-config', {
        method: 'PATCH',
        body: JSON.stringify({ config }),
      });

      if (!backendResult.error) {
        return backendResult;
      }
    }

    const currentUser = await authService.getCurrentUser();

    const { data, error } = await supabase
      .from('site_config')
      .upsert(
        {
          id: SITE_CONFIG_DEFAULT_ROW_ID,
          config_json: config,
          updated_by: currentUser?.id ?? null,
        },
        { onConflict: 'id' }
      )
      .select('id, config_json, updated_at')
      .single();

    if (!error && !data) {
      return {
        data: null,
        error: {
          message:
            'Persistencia bloqueada: nenhuma linha foi atualizada em site_config. Verifique permissoes de admin (RLS).',
        },
      };
    }

    return { data, error };
  },
};
