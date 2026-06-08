import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('App crashed:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 max-w-md w-full text-center">
            <div className="w-14 h-14 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <AlertTriangle size={28} className="text-red-500" />
            </div>
            <h2 className="text-lg font-bold text-gray-900 mb-2">Terjadi Kesalahan</h2>
            <p className="text-sm text-gray-500 mb-6">
              Aplikasi mengalami error yang tidak terduga. Silakan coba lagi.
            </p>
            {this.state.error && (
              <div className="bg-red-50 border border-red-100 rounded-lg p-3 mb-4">
                <p className="text-xs text-red-600 font-mono break-all">
                  {this.state.error.message}
                </p>
              </div>
            )}
            <button
              onClick={() => window.location.reload()}
              className="w-full h-11 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <RefreshCw size={16} />
              Muat Ulang
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
