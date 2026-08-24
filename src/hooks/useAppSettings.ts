import { useState, useEffect, useCallback } from 'react';
import type { AppSettings } from '../types';
import { DEFAULT_APP_SETTINGS } from '../types';
import { getAppSettings } from '../services/settings.service';

let cachedSettings: AppSettings | null = null;
let cachePromise: Promise<AppSettings> | null = null;

async function loadSettings(): Promise<AppSettings> {
  if (cachedSettings) return cachedSettings;
  if (!cachePromise) {
    cachePromise = getAppSettings().then(result => {
      cachedSettings = result.success ? result.data : DEFAULT_APP_SETTINGS;
      return cachedSettings;
    });
  }
  return cachePromise;
}

export function invalidateAppSettingsCache() {
  cachedSettings = null;
  cachePromise = null;
}

export function useAppSettings() {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_APP_SETTINGS);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    invalidateAppSettingsCache();
    setLoading(true);
    const data = await loadSettings();
    setSettings(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadSettings().then(data => {
      setSettings(data);
      setLoading(false);
    });
  }, []);

  return { settings, loading, refresh };
}