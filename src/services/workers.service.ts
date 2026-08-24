import { supabase } from '../config/supabase';
import type { User, ServiceResult } from '../types';

const FUNCTIONS_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;

async function callAdminUser(type: string, payload: Record<string, unknown>): Promise<Record<string, unknown>> {
  const { data: { session } } = await supabase.auth.getSession();
  const res = await fetch(`${FUNCTIONS_URL}/admin-user`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session?.access_token || ''}`,
      'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({ type, ...payload }),
  });
  return res.json();
}

export async function getWorkers(): Promise<ServiceResult<User[]>> {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .neq('role', 'super_admin')
    .order('nama');
  if (error) return { success: false, error: error.message, code: error.code };
  return { success: true, data: data as User[] };
}

export async function getWorkerById(id: string): Promise<ServiceResult<User>> {
  const { data, error } = await supabase.from('users').select('*').eq('id', id).single();
  if (error) return { success: false, error: error.message, code: error.code };
  return { success: true, data: data as User };
}

function validateWorker(worker: { nama?: string; no_hp?: string }): string | null {
  if (worker.nama !== undefined && !worker.nama.trim()) {
    return 'Nama tidak boleh kosong.';
  }
  if (worker.no_hp !== undefined) {
    if (!/^[0-9]{10,15}$/.test(worker.no_hp)) {
      return 'Nomor HP harus 10-15 digit angka.';
    }
  }
  return null;
}

function validatePin(pin: string): string | null {
  if (!/^\d{6}$/.test(pin)) {
    return 'PIN harus tepat 6 digit angka.';
  }
  return null;
}

export async function createWorker(
  worker: Omit<User, 'id'>,
  pin: string,
): Promise<ServiceResult<User>> {
  const validationError = validateWorker(worker);
  if (validationError) return { success: false, error: validationError };

  // FIXPLAN S3: PIN wajib dari form admin — tanpa default '1234'
  const pinError = validatePin(pin);
  if (pinError) return { success: false, error: pinError };

  const { data: existing } = await supabase
    .from('users')
    .select('id')
    .eq('no_hp', worker.no_hp)
    .limit(1);
  if (existing && existing.length > 0) {
    return { success: false, error: 'Nomor HP sudah digunakan oleh pekerja lain.' };
  }

  const authResult = await callAdminUser('create', {
    no_hp: worker.no_hp,
    nama: worker.nama,
    password: pin,
    role: worker.role || 'worker',
  });
  if (authResult.error) {
    return { success: false, error: authResult.error as string };
  }

  const authUserId = authResult.authUserId as string;

  const { data, error } = await supabase
    .from('users')
    .insert({ ...worker, id: authUserId })
    .select();
  if (error) return { success: false, error: error.message, code: error.code };
  return { success: true, data: (data?.[0] as User) || ({ ...worker, id: authUserId } as User) };
}

export async function updateWorker(id: string, worker: Partial<User>): Promise<ServiceResult<User>> {
  const validationError = validateWorker(worker);
  if (validationError) return { success: false, error: validationError };

  if (worker.no_hp) {
    const { data: existing } = await supabase
      .from('users')
      .select('id')
      .eq('no_hp', worker.no_hp)
      .neq('id', id)
      .limit(1);
    if (existing && existing.length > 0) {
      return { success: false, error: 'Nomor HP sudah digunakan oleh pekerja lain.' };
    }
  }

  const { data, error } = await supabase.from('users').update(worker).eq('id', id).select();
  if (error) return { success: false, error: error.message, code: error.code };

  // FIXPLAN U5: sinkron user_metadata auth agar tampilan & JWT tidak basi
  const metaSync: Record<string, unknown> = {};
  if (worker.nama !== undefined) metaSync.nama = worker.nama;
  if (worker.no_hp !== undefined) metaSync.no_hp = worker.no_hp;
  if (worker.role !== undefined) metaSync.role = worker.role;
  if (Object.keys(metaSync).length > 0) {
    await callAdminUser('sync-metadata', { userId: id, metadata: metaSync });
  }

  return { success: true, data: (data?.[0] as User) || (worker as User) };
}

export async function deleteWorker(id: string): Promise<ServiceResult<void>> {
  const authResult = await callAdminUser('delete', { userId: id });
  if (authResult.error) {
    return { success: false, error: `Gagal menghapus akun auth: ${authResult.error}` };
  }

  const { error } = await supabase.from('users').delete().eq('id', id);
  if (error) return { success: false, error: error.message, code: error.code };
  return { success: true, data: undefined };
}

/** FIXPLAN S3: reset PIN pekerja via edge function (admin-only di server). */
export async function resetWorkerPin(userId: string, pin: string): Promise<ServiceResult<void>> {
  const pinError = validatePin(pin);
  if (pinError) return { success: false, error: pinError };

  const authResult = await callAdminUser('reset-pin', { userId, pin });
  if (authResult.error) {
    return { success: false, error: authResult.error as string };
  }
  return { success: true, data: undefined };
}
