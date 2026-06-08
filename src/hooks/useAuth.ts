import { useState, useEffect, useCallback } from 'react';
import type { User, Role } from '../types';
import { supabase } from '../config/supabase';

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
}

export function useAuthState() {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.access_token) {
        setToken(session.access_token);
        const meta = session.user.user_metadata as Record<string, unknown>;
        if (meta?.role) {
          setUser({
            id: session.user.id,
            nama: (meta.nama as string) || '',
            no_hp: (meta.no_hp as string) || '',
            jabatan: (meta.jabatan as string) || '',
            role: meta.role as Role,
            zona_id: (meta.zona_id as string) || '',
            shift_id: (meta.shift_id as string) || '',
            status: 'aktif',
            tipe: (meta.tipe as 'tetap' | 'kontrak' | 'harian') || 'tetap',
            gender: (meta.gender as 'pria' | 'wanita') || 'pria',
            bergabung_sejak: (meta.bergabung_sejak as string) || '',
            absensi_online: true,
          });
        }
      }
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.access_token) {
        setToken(session.access_token);
        const meta = session.user.user_metadata as Record<string, unknown>;
        if (meta?.role) {
          setUser({
            id: session.user.id,
            nama: (meta.nama as string) || '',
            no_hp: (meta.no_hp as string) || '',
            jabatan: (meta.jabatan as string) || '',
            role: meta.role as Role,
            zona_id: (meta.zona_id as string) || '',
            shift_id: (meta.shift_id as string) || '',
            status: 'aktif',
            tipe: (meta.tipe as 'tetap' | 'kontrak' | 'harian') || 'tetap',
            gender: (meta.gender as 'pria' | 'wanita') || 'pria',
            bergabung_sejak: (meta.bergabung_sejak as string) || '',
            absensi_online: true,
          });
        }
      } else {
        setUser(null);
        setToken(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const login = useCallback(
    async (credentials: LoginCredentials): Promise<{ success: boolean; error?: string }> => {
      const { username, password } = credentials;

      const { data: matched, error: queryError } = await supabase
        .rpc('get_user_by_no_hp', { p_no_hp: username })
        .maybeSingle();

      if (queryError) {
        return { success: false, error: 'Gagal menghubungi server.' };
      }

      if (!matched) {
        return { success: false, error: 'No HP tidak terdaftar atau tidak aktif.' };
      }

      const email = `${username}@absensi.local`;

      const { error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        return { success: false, error: 'PIN salah.' };
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        return { success: false, error: 'Gagal mendapatkan session.' };
      }

      setToken(session.access_token);
      setUser(matched as User);
      return { success: true };
    },
    [],
  );

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
    setToken(null);
    localStorage.removeItem('absensi_app_store');
  }, []);

  return {
    user,
    token,
    isAuthenticated: Boolean(token && user),
    loading,
    login,
    logout,
  };
}
