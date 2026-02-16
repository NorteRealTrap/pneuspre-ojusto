import { Navigate, useLocation } from 'react-router-dom';

const EXACT_REDIRECTS: Record<string, string> = {
  '/produtos': '/products',
  '/quem-somos': '/about',
  '/seguranca': '/security',
  '/frete-e-entrega': '/shipping',
  '/pagamento': '/payment',
  '/depoimentos-de-clientes': '/testimonials',
  '/politica-de-troca-e-devolucao': '/returns',
  '/politica-de-reembolso': '/refunds',
  '/politica-de-garantia': '/warranty',
  '/politica-de-privacidade': '/privacy',
  '/contato': '/contact',
  '/my-account/login': '/login',
  '/cadastro': '/register',
  '/meus-pedidos': '/orders',
  '/central-do-cliente': '/account',
  '/loja/central_anteriores.php': '/orders',
  '/loja/central_dados.php': '/account',
  '/loja/redirect_cart_service.php': '/cart',
  '/loja/logout.php': '/login',
  '/finalizar-compra': '/checkout',
  '/kit-de-pneus': '/products?search=kit',
  '/passageiros': '/products?category=passeio',
  '/marcas': '/products',
  '/caminhonete-e-suv': '/products?category=suv',
  '/caminhonete-e-suv/caminhonete': '/products?category=caminhonete',
  '/caminhonete-e-suv/suv': '/products?category=suv',
  '/van-e-utilitario': '/products?category=van',
  '/moto': '/products?category=moto',
  '/pneu-urbano': '/products?category=moto&search=urbano',
  '/pneu-off-road': '/products?category=moto&search=off-road',
  '/pneu-trail': '/products?category=moto&search=trail',
  '/moto/valvula': '/products?category=moto&search=valvula',
  '/caminhao-e-onibus': '/products?category=caminhao,onibus',
  '/agricola-e-otr': '/products?category=agricola,otr',
  '/agricola-e-otr/agricola': '/products?category=agricola',
  '/agricola-e-otr/otr': '/products?category=otr',
  '/shampoo-automotivo': '/products?search=shampoo',
  '/camaras-de-ar': '/products?search=camara',
};

const UPPERCASE_WORDS = new Set(['xbri', 'otr', 'suv', 'ira', 'mt', 'ht', 'at']);

function normalizePathname(pathname: string) {
  const normalized = pathname.trim().replace(/\/{2,}/g, '/');
  if (!normalized || normalized === '/') return '/';
  return normalized.endsWith('/') ? normalized.slice(0, -1) : normalized;
}

function slugToLabel(slug: string) {
  return decodeURIComponent(slug)
    .replace(/\+/g, ' ')
    .replace(/-/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => {
      const normalized = word.toLowerCase();
      if (UPPERCASE_WORDS.has(normalized)) return normalized.toUpperCase();
      return normalized.charAt(0).toUpperCase() + normalized.slice(1);
    })
    .join(' ');
}

function toSearchTerm(pathname: string) {
  const segments = pathname.split('/').filter(Boolean);
  const joined = segments.join(' ');
  const withoutPrefix = joined
    .replace(/\b(pneu|pneus|kit|camara|camaras|aro|de|para|com)\b/gi, ' ')
    .replace(/[-_/]+/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
  return withoutPrefix || joined.replace(/[-_/]+/g, ' ').trim();
}

function resolveLegacyPath(pathname: string, search = '') {
  const normalized = normalizePathname(pathname);

  if (normalized === '/loja/busca.php' || normalized === '/busca') {
    const query = new URLSearchParams(search);
    const rawSearch = query.get('palavra_busca') || query.get('search') || query.get('palavra') || '';
    const normalizedSearch = rawSearch.trim();
    if (normalizedSearch) {
      return `/products?search=${encodeURIComponent(normalizedSearch)}`;
    }
    return '/products';
  }

  if (normalized === '/loja/produto.php') {
    const query = new URLSearchParams(search);
    const rawReference = query.get('id') || query.get('IdProd') || query.get('produto') || '';
    if (rawReference.trim()) {
      return `/products?search=${encodeURIComponent(rawReference.trim())}`;
    }
    return '/products';
  }

  if (normalized.startsWith('/product/')) {
    const productId = normalized.split('/')[2];
    if (productId) {
      return `/product/${productId}`;
    }
  }

  const exact = EXACT_REDIRECTS[normalized];
  if (exact) return exact;

  if (normalized.startsWith('/marcas/')) {
    const brandSlug = normalized.split('/')[2] || '';
    const brandName = slugToLabel(brandSlug);
    return brandName ? `/products?brand=${encodeURIComponent(brandName)}` : '/products';
  }

  if (normalized.startsWith('/marcas-')) {
    const brandName = slugToLabel(normalized.replace('/marcas-', ''));
    return brandName ? `/products?brand=${encodeURIComponent(brandName)}` : '/products';
  }

  if (normalized.startsWith('/camaras-de-ar/')) {
    const segment = normalized.split('/').slice(1).join(' ');
    const search = toSearchTerm(segment);
    return `/products?search=${encodeURIComponent(`camara ${search}`.trim())}`;
  }

  if (normalized.startsWith('/pneu-') || normalized.includes('/pneu-') || normalized.startsWith('/kit-')) {
    return `/products?search=${encodeURIComponent(toSearchTerm(normalized))}`;
  }

  const maybeProductPath = normalized
    .split('/')
    .filter(Boolean)
    .some((segment) => /\d/.test(segment) || segment.includes('r15') || segment.includes('r16'));
  if (maybeProductPath) {
    return `/products?search=${encodeURIComponent(toSearchTerm(normalized))}`;
  }

  return '/';
}

export function LegacyRouteRedirect() {
  const location = useLocation();
  const target = resolveLegacyPath(location.pathname, location.search);

  if (!location.search || target.includes('?')) {
    return <Navigate to={target} replace />;
  }

  return <Navigate to={`${target}${location.search}`} replace />;
}
