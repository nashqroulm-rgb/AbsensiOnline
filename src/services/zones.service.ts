import { supabase } from '../config/supabase';
import type { Zone, ServiceResult } from '../types';

export async function getZones(): Promise<ServiceResult<Zone[]>> {
  const { data, error } = await supabase.from('zones').select('*').order('nama');
  if (error) return { success: false, error: error.message, code: error.code };
  return { success: true, data: data as Zone[] };
}

export async function getZoneById(id: string): Promise<ServiceResult<Zone>> {
  const { data, error } = await supabase.from('zones').select('*').eq('id', id).single();
  if (error) return { success: false, error: error.message, code: error.code };
  return { success: true, data: data as Zone };
}

function validateZone(zone: { latitude?: number; longitude?: number; radius_meter?: number }): string | null {
  if (zone.latitude !== undefined && (zone.latitude < -90 || zone.latitude > 90)) {
    return 'Latitude harus antara -90 dan 90.';
  }
  if (zone.longitude !== undefined && (zone.longitude < -180 || zone.longitude > 180)) {
    return 'Longitude harus antara -180 dan 180.';
  }
  if (zone.radius_meter !== undefined && (zone.radius_meter <= 0 || zone.radius_meter > 10000)) {
    return 'Radius harus antara 1 dan 10.000 meter.';
  }
  return null;
}

export async function createZone(zone: Omit<Zone, 'id'>): Promise<ServiceResult<Zone>> {
  const validationError = validateZone(zone);
  if (validationError) return { success: false, error: validationError };
  const { data, error } = await supabase.from('zones').insert(zone).select();
  if (error) return { success: false, error: error.message, code: error.code };
  return { success: true, data: (data?.[0] as Zone) || (zone as Zone) };
}

export async function updateZone(id: string, zone: Partial<Zone>): Promise<ServiceResult<Zone>> {
  const validationError = validateZone(zone);
  if (validationError) return { success: false, error: validationError };
  const { data, error } = await supabase.from('zones').update(zone).eq('id', id).select();
  if (error) return { success: false, error: error.message, code: error.code };
  return { success: true, data: (data?.[0] as Zone) || (zone as Zone) };
}

export async function deleteZone(id: string): Promise<ServiceResult<void>> {
  const { error } = await supabase.from('zones').delete().eq('id', id);
  if (error) return { success: false, error: error.message, code: error.code };
  return { success: true, data: undefined };
}
