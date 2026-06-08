import { Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './components/ui/Toast';
import ErrorBoundary from './components/ErrorBoundary';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './components/Login';
import PWALayout from './components/pwa/PWALayout';
import HomeTab from './components/pwa/HomeTab';
import HistoryTab from './components/pwa/HistoryTab';
import ProfileTab from './components/pwa/ProfileTab';
import AdminLayout from './components/admin/AdminLayout';
import Dashboard from './components/admin/Dashboard';
import WorkersPage from './components/admin/WorkersPage';
import ShiftsPage from './components/admin/ShiftsPage';
import ZonesPage from './components/admin/ZonesPage';
import AttendancePage from './components/admin/AttendancePage';
import ReportsPage from './components/admin/ReportsPage';
import SettingsPage from './components/admin/SettingsPage';

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <ToastProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<Navigate to="/login" replace />} />

            <Route element={<ProtectedRoute adminOnly />}>
              <Route path="/admin" element={<AdminLayout />}>
                <Route index element={<Navigate to="/admin/dashboard" replace />} />
                <Route path="dashboard" element={<Dashboard />} />
                <Route path="workers" element={<WorkersPage />} />
                <Route path="shifts" element={<ShiftsPage />} />
                <Route path="zones" element={<ZonesPage />} />
                <Route path="attendance" element={<AttendancePage />} />
                <Route path="reports" element={<ReportsPage />} />
                <Route path="settings" element={<SettingsPage />} />
              </Route>
            </Route>

            <Route element={<ProtectedRoute />}>
              <Route path="/app" element={<PWALayout />}>
                <Route index element={<Navigate to="/app/home" replace />} />
                <Route path="home" element={<HomeTab />} />
                <Route path="history" element={<HistoryTab />} />
                <Route path="profile" element={<ProfileTab />} />
              </Route>
            </Route>

            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </ToastProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}
