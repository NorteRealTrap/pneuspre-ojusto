import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Toaster } from 'sonner';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { RequireAuth, RequireAdmin, RequireGuest } from './components/RouteGuards';
import { HomePage } from './pages/HomePage';
import { ProductsPage } from './pages/ProductsPage';
import { ProductDetailPage } from './pages/ProductDetailPage';
import { WishlistPage } from './pages/WishlistPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { CartPage } from './pages/CartPage';
import { CheckoutPage } from './pages/CheckoutPage';
import { AccountPage } from './pages/AccountPage';
import { OrdersPage } from './pages/OrdersPage';
import { DashboardPage } from './pages/DashboardPage';
import { InfoPage } from './pages/InfoPage';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { ResetPasswordPage } from './pages/ResetPasswordPage';
import { useAuthStore } from './stores/auth';
import { authService } from '../services/supabase';

function AppShell() {
  const checkAuth = useAuthStore((state) => state.checkAuth);
  const location = useLocation();
  const isCheckoutRoute =
    location.pathname === '/checkout' ||
    location.pathname.startsWith('/checkout/') ||
    location.pathname === '/finalizar-compra' ||
    location.pathname.startsWith('/finalizar-compra/');

  useEffect(() => {
    checkAuth();

    const {
      data: { subscription },
    } = authService.onAuthStateChange(() => {
      checkAuth();
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [checkAuth]);

  return (
    <div className={`app-container ${isCheckoutRoute ? 'app-container-checkout' : ''}`}>
      {!isCheckoutRoute && <Navbar />}
      <main className="main-content">
        <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/products" element={<ProductsPage />} />
            <Route path="/produtos" element={<ProductsPage />} />
            <Route path="/marcas" element={<ProductsPage />} />
            <Route path="/marcas/:brandSlug" element={<ProductsPage />} />
            <Route path="/product/:id" element={<ProductDetailPage />} />
            <Route
              path="/wishlist"
              element={
                <RequireAuth>
                  <WishlistPage />
                </RequireAuth>
              }
            />
            <Route
              path="/favoritos"
              element={
                <RequireAuth>
                  <WishlistPage />
                </RequireAuth>
              }
            />
            <Route
              path="/login"
              element={
                <RequireGuest>
                  <LoginPage />
                </RequireGuest>
              }
            />
            <Route
              path="/register"
              element={
                <RequireGuest>
                  <RegisterPage />
                </RequireGuest>
              }
            />
            <Route path="/cart" element={<CartPage />} />
            <Route path="/carrinho" element={<CartPage />} />
            <Route
              path="/checkout"
              element={
                <RequireAuth>
                  <CheckoutPage />
                </RequireAuth>
              }
            />
            <Route
              path="/finalizar-compra"
              element={
                <RequireAuth>
                  <CheckoutPage />
                </RequireAuth>
              }
            />
            <Route
              path="/account"
              element={
                <RequireAuth>
                  <AccountPage />
                </RequireAuth>
              }
            />
            <Route
              path="/minha-conta"
              element={
                <RequireAuth>
                  <AccountPage />
                </RequireAuth>
              }
            />
            <Route
              path="/orders"
              element={
                <RequireAuth>
                  <OrdersPage />
                </RequireAuth>
              }
            />
            <Route
              path="/pedidos"
              element={
                <RequireAuth>
                  <OrdersPage />
                </RequireAuth>
              }
            />
            <Route
              path="/dashboard"
              element={
                <RequireAdmin>
                  <DashboardPage />
                </RequireAdmin>
              }
            />
            <Route
              path="/admin"
              element={
                <RequireAdmin>
                  <DashboardPage />
                </RequireAdmin>
              }
            />

            <Route
              path="/about"
              element={
                <InfoPage
                  title="Sobre a Pneus Preçojusto"
                  description="Somos especialistas em pneus com foco em segurança, procedência e preço justo."
                />
              }
            />
            <Route
              path="/faq"
              element={
                <InfoPage
                  title="Dúvidas Frequentes"
                  description="Nesta seção você encontra respostas sobre medidas, instalação, frete, trocas e garantia."
                />
              }
            />
            <Route
              path="/shipping"
              element={
                <InfoPage
                  title="Política de Entrega"
                  description="Prazos e custos de entrega variam por CEP e são apresentados no checkout."
                />
              }
            />
            <Route
              path="/returns"
              element={
                <InfoPage
                  title="Trocas e Devoluções"
                  description="Trocas e devoluções seguem o Código de Defesa do Consumidor e políticas internas."
                />
              }
            />
            <Route
              path="/warranty"
              element={
                <InfoPage
                  title="Garantia dos Produtos"
                  description="Todos os pneus possuem garantia de fabricação conforme fabricante e legislação vigente."
                />
              }
            />
            <Route
              path="/privacy"
              element={
                <InfoPage
                  title="Política de Privacidade"
                  description="Tratamos dados pessoais com transparência e segurança conforme a LGPD."
                />
              }
            />
            <Route
              path="/terms"
              element={
                <InfoPage
                  title="Termos de Uso"
                  description="Os termos definem as regras de uso da plataforma, compra, cancelamento e responsabilidades."
                />
              }
            />
            <Route
              path="/cookies"
              element={
                <InfoPage
                  title="Política de Cookies"
                  description="Utilizamos cookies para melhorar navegação, segurança e métricas de uso."
                />
              }
            />
            <Route
              path="/forgot-password"
              element={
                <RequireGuest>
                  <ForgotPasswordPage />
                </RequireGuest>
              }
            />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      {!isCheckoutRoute && <Footer />}
      <Toaster position="top-right" richColors closeButton />
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <AppShell />
    </Router>
  );
}
