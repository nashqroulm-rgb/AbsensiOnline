import { Settings } from 'lucide-react';

export default function SettingsPage() {
  return (
    <div className="p-6">
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-8 text-center max-w-lg mx-auto">
        <div className="inline-flex items-center justify-center w-14 h-14 bg-gray-100 rounded-2xl mb-4">
          <Settings className="w-7 h-7 text-gray-500" />
        </div>
        <h2 className="text-lg font-semibold text-gray-900">Pengaturan</h2>
        <p className="text-sm text-gray-500 mt-2">
          Halaman konfigurasi sistem akan tersedia setelah integrasi backend.
        </p>
        {/* TODO: replace with API-driven settings */}
      </div>
    </div>
  );
}
