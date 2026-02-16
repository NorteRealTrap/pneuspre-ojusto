import { create } from 'zustand';
import { authService, profileService } from '../../services/supabase';
import { User } from '@supabase/supabase-js';
import { useCartStore } from './cart';
import { useWishlistStore } from './wishlist';
import { useNotificationsStore } from './notifications';

interface Profile {
  id: string;
  name: string;
  cpf: string;
  phone: string;
  role: 'client' | 'admin';
  address?: any;
}

interface AuthState {
  user: User | null;
  profile: Profile | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (
    name: string,
    email: string,
    password: string,
    cpf?: string,
    phone?: string
  ) => Promise<{ requiresEmailConfirmation: boolean }>;
  logout: () => Promise<void>;
  updateProfile: (data: any) => Promise<void>;
  checkAuth: () => Promise<void>;
}

const AUTH_CHECK_TIMEOUT_MS = 7000;

function sanitizeCpf(cpf: string): string {
  return cpf.replace(/\D/g, '').slice(0, 11);
}

function buildFallbackProfile(user: User | null): Profile | null {
  if (!user) {
    return null;
  }

  const metadata = user.user_metadata || {};

  return {
    id: user.id,
    name: metadata.name || user.email || '',
    cpf: metadata.cpf || '',
    phone: metadata.phone || '',
    // Nunca promover admin por metadata do cliente.
    role: 'client',
    address: metadata.address,
  };
}

function resolveProfile(user: User | null, profile: Profile | null): Profile | null {
  if (profile) {
    return profile;
  }

  return buildFallbackProfile(user);
}

function isProfileNotFoundError(error: any): boolean {
  if (!error) return false;
  if (String(error.code || '') === 'PGRST116') return true;

  const message = String(error.message || '').toLowerCase();
  return message.includes('contains 0 rows') || message.includes('no rows');
}

function syncUserScopedStores(user: User | null) {
  const userId = user?.id || null;
  useCartStore.getState().setOwnerUserId(userId);
  useWishlistStore.getState().setOwnerUserId(userId);
  useNotificationsStore.getState().setOwnerUserId(userId);
}

function resolveAuthRedirectUrl(): string | undefined {
  const configuredRedirect = String(import.meta.env.VITE_AUTH_REDIRECT_URL || '').trim();
  if (configuredRedirect) {
    return configuredRedirect;
  }

  if (typeof window !== 'undefined' && window.location?.origin) {
    return new URL('/login', window.location.origin).toString();
  }

  return undefined;
}

async function getCurrentUserWithTimeout() {
  const timeoutPromise = new Promise<null>((resolve) => {
    setTimeout(() => resolve(null), AUTH_CHECK_TIMEOUT_MS);
  });

  try {
    const user = await Promise.race([authService.getCurrentUser(), timeoutPromise]);
    return user;
  } catch {
    return null;
  }
}

async function loadProfileWithPersistence(user: User): Promise<Profile | null> {
  const { data: profileData, error: profileError } = await profileService.get();
  if (profileData) {
    return resolveProfile(user, (profileData as Profile | null) ?? null);
  }

  if (!profileError || isProfileNotFoundError(profileError)) {
    const { data: ensuredProfile, error: ensureError } = await profileService.ensure({
      name: user.user_metadata?.name,
      cpf: user.user_metadata?.cpf,
      phone: user.user_metadata?.phone,
      address: user.user_metadata?.address,
    });

    if (!ensureError && ensuredProfile) {
      return resolveProfile(user, ensuredProfile as Profile);
    }
  }

  return buildFallbackProfile(user);
}

export const useAuthStore = create<AuthState>()((set) => ({
  user: null,
  profile: null,
  isAuthenticated: false,
  loading: true,

  login: async (email: string, password: string) => {
    set({ loading: true });
    try {
      const normalizedEmail = email.trim().toLowerCase();
      const { data, error } = await authService.signIn(normalizedEmail, password);
      if (error) throw error;
      if (!data.user || !data.session) {
        throw new Error('Nao foi possivel criar a sessao de login.');
      }

      const profile = await loadProfileWithPersistence(data.user);
      syncUserScopedStores(data.user);

      set({
        user: data.user,
        profile,
        isAuthenticated: true,
        loading: false,
      });
    } catch (error) {
      set({ loading: false });
      throw error;
    }
  },

  register: async (name: string, email: string, password: string, cpf = '', phone = '') => {
    set({ loading: true });
    try {
      const normalizedEmail = email.trim().toLowerCase();
      const normalizedName = name.trim();
      const normalizedCpf = sanitizeCpf(cpf.trim());
      const normalizedPhone = phone.trim();
      const metadata: Record<string, string> = {
        name: normalizedName,
      };

      if (normalizedCpf) {
        metadata.cpf = normalizedCpf;
      }

      if (normalizedPhone) {
        metadata.phone = normalizedPhone;
      }

      const redirectTo = resolveAuthRedirectUrl();

      const { data, error } = await authService.signUp(normalizedEmail, password, metadata, redirectTo);
      if (error) throw error;

      const requiresEmailConfirmation = !data.session;
      const authenticatedUser = data.session ? data.user : null;
      let profile: Profile | null = null;
      if (authenticatedUser) {
        profile = await loadProfileWithPersistence(authenticatedUser);
      }
      syncUserScopedStores(authenticatedUser);

      set({
        user: authenticatedUser,
        profile,
        isAuthenticated: Boolean(data.session),
        loading: false,
      });

      return { requiresEmailConfirmation };
    } catch (error) {
      set({ loading: false });
      throw error;
    }
  },

  logout: async () => {
    await authService.signOut();
    syncUserScopedStores(null);
    set({
      user: null,
      profile: null,
      isAuthenticated: false,
    });
  },

  updateProfile: async (data: any) => {
    try {
      const { data: updated, error } = await profileService.update(data);
      if (error) {
        throw error;
      }

      set({ profile: (updated as Profile | null) ?? null });
    } catch (error) {
      throw error;
    }
  },

  checkAuth: async () => {
    set({ loading: true });
    try {
      const user = await getCurrentUserWithTimeout();
      if (user) {
        const profile = await loadProfileWithPersistence(user);
        syncUserScopedStores(user);
        set({
          user,
          profile,
          isAuthenticated: true,
          loading: false,
        });
      } else {
        syncUserScopedStores(null);
        set({
          user: null,
          profile: null,
          isAuthenticated: false,
          loading: false,
        });
      }
    } catch (error) {
      syncUserScopedStores(null);
      set({
        user: null,
        profile: null,
        isAuthenticated: false,
        loading: false,
      });
    }
  },
}));
