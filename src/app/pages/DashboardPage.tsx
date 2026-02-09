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
  Palette,
  Type,
  LayoutDashboard,
  Image as ImageIcon,
  Sparkles,
  Link2,
  Library,
} from 'lucide-react';
import { useAuthStore } from '../stores/auth';
import { useProductsStore, type Product, type ProductInput } from '../stores/products';
import { useSiteConfigStore, type SiteConfig } from '../stores/siteConfig';
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

  const { config: siteConfig, updateConfig, resetConfig } = useSiteConfigStore();
  const [featureDraft, setFeatureDraft] = useState({ icon: 'Star', title: '', description: '' });

  const fontOptions = ['Inter', 'Poppins', 'Montserrat', 'Space Grotesk', 'Roboto Slab', 'Playfair Display'];
  const layoutOptions: Array<{ value: SiteConfig['layoutStyle']; label: string; helper: string }> = [
    { value: 'classic', label: 'Clássico', helper: 'Hero com fundo sólido e texto alinhado' },
    { value: 'split', label: 'Split', helper: 'Imagem à direita e texto à esquerda' },
    { value: 'immersive', label: 'Imersivo', helper: 'Hero com fundo em tela cheia' },
  ];
  const galleryOptions: Array<{ value: SiteConfig['galleryLayout']; label: string; helper: string }> = [
    { value: 'grid', label: 'Grade', helper: 'Cards alinhados, foco em conversão' },
    { value: 'masonry', label: 'Masonry', helper: 'Layout dinâmico usando biblioteca responsiva' },
    { value: 'carousel', label: 'Carrossel', helper: 'Slider moderno para vitrines hero' },
  ];
  const cardStyles: Array<{ value: SiteConfig['productCardStyle']; label: string; helper: string }> = [
    { value: 'solid', label: 'Sólido', helper: 'Cartões com fundo branco e bordas' },
    { value: 'glass', label: 'Glassmorphism', helper: 'Cartões translúcidos com blur leve' },
    { value: 'outline', label: 'Outline', helper: 'Bordas finas e foco na tipografia' },
  ];

  const handleConfigChange = <K extends keyof SiteConfig>(key: K, value: SiteConfig[K]) => {
    updateConfig({ [key]: value });
  };

  const handleFeatureChange = (index: number, field: 'icon' | 'title' | 'description', value: string) => {
    const updated = [...siteConfig.features];
    updated[index] = { ...updated[index], [field]: value };
    updateConfig({ features: updated });
  };

  const addFeature = () => {
    if (!featureDraft.title.trim()) return;
    updateConfig({ features: [...siteConfig.features, { ...featureDraft }] });
    setFeatureDraft({ icon: 'Star', title: '', description: '' });
  };

  const removeFeature = (index: number) => {
    const updated = [...siteConfig.features];
    updated.splice(index, 1);
    updateConfig({ features: updated });
  };

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
          <div className="dashboard-content settings-grid">
            <div className="settings-section">
              <div className="section-header">
                <div className="section-title">
                  <Palette size={20} />
                  <div>
                    <h2>Identidade e Marca</h2>
                    <p>Logo, tipografia e dados principais da vitrine.</p>
                  </div>
                </div>
                <button className="btn btn-outline" onClick={resetConfig}>
                  <Sparkles size={18} />
                  Restaurar padrão
                </button>
              </div>
              <div className="settings-form two-col">
                <div className="form-group">
                  <label>Nome da Loja</label>
                  <input
                    type="text"
                    value={siteConfig.storeName}
                    onChange={(e) => handleConfigChange('storeName', e.target.value)}
                    className="input"
                  />
                </div>
                <div className="form-group">
                  <label>Slogan</label>
                  <input
                    type="text"
                    value={siteConfig.storeSlogan}
                    onChange={(e) => handleConfigChange('storeSlogan', e.target.value)}
                    className="input"
                  />
                </div>
                <div className="form-group span-2">
                  <label>Descrição curta</label>
                  <textarea
                    value={siteConfig.storeDescription}
                    onChange={(e) => handleConfigChange('storeDescription', e.target.value)}
                    className="input"
                  />
                </div>
                <div className="form-group">
                  <label>Telefone</label>
                  <input
                    type="text"
                    value={siteConfig.phone}
                    onChange={(e) => handleConfigChange('phone', e.target.value)}
                    className="input"
                  />
                </div>
                <div className="form-group">
                  <label>E-mail</label>
                  <input
                    type="email"
                    value={siteConfig.email}
                    onChange={(e) => handleConfigChange('email', e.target.value)}
                    className="input"
                  />
                </div>
                <div className="form-group">
                  <label>WhatsApp</label>
                  <input
                    type="text"
                    value={siteConfig.whatsapp}
                    onChange={(e) => handleConfigChange('whatsapp', e.target.value)}
                    className="input"
                  />
                </div>
                <div className="form-group">
                  <label>Endereço</label>
                  <input
                    type="text"
                    value={siteConfig.address}
                    onChange={(e) => handleConfigChange('address', e.target.value)}
                    className="input"
                  />
                </div>
              </div>
            </div>

            <div className="settings-section">
              <div className="section-header">
                <div className="section-title">
                  <Type size={20} />
                  <div>
                    <h3>Tipografia e Paleta</h3>
                    <p>Edite fontes, cores e estilo dos cartões.</p>
                  </div>
                </div>
              </div>
              <div className="pill-grid">
                {fontOptions.map((font) => (
                  <button
                    key={font}
                    className={pill }
                    onClick={() => handleConfigChange('primaryFont', font)}
                  >
                    {font}
                  </button>
                ))}
              </div>
              <div className="two-col colors-row">
                <div className="form-group">
                  <label>Cor primária</label>
                  <div className="color-input">
                    <input
                      type="color"
                      value={siteConfig.primaryColor}
                      onChange={(e) => handleConfigChange('primaryColor', e.target.value)}
                    />
                    <input
                      className="input"
                      value={siteConfig.primaryColor}
                      onChange={(e) => handleConfigChange('primaryColor', e.target.value)}
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label>Cor secundária</label>
                  <div className="color-input">
                    <input
                      type="color"
                      value={siteConfig.secondaryColor}
                      onChange={(e) => handleConfigChange('secondaryColor', e.target.value)}
                    />
                    <input
                      className="input"
                      value={siteConfig.secondaryColor}
                      onChange={(e) => handleConfigChange('secondaryColor', e.target.value)}
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label>Cor de destaque</label>
                  <div className="color-input">
                    <input
                      type="color"
                      value={siteConfig.accentColor}
                      onChange={(e) => handleConfigChange('accentColor', e.target.value)}
                    />
                    <input
                      className="input"
                      value={siteConfig.accentColor}
                      onChange={(e) => handleConfigChange('accentColor', e.target.value)}
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label>Plano de fundo escuro</label>
                  <div className="color-input">
                    <input
                      type="color"
                      value={siteConfig.darkBg}
                      onChange={(e) => handleConfigChange('darkBg', e.target.value)}
                    />
                    <input
                      className="input"
                      value={siteConfig.darkBg}
                      onChange={(e) => handleConfigChange('darkBg', e.target.value)}
                    />
                  </div>
                </div>
              </div>
              <div className="pill-grid">
                {cardStyles.map((option) => (
                  <button
                    key={option.value}
                    className={pill }
                    onClick={() => handleConfigChange('productCardStyle', option.value)}
                  >
                    {option.label}
                    <small>{option.helper}</small>
                  </button>
                ))}
              </div>
            </div>

            <div className="settings-section">
              <div className="section-header">
                <div className="section-title">
                  <LayoutDashboard size={20} />
                  <div>
                    <h3>Layout, Hero e Galerias</h3>
                    <p>Controle de posicionamento, mídias e bibliotecas modernas.</p>
                  </div>
                </div>
              </div>
              <div className="pill-grid">
                {layoutOptions.map((option) => (
                  <button
                    key={option.value}
                    className={pill }
                    onClick={() => handleConfigChange('layoutStyle', option.value)}
                  >
                    {option.label}
                    <small>{option.helper}</small>
                  </button>
                ))}
              </div>
              <div className="pill-grid">
                {galleryOptions.map((option) => (
                  <button
                    key={option.value}
                    className={pill }
                    onClick={() => handleConfigChange('galleryLayout', option.value)}
                  >
                    {option.label}
                    <small>{option.helper}</small>
                  </button>
                ))}
              </div>
              <div className="settings-form two-col">
                <div className="form-group">
                  <label>Título do hero</label>
                  <input
                    className="input"
                    value={siteConfig.heroTitle}
                    onChange={(e) => handleConfigChange('heroTitle', e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>Chamada do hero</label>
                  <input
                    className="input"
                    value={siteConfig.heroSubtitle}
                    onChange={(e) => handleConfigChange('heroSubtitle', e.target.value)}
                  />
                </div>
                <div className="form-group span-2">
                  <label>Descrição de abertura</label>
                  <textarea
                    className="input"
                    value={siteConfig.heroDescription}
                    onChange={(e) => handleConfigChange('heroDescription', e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>Imagem principal (URL)</label>
                  <input
                    className="input"
                    value={siteConfig.heroImage}
                    onChange={(e) => handleConfigChange('heroImage', e.target.value)}
                  />
                  <small className="input-hint">Cole links web (CDN, Unsplash, drive público).</small>
                </div>
                <div className="form-group">
                  <label>Banner promocional (URL)</label>
                  <input
                    className="input"
                    value={siteConfig.bannerImage}
                    onChange={(e) => handleConfigChange('bannerImage', e.target.value)}
                  />
                  <small className="input-hint">Aceita GIF/PNG/JPG hospedados.</small>
                </div>
              </div>
            </div>

            <div className="settings-section">
              <div className="section-header">
                <div className="section-title">
                  <ImageIcon size={20} />
                  <div>
                    <h3>Galerias, Destaques e CTA</h3>
                    <p>Textos, legendas e ação principal do site.</p>
                  </div>
                </div>
              </div>
              <div className="settings-form two-col">
                <div className="form-group span-2">
                  <label>Badge / Selo</label>
                  <input
                    className="input"
                    value={siteConfig.heroBadge}
                    onChange={(e) => handleConfigChange('heroBadge', e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>Título da galeria</label>
                  <input
                    className="input"
                    value={siteConfig.galleryTitle}
                    onChange={(e) => handleConfigChange('galleryTitle', e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>Descrição da galeria</label>
                  <input
                    className="input"
                    value={siteConfig.galleryDescription}
                    onChange={(e) => handleConfigChange('galleryDescription', e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>Título da CTA</label>
                  <input
                    className="input"
                    value={siteConfig.ctaTitle}
                    onChange={(e) => handleConfigChange('ctaTitle', e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>Descrição da CTA</label>
                  <textarea
                    className="input"
                    value={siteConfig.ctaDescription}
                    onChange={(e) => handleConfigChange('ctaDescription', e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>Texto do botão</label>
                  <input
                    className="input"
                    value={siteConfig.ctaButtonText}
                    onChange={(e) => handleConfigChange('ctaButtonText', e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>Estilo do botão</label>
                  <select
                    className="input"
                    value={siteConfig.ctaVariant}
                    onChange={(e) => handleConfigChange('ctaVariant', e.target.value as SiteConfig['ctaVariant'])}
                  >
                    <option value="solid">Sólido</option>
                    <option value="outline">Outline</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="settings-section">
              <div className="section-header">
                <div className="section-title">
                  <Library size={20} />
                  <div>
                    <h3>SEO, Inteligência e Bibliotecas</h3>
                    <p>Metadados, recomendações automáticas e permissões de imagens externas.</p>
                  </div>
                </div>
              </div>
              <div className="settings-form two-col">
                <div className="form-group">
                  <label>Título SEO</label>
                  <input
                    className="input"
                    value={siteConfig.metaTitle}
                    onChange={(e) => handleConfigChange('metaTitle', e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>Descrição SEO</label>
                  <textarea
                    className="input"
                    value={siteConfig.metaDescription}
                    onChange={(e) => handleConfigChange('metaDescription', e.target.value)}
                  />
                </div>
                <div className="form-group span-2">
                  <label>Palavras-chave</label>
                  <input
                    className="input"
                    value={siteConfig.metaKeywords}
                    onChange={(e) => handleConfigChange('metaKeywords', e.target.value)}
                  />
                </div>
                <label className="checkbox-label span-2">
                  <input
                    type="checkbox"
                    checked={siteConfig.smartRecommendations}
                    onChange={() => handleConfigChange('smartRecommendations', !siteConfig.smartRecommendations)}
                  />
                  <Sparkles size={16} /> Ativar sugestões inteligentes (layout + destaques)
                </label>
                <label className="checkbox-label span-2">
                  <input
                    type="checkbox"
                    checked={siteConfig.autoFeatureLowStock}
                    onChange={() => handleConfigChange('autoFeatureLowStock', !siteConfig.autoFeatureLowStock)}
                  />
                  <LayoutDashboard size={16} /> Destacar automaticamente produtos com estoque crítico
                </label>
                <label className="checkbox-label span-2">
                  <input
                    type="checkbox"
                    checked={siteConfig.allowExternalImageLinks}
                    onChange={() => handleConfigChange('allowExternalImageLinks', !siteConfig.allowExternalImageLinks)}
                  />
                  <Link2 size={16} /> Permitir imagens por link externo (CDN)
                </label>
              </div>
            </div>

            <div className="settings-section">
              <div className="section-header">
                <div className="section-title">
                  <Sparkles size={20} />
                  <div>
                    <h3>Blocos de destaque (feature grid)</h3>
                    <p>Edite cartões informativos que aparecem no hero e rodapé.</p>
                  </div>
                </div>
              </div>
              <div className="feature-list">
                {siteConfig.features.map((feature, index) => (
                  <div key={feature.title + "-" + index} className="feature-card">
                    <div className="form-group">
                      <label>Ícone (lucide)</label>
                      <input
                        className="input"
                        value={feature.icon}
                        onChange={(e) => handleFeatureChange(index, 'icon', e.target.value)}
                      />
                    </div>
                    <div className="form-group">
                      <label>Título</label>
                      <input
                        className="input"
                        value={feature.title}
                        onChange={(e) => handleFeatureChange(index, 'title', e.target.value)}
                      />
                    </div>
                    <div className="form-group">
                      <label>Descrição</label>
                      <input
                        className="input"
                        value={feature.description}
                        onChange={(e) => handleFeatureChange(index, 'description', e.target.value)}
                      />
                    </div>
                    <button className="btn btn-outline danger" onClick={() => removeFeature(index)}>
                      <Trash2 size={16} /> Remover
                    </button>
                  </div>
                ))}
              </div>
              <div className="feature-add">
                <input
                  className="input"
                  placeholder="Ícone (ex: Shield)"
                  value={featureDraft.icon}
                  onChange={(e) => setFeatureDraft({ ...featureDraft, icon: e.target.value })}
                />
                <input
                  className="input"
                  placeholder="Título"
                  value={featureDraft.title}
                  onChange={(e) => setFeatureDraft({ ...featureDraft, title: e.target.value })}
                />
                <input
                  className="input"
                  placeholder="Descrição"
                  value={featureDraft.description}
                  onChange={(e) => setFeatureDraft({ ...featureDraft, description: e.target.value })}
                />
                <button className="btn btn-primary" onClick={addFeature}>
                  <Plus size={16} /> Adicionar bloco
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
                  <div className="span-2 image-input-group">
                    <input
                      placeholder="URL da Imagem"
                      value={newProduct.image}
                      onChange={(e) => setNewProduct({ ...newProduct, image: e.target.value })}
                      className="input"
                    />
                    <small className="input-hint">
                      Cole um link público (https://...) para usar imagens hospedadas na web.
                      {siteConfig.allowExternalImageLinks
                        ? ' Links externos habilitados no painel.'
                        : ' Ative permissões em Configurações > SEO e Inteligência.'}
                    </small>
                    {newProduct.image && (
                      <div className="image-preview">
                        <img
                          src={newProduct.image}
                          alt={newProduct.model || 'Pré-visualização do produto'}
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      </div>
                    )}
                  </div>
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
                  <div className="span-2 image-input-group">
                    <input
                      placeholder="URL da Imagem"
                      value={editingProduct.image}
                      onChange={(e) => setEditingProduct({ ...editingProduct, image: e.target.value })}
                      className="input"
                    />
                    <small className="input-hint">Cole um link público (https://) ou CDN segura.</small>
                    {editingProduct.image && (
                      <div className="image-preview">
                        <img
                          src={editingProduct.image}
                          alt={editingProduct.model}
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      </div>
                    )}
                  </div>
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
