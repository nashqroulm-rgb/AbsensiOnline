import { supabase } from '../config/supabase';
import type { Shift, ServiceResult } from '../types';

export async function getShifts(): Promise<ServiceResult<Shift[]>> {
  const { data, error } = await supabase.from('shifts').select('*').order('nama');
  if (error) return { success: false, error: error.message, code: error.code };
  return { success: true, data: data as Shift[] };
}

export async function getShiftById(id: string): Promise<ServiceResult<Shift>> {
  const { data, error } = await supabase.from('shifts').select('*').eq('id', id).single();
  if (error) return { success: false, error: error.message, code: error.code };
  return { success: true, data: data as Shift };
}

function validateShift(shift: { toleransi_menit?: number; jam_mulai?: string; jam_selesai?: string }): string | null {
  if (shift.toleransi_menit !== undefined && (shift.toleransi_menit < 0 || shift.toleransi_menit > 120)) {
    return 'Toleransi harus antara 0 dan 120 menit.';
  }
  if (shift.jam_mulai && shift.jam_selesai) {
    const [sh, sm] = shift.jam_mulai.split(':').map(Number);
    const [eh, em] = shift.jam_selesai.split(':').map(Number);
    if (isNaN(sh) || isNaN(sm) || isNaN(eh) || isNaN(em)) {
      return 'Format jam tidak valid (HH:MM).';
    }
    if (sh < 0 || sh > 23 || sm < 0 || sm > 59 || eh < 0 || eh > 23 || em < 0 || em > 59) {
      return 'Jam harus antara 00:00 dan 23:59.';
    }
  }
  return null;
}

export async function createShift(shift: Omit<Shift, 'id'>): Promise<ServiceResult<Shift>> {
  const validationError = validateShift(shift);
  if (validationError) return { success: false, error: validationError };
  const { data, error } = await supabase.from('shifts').insert(shift).select();
  if (error) return { success: false, error: error.message, code: error.code };
  return { success: true, data: (data?.[0] as Shift) || (shift as Shift) };
}

export async function updateShift(id: string, shift: Partial<Shift>): Promise<ServiceResult<Shift>> {
  const validationError = validateShift(shift);
  if (validationError) return { success: false, error: validationError };
  const { data, error } = await supabase.from('shifts').update(shift).eq('id', id).select();
  if (error) return { success: false, error: error.message, code: error.code };
  return { success: true, data: (data?.[0] as Shift) || (shift as Shift) };
}

export async function deleteShift(id: string): Promise<ServiceResult<void>> {
  const { error } = await supabase.from('shifts').delete().eq('id', id);
  if (error) return { success: false, error: error.message, code: error.code };
  return { success: true, data: undefined };
}
