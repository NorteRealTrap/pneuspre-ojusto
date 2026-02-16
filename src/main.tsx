import { createRoot } from 'react-dom/client';
import './styles/index.css';
import { AppErrorBoundary } from './app/components/AppErrorBoundary';

const persistedStoreKeys = [
  'cart-storage',
  'wishlist-storage',
  'notifications-storage',
  'site-config-storage-v2',
  'tire-storage',
];

function sanitizePersistedStorages() {
  if (typeof window === 'undefined') return;

  for (const key of persistedStoreKeys) {
    try {
      const rawValue = window.localStorage.getItem(key);
      if (!rawValue) continue;
      JSON.parse(rawValue);
    } catch {
      try {
        window.localStorage.removeItem(key);
      } catch {
        // Ignore remove failures.
      }
    }
  }
}

function clearPersistedStorages() {
  if (typeof window === 'undefined') return;

  for (const key of persistedStoreKeys) {
    try {
      window.localStorage.removeItem(key);
    } catch {
      // Ignore remove failures.
    }
  }
}

function renderBootstrapFallback(reason: string) {
  const rootElement = document.getElementById('root');
  if (!rootElement) return;

  const section = document.createElement('section');
  section.style.cssText =
    'min-height:100vh;display:grid;place-items:center;padding:1rem;background:#f3f4f6;color:#111827;font-family:Inter,sans-serif;';

  const card = document.createElement('div');
  card.style.cssText =
    'width:100%;max-width:640px;background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:1.2rem;box-shadow:0 10px 30px rgba(0,0,0,.08);';

  const title = document.createElement('h1');
  title.style.cssText = 'margin:0;font-size:1.2rem;';
  title.textContent = 'Falha ao iniciar o site';

  const message = document.createElement('p');
  message.style.cssText = 'margin:.8rem 0 0;';
  message.textContent = 'O carregamento foi interrompido para evitar tela em branco.';

  const reasonText = document.createElement('p');
  reasonText.style.cssText =
    'margin:.8rem 0 0;color:#4b5563;font-family:ui-monospace,Menlo,monospace;font-size:.82rem;word-break:break-word;';
  reasonText.textContent = reason;

  const actions = document.createElement('div');
  actions.style.cssText = 'display:flex;gap:.5rem;flex-wrap:wrap;margin-top:1rem;';

  const reloadButton = document.createElement('button');
  reloadButton.type = 'button';
  reloadButton.style.cssText =
    'border:0;border-radius:8px;padding:.6rem .9rem;background:#111827;color:#fff;cursor:pointer;font-weight:700;';
  reloadButton.textContent = 'Recarregar';
  reloadButton.addEventListener('click', () => window.location.reload());

  const clearButton = document.createElement('button');
  clearButton.type = 'button';
  clearButton.style.cssText =
    'border:1px solid #111827;border-radius:8px;padding:.6rem .9rem;background:#fff;color:#111827;cursor:pointer;font-weight:700;';
  clearButton.textContent = 'Limpar dados locais e recarregar';
  clearButton.addEventListener('click', () => {
    clearPersistedStorages();
    window.location.reload();
  });

  actions.appendChild(reloadButton);
  actions.appendChild(clearButton);
  card.appendChild(title);
  card.appendChild(message);
  card.appendChild(reasonText);
  card.appendChild(actions);
  section.appendChild(card);
  rootElement.replaceChildren(section);
}

function handleGlobalRuntimeError(error: unknown) {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === 'string'
      ? error
      : 'Erro de runtime inesperado';

  if (message.toLowerCase().includes('resizeobserver loop limit exceeded')) {
    return;
  }

  const rootElement = document.getElementById('root');
  if (!rootElement || rootElement.childElementCount > 0) {
    return;
  }

  renderBootstrapFallback(message);
}

window.addEventListener('error', (event) => {
  handleGlobalRuntimeError(event.error || event.message);
});

window.addEventListener('unhandledrejection', (event) => {
  handleGlobalRuntimeError(event.reason);
});

async function bootstrapApplication() {
  sanitizePersistedStorages();

  const rootElement = document.getElementById('root');
  if (!rootElement) return;

  try {
    const { default: App } = await import('./app/App.tsx');
    createRoot(rootElement).render(
      <AppErrorBoundary>
        <App />
      </AppErrorBoundary>
    );
  } catch (error) {
    const reason =
      error instanceof Error
        ? error.message
        : typeof error === 'string'
        ? error
        : 'Falha desconhecida ao iniciar';
    console.error('Falha no bootstrap da aplicacao:', error);
    renderBootstrapFallback(reason);
  }
}

void bootstrapApplication();
