import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Eye, EyeOff, Lock, Phone } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { login, isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const [noHp, setNoHp] = useState('');
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isAuthenticated || !user) return;
    const isAdmin = user.role === 'admin' || user.role === 'super_admin';
    navigate(isAdmin ? '/admin/dashboard' : '/app/home', { replace: true });
  }, [isAuthenticated, user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noHp || !pin) { setError('Mohon isi semua field'); return; }
    setLoading(true);
    setError('');
    const result = await login({ username: noHp, password: pin });
    if (result.success) {
      // Navigate happens via useEffect when user state updates
    } else {
      setError(result.error || 'Login gagal');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50 flex flex-col items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-green-100 rounded-full opacity-40" />
        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-emerald-100 rounded-full opacity-40" />
      </div>

      <div className="relative w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-green-600 rounded-2xl shadow-lg shadow-green-200 mb-4">
            <MapPin className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">AbsensiOnline</h1>
          <p className="text-gray-500 text-sm mt-1">Sistem Absensi GPS Pekerja Lapangan</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Nomor HP</label>
              <div className="relative">
                <Phone size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="tel"
                  value={noHp}
                  onChange={e => setNoHp(e.target.value)}
                  placeholder="08xxxxxxxxxx"
                  className="w-full pl-9 pr-4 py-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">PIN</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type={showPin ? 'text' : 'password'}
                  value={pin}
                  onChange={e => setPin(e.target.value)}
                  placeholder="Masukkan PIN"
                  maxLength={8}
                  className="w-full pl-9 pr-10 py-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPin(!showPin)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPin ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
                <div className="w-4 h-4 rounded-full bg-red-500 flex-shrink-0 mt-0.5 flex items-center justify-center">
                  <span className="text-white text-xs font-bold">!</span>
                </div>
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full h-12 bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2 shadow-sm shadow-green-200"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                'Masuk'
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          © 2026 AbsensiOnline · v1.0.0
        </p>
      </div>
    </div>
  );
}
