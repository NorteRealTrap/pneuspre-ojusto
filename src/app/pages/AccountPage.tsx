import { Navigate, useNavigate } from 'react-router-dom';
import { User, Mail, Phone, MapPin, Package, Heart, Settings } from 'lucide-react';
import { useAuthStore } from '../stores/auth';
import './AccountPage.css';

export function AccountPage() {
  const navigate = useNavigate();
  const { user, profile, isAuthenticated } = useAuthStore();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  const menuItems = [
    { icon: <Package />, label: 'Meus Pedidos', path: '/orders' },
    { icon: <Heart />, label: 'Favoritos', path: '/wishlist' },
    { icon: <Settings />, label: 'Configuracoes', path: '/account' },
  ];

  return (
    <div className="account-page">
      <div className="container">
        <h1>Minha Conta</h1>

        <div className="account-content">
          <div className="account-card">
            <div className="account-header">
              <div className="avatar">
                <User size={48} />
              </div>
              <div>
                <h2>{profile?.name || 'Minha conta'}</h2>
                <p>{user?.email}</p>
              </div>
            </div>

            <div className="account-info">
              <div className="info-item">
                <Mail size={20} />
                <div>
                  <label>Email</label>
                  <p>{user?.email}</p>
                </div>
              </div>

              <div className="info-item">
                <Phone size={20} />
                <div>
                  <label>Telefone</label>
                  <p>{profile?.phone || 'Nao informado'}</p>
                </div>
              </div>

              <div className="info-item">
                <MapPin size={20} />
                <div>
                  <label>Endereco</label>
                  <p>{profile?.address ? 'Cadastrado' : 'Nao informado'}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="account-menu">
            {menuItems.map((item, index) => (
              <button key={index} onClick={() => navigate(item.path)} className="menu-item">
                {item.icon}
                <span>{item.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
