import { useEffect, useState, type CSSProperties } from 'react';
import { Navigate } from 'react-router-dom';
import {
  BarChart3,
  ShoppingCart,
  Users,
  Package,
  DollarSign,
  TrendingUp,
  Plus,
  Edit,
  Trash2,
  Save,
  X,
} from 'lucide-react';
import { useAuthStore } from '../stores/auth';
import { useProductsStore, type Product, type ProductInput } from '../stores/products';
import './DashboardPage.css';

function createEmptyProduct(): ProductInput {
  return {
    brand: '',
    model: '',
    width: '',
    profile: '',
    diameter: '',
    load_index: '',
    speed_rating: '',
    price: 0,
    old_price: undefined,
    stock: 0,
    image: '',
    features: [],
    category: 'passeio',
    season: 'all-season',
    runflat: false,
    featured: false,
    description: '',
  };
}

function normalizeProductPayload(input: ProductInput): ProductInput {
  return {
    ...input,
    brand: input.brand.trim(),
    model: input.model.trim(),
    width: input.width.trim(),
    profile: input.profile.trim(),
    diameter: input.diameter.trim(),
    load_index: input.load_index.trim(),
    speed_rating: input.speed_rating.trim(),
    image: input.image.trim() || 'https://images.unsplash.com/photo-1606937933187-6f42b29de806?w=400&h=400&fit=crop',
    features: (input.features || []).filter((feature) => feature.trim().length > 0),
    description: input.description?.trim() || '',
    old_price: input.old_price && input.old_price > 0 ? input.old_price : undefined,
    price: Number(input.price) || 0,
    stock: Number(input.stock) || 0,
  };
}

function productToInput(product: Product): ProductInput {
  return {
    brand: product.brand,
    model: product.model,
    width: product.width,
    profile: product.profile,
    diameter: product.diameter,
    load_index: product.load_index,
    speed_rating: product.speed_rating,
    price: product.price,
    old_price: product.old_price,
    stock: product.stock,
    image: product.image,
    features: product.features || [],
    category: product.category,
    season: product.season,
    runflat: product.runflat,
    featured: product.featured,
    description: product.description || '',
  };
}

export function DashboardPage() {
  const { profile, isAuthenticated } = useAuthStore();
  const {
    products,
    loading,
    fetchProducts,
    createProduct,
    updateProduct,
    deleteProduct,
  } = useProductsStore();

  const [showAddProduct, setShowAddProduct] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'products' | 'settings'>('overview');
  const [submitting, setSubmitting] = useState(false);

  const [newProduct, setNewProduct] = useState<ProductInput>(createEmptyProduct());
  const [featuresInput, setFeaturesInput] = useState('');

  useEffect(() => {
    void fetchProducts();
  }, [fetchProducts]);

  if (!isAuthenticated || profile?.role !== 'admin') {
    return <Navigate to="/" replace />;
  }

  const totalRevenue = products.reduce(
    (sum, product) => sum + product.price * Math.max(0, 100 - product.stock),
    0
  );
  const totalProducts = products.length;
  const lowStockProducts = products.filter((product) => product.stock < 10);
  const featuredProducts = products.filter((product) => product.featured).length;
  const totalCategories = new Set(products.map((product) => product.category)).size;

  const stats = [
    {
      icon: <DollarSign />,
      label: 'Receita Estimada',
      value: `R$ ${totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
      change: '+12%',
      color: '#FF6B35',
    },
    {
      icon: <Package />,
      label: 'Total de Produtos',
      value: totalProducts.toString(),
      change: `+${featuredProducts} destaque`,
      color: '#004E89',
    },
    {
      icon: <ShoppingCart />,
      label: 'Estoque Baixo',
      value: lowStockProducts.length.toString(),
      change: 'requer atencao',
      color: lowStockProducts.length > 0 ? '#F7B801' : '#00C853',
    },
    {
      icon: <Users />,
      label: 'Categorias',
      value: totalCategories.toString(),
      change: 'ativas',
      color: '#00C853',
    },
  ];

  const resetForm = () => {
    setNewProduct(createEmptyProduct());
    setFeaturesInput('');
  };

  const openEditModal = (product: Product) => {
    setEditingProduct(product);
  };

  const closeEditModal = () => {
    setEditingProduct(null);
  };

  const handleAddProduct = async () => {
    if (
      !newProduct.brand ||
      !newProduct.model ||
      !newProduct.width ||
      !newProduct.profile ||
      !newProduct.diameter ||
      !newProduct.load_index ||
      !newProduct.speed_rating ||
      !newProduct.price ||
      newProduct.stock < 0
    ) {
      alert('Preencha os campos obrigatorios do produto.');
      return;
    }

    const payload = normalizeProductPayload(newProduct);
    setSubmitting(true);
    const created = await createProduct(payload);
    setSubmitting(false);

    if (!created) {
      alert('Nao foi possivel adicionar o produto.');
      return;
    }

    setShowAddProduct(false);
    resetForm();
    alert('Produto adicionado com sucesso!');
  };

  const handleUpdateProduct = async () => {
    if (!editingProduct) return;

    const payload = normalizeProductPayload(productToInput(editingProduct));
    setSubmitting(true);
    const updated = await updateProduct(editingProduct.id, payload);
    setSubmitting(false);

    if (!updated) {
      alert('Nao foi possivel atualizar o produto.');
      return;
    }

    closeEditModal();
    alert('Produto atualizado com sucesso!');
  };

  const handleDeleteProduct = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este produto?')) {
      return;
    }

    setSubmitting(true);
    const success = await deleteProduct(id);
    setSubmitting(false);

    if (!success) {
      alert('Nao foi possivel excluir o produto.');
      return;
    }

    alert('Produto excluido com sucesso!');
  };

  return (
    <div className="dashboard-page">
      <div className="container">
        <div className="dashboard-header">
          <div>
            <h1>Painel Administrativo</h1>
            <p>Bem-vindo de volta, {profile?.name || 'Administrador'}!</p>
          </div>
        </div>

        <div className="dashboard-tabs">
          <button
            className={`tab ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            <BarChart3 size={20} />
            Visao Geral
          </button>
          <button
            className={`tab ${activeTab === 'products' ? 'active' : ''}`}
            onClick={() => setActiveTab('products')}
          >
            <Package size={20} />
            Produtos
          </button>
          <button
            className={`tab ${activeTab === 'settings' ? 'active' : ''}`}
            onClick={() => setActiveTab('settings')}
          >
            <Users size={20} />
            Configuracoes
          </button>
        </div>

        {activeTab === 'overview' && (
          <>
            <div className="stats-grid">
              {stats.map((stat, index) => (
                <div key={index} className="stat-card" style={{ '--stat-color': stat.color } as CSSProperties}>
                  <div className="stat-icon" style={{ background: `${stat.color}15`, color: stat.color }}>
                    {stat.icon}
                  </div>
                  <div className="stat-info">
                    <p className="stat-label">{stat.label}</p>
                    <h3 className="stat-value">{stat.value}</h3>
                    <div className="stat-change">
                      <TrendingUp size={16} />
                      <span>{stat.change}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="dashboard-content">
              <div className="content-section">
                <h2>Produtos com Estoque Baixo</h2>
                <div className="products-table">
                  <table>
                    <thead>
                      <tr>
                        <th>Produto</th>
                        <th>Medida</th>
                        <th>Estoque</th>
                        <th>Preco</th>
                      </tr>
                    </thead>
                    <tbody>
                      {lowStockProducts.slice(0, 5).map((product) => (
                        <tr key={product.id}>
                          <td>
                            <div className="product-cell">
                              <img src={product.image} alt={product.model} />
                              <div>
                                <strong>{product.brand}</strong>
                                <span>{product.model}</span>
                              </div>
                            </div>
                          </td>
                          <td>
                            {product.width}/{product.profile}R{product.diameter}
                          </td>
                          <td>
                            <span className={`stock-badge ${product.stock < 5 ? 'low' : 'medium'}`}>
                              {product.stock} unidades
                            </span>
                          </td>
                          <td>R$ {product.price.toFixed(2).replace('.', ',')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </>
        )}

        {activeTab === 'products' && (
          <div className="dashboard-content">
            <div className="content-header">
              <h2>Gerenciar Produtos</h2>
              <button className="btn btn-primary" onClick={() => setShowAddProduct(true)} disabled={submitting}>
                <Plus size={20} />
                Adicionar Produto
              </button>
            </div>

            {loading ? (
              <div className="bg-white rounded-lg shadow p-6">Carregando produtos...</div>
            ) : (
              <div className="products-table">
                <table>
                  <thead>
                    <tr>
                      <th>Produto</th>
                      <th>Medida</th>
                      <th>Categoria</th>
                      <th>Preco</th>
                      <th>Estoque</th>
                      <th>Acoes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {products.map((product) => (
                      <tr key={product.id}>
                        <td>
                          <div className="product-cell">
                            <img src={product.image} alt={product.model} />
                            <div>
                              <strong>{product.brand}</strong>
                              <span>{product.model}</span>
                            </div>
                          </div>
                        </td>
                        <td>
                          {product.width}/{product.profile}R{product.diameter}
                        </td>
                        <td>
                          <span className="category-badge">{product.category}</span>
                        </td>
                        <td>R$ {product.price.toFixed(2).replace('.', ',')}</td>
                        <td>
                          <span
                            className={`stock-badge ${
                              product.stock < 5 ? 'low' : product.stock < 10 ? 'medium' : 'high'
                            }`}
                          >
                            {product.stock}
                          </span>
                        </td>
                        <td>
                          <div className="action-buttons">
                            <button className="btn-icon edit" onClick={() => openEditModal(product)} title="Editar">
                              <Edit size={18} />
                            </button>
                            <button
                              className="btn-icon delete"
                              onClick={() => void handleDeleteProduct(product.id)}
                              title="Excluir"
                              disabled={submitting}
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="dashboard-content">
            <div className="settings-section">
              <h2>Configuracoes da Loja</h2>
              <div className="settings-form">
                <div className="form-group">
                  <label>Nome da Loja</label>
                  <input type="text" defaultValue="Pneus.PrecoJusto" className="input" />
                </div>
                <div className="form-group">
                  <label>CNPJ</label>
                  <input type="text" placeholder="00.000.000/0000-00" className="input" />
                </div>
                <div className="form-group">
                  <label>Telefone</label>
                  <input type="text" placeholder="(11) 99999-9999" className="input" />
                </div>
                <div className="form-group">
                  <label>E-mail</label>
                  <input type="email" defaultValue="contato@pneusprecojusto.com.br" className="input" />
                </div>
                <div className="form-group">
                  <label>Endereco</label>
                  <input type="text" placeholder="Rua, Numero - Bairro" className="input" />
                </div>
                <div className="form-group">
                  <label>Black Cat API Key</label>
                  <input type="password" placeholder="****************" className="input" />
                  <small>Configure sua chave da API Black Cat Payments</small>
                </div>
                <button className="btn btn-primary">
                  <Save size={20} />
                  Salvar Configuracoes
                </button>
              </div>
            </div>
          </div>
        )}

        {showAddProduct && (
          <div className="modal-overlay" onClick={() => setShowAddProduct(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2>Adicionar Novo Produto</h2>
                <button className="close-btn" onClick={() => setShowAddProduct(false)}>
                  <X size={24} />
                </button>
              </div>
              <div className="modal-body">
                <div className="form-grid">
                  <input
                    placeholder="Marca *"
                    value={newProduct.brand}
                    onChange={(e) => setNewProduct({ ...newProduct, brand: e.target.value })}
                    className="input"
                  />
                  <input
                    placeholder="Modelo *"
                    value={newProduct.model}
                    onChange={(e) => setNewProduct({ ...newProduct, model: e.target.value })}
                    className="input"
                  />
                  <input
                    placeholder="Largura *"
                    value={newProduct.width}
                    onChange={(e) => setNewProduct({ ...newProduct, width: e.target.value })}
                    className="input"
                  />
                  <input
                    placeholder="Perfil *"
                    value={newProduct.profile}
                    onChange={(e) => setNewProduct({ ...newProduct, profile: e.target.value })}
                    className="input"
                  />
                  <input
                    placeholder="Diametro (Aro) *"
                    value={newProduct.diameter}
                    onChange={(e) => setNewProduct({ ...newProduct, diameter: e.target.value })}
                    className="input"
                  />
                  <input
                    placeholder="Indice de Carga *"
                    value={newProduct.load_index}
                    onChange={(e) => setNewProduct({ ...newProduct, load_index: e.target.value })}
                    className="input"
                  />
                  <input
                    placeholder="Codigo de Velocidade *"
                    value={newProduct.speed_rating}
                    onChange={(e) => setNewProduct({ ...newProduct, speed_rating: e.target.value })}
                    className="input"
                  />
                  <input
                    type="number"
                    placeholder="Preco *"
                    value={newProduct.price || ''}
                    onChange={(e) => setNewProduct({ ...newProduct, price: Number(e.target.value) })}
                    className="input"
                  />
                  <input
                    type="number"
                    placeholder="Preco Antigo"
                    value={newProduct.old_price || ''}
                    onChange={(e) =>
                      setNewProduct({
                        ...newProduct,
                        old_price: e.target.value ? Number(e.target.value) : undefined,
                      })
                    }
                    className="input"
                  />
                  <input
                    type="number"
                    placeholder="Estoque *"
                    value={newProduct.stock || ''}
                    onChange={(e) => setNewProduct({ ...newProduct, stock: Number(e.target.value) })}
                    className="input"
                  />
                  <select
                    value={newProduct.category}
                    onChange={(e) => setNewProduct({ ...newProduct, category: e.target.value })}
                    className="input"
                  >
                    <option value="passeio">Passeio</option>
                    <option value="suv">SUV</option>
                    <option value="caminhonete">Caminhonete</option>
                    <option value="van">Van</option>
                    <option value="moto">Moto</option>
                  </select>
                  <select
                    value={newProduct.season}
                    onChange={(e) => setNewProduct({ ...newProduct, season: e.target.value })}
                    className="input"
                  >
                    <option value="all-season">All-Season</option>
                    <option value="summer">Verao</option>
                    <option value="winter">Inverno</option>
                  </select>
                  <input
                    placeholder="URL da Imagem"
                    value={newProduct.image}
                    onChange={(e) => setNewProduct({ ...newProduct, image: e.target.value })}
                    className="input span-2"
                  />
                  <input
                    placeholder="Caracteristicas separadas por virgula"
                    value={featuresInput}
                    onChange={(e) => {
                      setFeaturesInput(e.target.value);
                      setNewProduct({
                        ...newProduct,
                        features: e.target.value.split(',').map((value) => value.trim()),
                      });
                    }}
                    className="input span-2"
                  />
                  <textarea
                    placeholder="Descricao"
                    value={newProduct.description || ''}
                    onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })}
                    className="input span-2"
                  />
                  <label className="checkbox-label span-2">
                    <input
                      type="checkbox"
                      checked={newProduct.featured}
                      onChange={(e) => setNewProduct({ ...newProduct, featured: e.target.checked })}
                    />
                    Produto em Destaque
                  </label>
                  <label className="checkbox-label span-2">
                    <input
                      type="checkbox"
                      checked={newProduct.runflat}
                      onChange={(e) => setNewProduct({ ...newProduct, runflat: e.target.checked })}
                    />
                    Run Flat
                  </label>
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn btn-outline" onClick={() => setShowAddProduct(false)}>
                  Cancelar
                </button>
                <button className="btn btn-primary" onClick={() => void handleAddProduct()} disabled={submitting}>
                  <Plus size={20} />
                  {submitting ? 'Adicionando...' : 'Adicionar'}
                </button>
              </div>
            </div>
          </div>
        )}

        {editingProduct && (
          <div className="modal-overlay" onClick={closeEditModal}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2>Editar Produto</h2>
                <button className="close-btn" onClick={closeEditModal}>
                  <X size={24} />
                </button>
              </div>
              <div className="modal-body">
                <div className="form-grid">
                  <input
                    placeholder="Marca"
                    value={editingProduct.brand}
                    onChange={(e) => setEditingProduct({ ...editingProduct, brand: e.target.value })}
                    className="input"
                  />
                  <input
                    placeholder="Modelo"
                    value={editingProduct.model}
                    onChange={(e) => setEditingProduct({ ...editingProduct, model: e.target.value })}
                    className="input"
                  />
                  <input
                    type="number"
                    placeholder="Preco"
                    value={editingProduct.price}
                    onChange={(e) => setEditingProduct({ ...editingProduct, price: Number(e.target.value) })}
                    className="input"
                  />
                  <input
                    type="number"
                    placeholder="Estoque"
                    value={editingProduct.stock}
                    onChange={(e) => setEditingProduct({ ...editingProduct, stock: Number(e.target.value) })}
                    className="input"
                  />
                  <input
                    placeholder="URL da Imagem"
                    value={editingProduct.image}
                    onChange={(e) => setEditingProduct({ ...editingProduct, image: e.target.value })}
                    className="input span-2"
                  />
                  <label className="checkbox-label span-2">
                    <input
                      type="checkbox"
                      checked={editingProduct.featured}
                      onChange={(e) => setEditingProduct({ ...editingProduct, featured: e.target.checked })}
                    />
                    Produto em Destaque
                  </label>
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn btn-outline" onClick={closeEditModal}>
                  Cancelar
                </button>
                <button className="btn btn-primary" onClick={() => void handleUpdateProduct()} disabled={submitting}>
                  <Save size={20} />
                  {submitting ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
