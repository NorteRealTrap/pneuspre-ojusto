import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { LegacyRouteRedirect } from './components/LegacyRouteRedirect';
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

export default function App() {
  const checkAuth = useAuthStore((state) => state.checkAuth);

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
    <Router>
      <div className="app-container">
        <Navbar />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<HomePage />} />

            <Route path="/products" element={<ProductsPage />} />
            <Route path="/produtos" element={<Navigate to="/products" replace />} />
            <Route path="/product/:id" element={<ProductDetailPage />} />

            <Route path="/marcas" element={<Navigate to="/products" replace />} />
            <Route path="/marcas/:brandSlug" element={<LegacyRouteRedirect />} />
            <Route path="/marcas-:brandSlug" element={<LegacyRouteRedirect />} />
            <Route path="/kit-de-pneus" element={<Navigate to="/products?search=kit" replace />} />
            <Route path="/pneu-:legacySlug" element={<LegacyRouteRedirect />} />
            <Route path="/kit-:legacySlug" element={<LegacyRouteRedirect />} />
            <Route path="/caminhonete-e-suv/*" element={<LegacyRouteRedirect />} />
            <Route path="/van-e-utilitario" element={<Navigate to="/products?category=van" replace />} />
            <Route path="/moto/*" element={<LegacyRouteRedirect />} />
            <Route path="/caminhao-e-onibus" element={<Navigate to="/products?search=caminhao" replace />} />
            <Route path="/agricola-e-otr/*" element={<LegacyRouteRedirect />} />
            <Route path="/shampoo-automotivo" element={<Navigate to="/products?search=shampoo" replace />} />
            <Route path="/camaras-de-ar/*" element={<LegacyRouteRedirect />} />

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
            <Route path="/my-account/login" element={<Navigate to="/login" replace />} />
            <Route
              path="/register"
              element={
                <RequireGuest>
                  <RegisterPage />
                </RequireGuest>
              }
            />
            <Route path="/cadastro" element={<Navigate to="/register" replace />} />
            <Route path="/cart" element={<CartPage />} />
            <Route path="/carrinho" element={<CartPage />} />
            <Route path="/loja/redirect_cart_service.php" element={<Navigate to="/cart" replace />} />
            <Route
              path="/checkout"
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
            <Route path="/central-do-cliente" element={<Navigate to="/account" replace />} />
            <Route path="/loja/central_dados.php" element={<Navigate to="/account" replace />} />
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
            <Route path="/loja/central_anteriores.php" element={<Navigate to="/orders" replace />} />
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
                  title="Quem Somos"
                  description="A PneuGreen e especializada em pneus para carro, SUV, caminhonete, moto e linha pesada com atendimento consultivo e entrega para todo o Brasil."
                />
              }
            />
            <Route path="/quem-somos" element={<Navigate to="/about" replace />} />
            <Route
              path="/security"
              element={
                <InfoPage
                  title="Seguranca"
                  description="Seu pedido e processado em ambiente seguro, com protecao de dados, pagamentos rastreaveis e politicas de validacao antifraude."
                />
              }
            />
            <Route path="/seguranca" element={<Navigate to="/security" replace />} />
            <Route
              path="/shipping"
              element={
                <InfoPage
                  title="Frete e Entrega"
                  description="Prazos e custos variam conforme o CEP e disponibilidade de estoque. O prazo estimado e exibido antes da finalizacao da compra."
                />
              }
            />
            <Route path="/frete-e-entrega" element={<Navigate to="/shipping" replace />} />
            <Route
              path="/payment"
              element={
                <InfoPage
                  title="Pagamento"
                  description="Aceitamos cartao de credito, PIX e boleto, com condicoes comerciais conforme campanha vigente."
                />
              }
            />
            <Route path="/pagamento" element={<Navigate to="/payment" replace />} />
            <Route
              path="/testimonials"
              element={
                <InfoPage
                  title="Depoimentos de Clientes"
                  description="Avaliacoes reais de clientes sobre experiencia de compra, atendimento e prazo de entrega."
                />
              }
            />
            <Route path="/depoimentos-de-clientes" element={<Navigate to="/testimonials" replace />} />
            <Route
              path="/returns"
              element={
                <InfoPage
                  title="Politica de Troca e Devolucao"
                  description="Trocas e devolucoes seguem o Codigo de Defesa do Consumidor e os criterios de analise de produto e prazo."
                />
              }
            />
            <Route path="/politica-de-troca-e-devolucao" element={<Navigate to="/returns" replace />} />
            <Route
              path="/refunds"
              element={
                <InfoPage
                  title="Politica de Reembolso"
                  description="Reembolsos sao processados conforme a forma de pagamento e o status da devolucao aprovada."
                />
              }
            />
            <Route path="/politica-de-reembolso" element={<Navigate to="/refunds" replace />} />
            <Route
              path="/warranty"
              element={
                <InfoPage
                  title="Politica de Garantia"
                  description="Todos os pneus possuem garantia de fabricacao conforme fabricante, lote e regras tecnicas aplicaveis."
                />
              }
            />
            <Route path="/politica-de-garantia" element={<Navigate to="/warranty" replace />} />
            <Route
              path="/privacy"
              element={
                <InfoPage
                  title="Politica de Privacidade"
                  description="Tratamos dados pessoais com transparencia e seguranca, em conformidade com a LGPD."
                />
              }
            />
            <Route path="/politica-de-privacidade" element={<Navigate to="/privacy" replace />} />
            <Route
              path="/terms"
              element={
                <InfoPage
                  title="Termos de Uso"
                  description="Os termos definem regras de navegacao, compras, cancelamentos, responsabilidades e limites de uso da plataforma."
                />
              }
            />
            <Route
              path="/cookies"
              element={
                <InfoPage
                  title="Politica de Cookies"
                  description="Utilizamos cookies para melhorar navegacao, seguranca e mensuracao de desempenho."
                />
              }
            />
            <Route
              path="/contact"
              element={
                <InfoPage
                  title="Contato"
                  description="Para atendimento comercial e suporte, fale com nossa equipe por WhatsApp, telefone ou e-mail."
                />
              }
            />
            <Route path="/contato" element={<Navigate to="/contact" replace />} />
            <Route
              path="/forgot-password"
              element={
                <RequireGuest>
                  <ForgotPasswordPage />
                </RequireGuest>
              }
            />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="*" element={<LegacyRouteRedirect />} />
          </Routes>
        </main>
        <Footer />
        <Toaster position="top-right" richColors closeButton />
      </div>
    </Router>
  );
}
