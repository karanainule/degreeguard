import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import VerifyPage from './pages/VerifyPage';
import VerificationsPage from './pages/VerificationsPage';
import InstitutionsPage from './pages/InstitutionsPage';
import CertificatesPage from './pages/CertificatesPage';
import AlertsPage from './pages/AlertsPage';

function ProtectedRoute({ children, roles }) {
  const { user, loading } = useAuth();
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950">
      <span className="w-10 h-10 border-2 border-brand-500/30 border-t-brand-500 rounded-full animate-spin" />
    </div>
  );
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/verify" replace />;
  return <Layout>{children}</Layout>;
}

function PublicRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) return <Navigate to={user.role === 'admin' ? '/dashboard' : '/verify'} replace />;
  return children;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Toaster
          position="top-right"
          toastOptions={{
            style: { background: '#1e293b', color: '#e2e8f0', border: '1px solid #334155', fontSize: '14px' },
            success: { iconTheme: { primary: '#40c057', secondary: '#1e293b' } },
            error: { iconTheme: { primary: '#fa5252', secondary: '#1e293b' } },
          }}
        />
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
          <Route path="/register" element={<PublicRoute><RegisterPage /></PublicRoute>} />
          <Route path="/dashboard" element={<ProtectedRoute roles={['admin', 'institution']}><DashboardPage /></ProtectedRoute>} />
          <Route path="/verify" element={<ProtectedRoute><VerifyPage /></ProtectedRoute>} />
          <Route path="/verifications" element={<ProtectedRoute><VerificationsPage /></ProtectedRoute>} />
          <Route path="/institutions" element={<ProtectedRoute><InstitutionsPage /></ProtectedRoute>} />
          <Route path="/certificates" element={<ProtectedRoute roles={['admin', 'institution']}><CertificatesPage /></ProtectedRoute>} />
          <Route path="/alerts" element={<ProtectedRoute roles={['admin']}><AlertsPage /></ProtectedRoute>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
