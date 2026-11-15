import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout.jsx';
import { ProtectedRoute } from './components/ProtectedRoute.jsx';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import { LoginPage } from './pages/LoginPage.jsx';
import { RegisterPage } from './pages/RegisterPage.jsx';
import { AuditPage } from './pages/staff/AuditPage.jsx';
import { DashboardPage } from './pages/staff/DashboardPage.jsx';
import { InventoryPage } from './pages/staff/InventoryPage.jsx';
import { PosPage } from './pages/staff/PosPage.jsx';
import { PurchasesPage } from './pages/staff/PurchasesPage.jsx';
import { ReportsPage } from './pages/staff/ReportsPage.jsx';
import { SalesPage } from './pages/staff/SalesPage.jsx';
import { SuppliersPage } from './pages/staff/SuppliersPage.jsx';
import { UsersPage } from './pages/staff/UsersPage.jsx';
import { MyOrdersPage } from './pages/storefront/MyOrdersPage.jsx';
import { StorefrontPage } from './pages/storefront/StorefrontPage.jsx';

const HomeRedirect = () => {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={user.role === 'customer' ? '/store' : '/dashboard'} replace />;
};

export const App = () => (
  <AuthProvider>
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        <Route
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          {/* Customer Journey */}
          <Route
            path="/store"
            element={
              <ProtectedRoute allowedRoles={['customer']}>
                <StorefrontPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/orders"
            element={
              <ProtectedRoute allowedRoles={['customer']}>
                <MyOrdersPage />
              </ProtectedRoute>
            }
          />

          {/* Staff / Admin Journey */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute allowedRoles={['admin', 'pharmacist']}>
                <DashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/pos"
            element={
              <ProtectedRoute allowedRoles={['admin', 'pharmacist']}>
                <PosPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/inventory"
            element={
              <ProtectedRoute allowedRoles={['admin', 'pharmacist']}>
                <InventoryPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/purchases"
            element={
              <ProtectedRoute allowedRoles={['admin', 'pharmacist']}>
                <PurchasesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/sales"
            element={
              <ProtectedRoute allowedRoles={['admin', 'pharmacist']}>
                <SalesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/suppliers"
            element={
              <ProtectedRoute allowedRoles={['admin', 'pharmacist']}>
                <SuppliersPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/reports"
            element={
              <ProtectedRoute allowedRoles={['admin', 'pharmacist']}>
                <ReportsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/audit"
            element={
              <ProtectedRoute allowedRoles={['admin', 'pharmacist']}>
                <AuditPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/users"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <UsersPage />
              </ProtectedRoute>
            }
          />
        </Route>

        <Route path="*" element={<HomeRedirect />} />
      </Routes>
    </BrowserRouter>
  </AuthProvider>
);

export default App;
