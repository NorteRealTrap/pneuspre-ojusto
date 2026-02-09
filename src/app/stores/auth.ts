import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { authService, profileService } from '../../services/supabase';
import { User } from '@supabase/supabase-js';

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

function buildFallbackProfile(user: User | null): Profile | null {
  if (!user) {
    return null;
  }

  const metadata = user.user_metadata || {};
  const inferredRole = metadata.role === 'admin' ? 'admin' : 'client';

  return {
    id: user.id,
    name: metadata.name || user.email || '',
    cpf: metadata.cpf || '',
    phone: metadata.phone || '',
    role: inferredRole,
    address: metadata.address,
  };
}

function resolveProfile(user: User | null, profile: Profile | null): Profile | null {
  if (profile) {
    return profile;
  }

  return buildFallbackProfile(user);
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
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

          const { data: profileData } = await profileService.get();
          const profile = resolveProfile(data.user, (profileData as Profile | null) ?? null);

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
          const metadata = {
            name: name.trim(),
            cpf: cpf.trim(),
            phone: phone.trim(),
          };

          const { data, error } = await authService.signUp(normalizedEmail, password, metadata);
          if (error) throw error;

          const requiresEmailConfirmation = !data.session;
          let profile: Profile | null = buildFallbackProfile(data.user);
          if (data.session) {
            const { data: profileData } = await profileService.get();
            profile = resolveProfile(data.user, (profileData as Profile | null) ?? null);
          }

          set({
            user: data.user,
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
        set({
          user: null,
          profile: null,
          isAuthenticated: false,
        });
      },

      updateProfile: async (data: any) => {
        try {
          const { data: updated } = await profileService.update(data);
          set({ profile: updated });
        } catch (error) {
          throw error;
        }
      },

      checkAuth: async () => {
        set({ loading: true });
        try {
          const user = await authService.getCurrentUser();
          if (user) {
            const { data: profileData } = await profileService.get();
            const profile = resolveProfile(user, (profileData as Profile | null) ?? null);
            set({
              user,
              profile,
              isAuthenticated: true,
              loading: false,
            });
          } else {
            set({
              user: null,
              profile: null,
              isAuthenticated: false,
              loading: false,
            });
          }
        } catch (error) {
          set({
            user: null,
            profile: null,
            isAuthenticated: false,
            loading: false,
          });
        }
      },
    }),
    {
      name: 'auth-storage',
    }
  )
);
