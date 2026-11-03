import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { netcdfLabPlugin } from './experiments/netcdf-lab/vite-plugin'

// https://vite.dev/config/
export default defineConfig(async ({ mode }) => {
  // MOCK has no VITE_ prefix, so read it explicitly (shell env or .env files).
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [react(), await netcdfLabPlugin()],
    define: {
      __MOCK__: JSON.stringify(env.MOCK?.toLowerCase() === 'true'),
    },
  }
})
