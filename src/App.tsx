import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ActivityProvider } from './context/ActivityContext';
import { InventoryProvider } from './context/InventoryContext';
import { TodoProvider } from './context/TodoContext';
import { OperationsProvider } from './context/OperationsContext';
import { StaffingProvider } from './context/StaffingContext';
import LandingPage from './pages/LandingPage';
import Dashboard from './pages/Dashboard';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth();
  if (loading) return null;
  return session ? <>{children}</> : <Navigate to="/" replace />;
}

function AppRoutes() {
  const { session, loading } = useAuth();
  if (loading) return null;
  return (
    <Routes>
      <Route path="/" element={session ? <Navigate to="/dashboard" replace /> : <LandingPage />} />
      <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ActivityProvider>
        <StaffingProvider>
        <OperationsProvider>
        <InventoryProvider>
          <TodoProvider>
            <AuthProvider>
              <AppRoutes />
            </AuthProvider>
          </TodoProvider>
        </InventoryProvider>
        </OperationsProvider>
        </StaffingProvider>
      </ActivityProvider>
    </BrowserRouter>
  );
}

