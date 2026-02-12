import { defineConfig, loadEnv } from 'vite'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'

const normalizeUrl = (value: string) => value.replace(/\/+$/, '')

const getApiProxyTarget = (mode: string) => {
  const env = loadEnv(mode, process.cwd(), '')
  const explicitProxyTarget = String(env.VITE_API_PROXY_TARGET || '').trim()
  if (explicitProxyTarget) return normalizeUrl(explicitProxyTarget)

  const configuredApiUrl = String(env.VITE_API_URL || '').trim()
  if (configuredApiUrl) {
    try {
      const parsed = new URL(configuredApiUrl)
      return normalizeUrl(`${parsed.protocol}//${parsed.host}`)
    } catch {
      // Invalid URL: fallback to local backend target.
    }
  }

  return 'http://localhost:3000'
}

export default defineConfig(({ mode }) => {
  const apiProxyTarget = getApiProxyTarget(mode)

  return {
    plugins: [
      // The React and Tailwind plugins are both required for Make, even if
      // Tailwind is not being actively used - do not remove them.
      react(),
      tailwindcss(),
    ],
    resolve: {
      alias: {
        // Alias @ to the src directory.
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      proxy: {
        '/api': {
          target: apiProxyTarget,
          changeOrigin: true,
        },
      },
    },
    build: {
      chunkSizeWarningLimit: 700,
    },

    // File types to support raw imports. Never add .css, .tsx, or .ts files to this.
    assetsInclude: ['**/*.svg', '**/*.csv'],
  }
})
