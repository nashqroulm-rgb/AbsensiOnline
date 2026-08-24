import { supabase } from '../config/supabase';
import type { AppSettings, ServiceResult } from '../types';
import { DEFAULT_APP_SETTINGS } from '../types';

export async function getAppSettings(): Promise<ServiceResult<AppSettings>> {
  const { data, error } = await supabase.from('app_settings').select('*').eq('id', 1).single();
  if (error) {
    if (error.code === 'PGRST116' || error.code === '42P01') {
      return { success: true, data: DEFAULT_APP_SETTINGS };
    }
    return { success: false, error: error.message, code: error.code };
  }
  return { success: true, data: data as AppSettings };
}

export async function updateAppSettings(
  settings: Partial<Omit<AppSettings, 'id' | 'updated_at'>>,
): Promise<ServiceResult<AppSettings>> {
  const { data, error } = await supabase
    .from('app_settings')
    .update(settings)
    .eq('id', 1)
    .select()
    .single();
  if (error) return { success: false, error: error.message, code: error.code };
  return { success: true, data: data as AppSettings };
}

export function getIntegrationStatus() {
  return {
    supabase: Boolean(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY),
    cloudinary: Boolean(import.meta.env.VITE_CLOUDINARY_CLOUD_NAME && import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET),
  };
}