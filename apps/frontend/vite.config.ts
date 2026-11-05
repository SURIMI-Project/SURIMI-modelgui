import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { netcdfLabPlugin } from '../../experiments/netcdf-lab/vite-plugin'

// https://vite.dev/config/
export default defineConfig(async ({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    plugins: [react(), await netcdfLabPlugin()],
    server: {
      proxy: {
        '/api/v1': {
          target: env.VITE_API_PROXY_TARGET || 'http://127.0.0.1:18082',
          changeOrigin: true,
        },
      },
    },
  }
})
