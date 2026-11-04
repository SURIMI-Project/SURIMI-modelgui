import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // MOCK has no VITE_ prefix, so read it explicitly (shell env or .env files).
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [react()],
    define: {
      __MOCK__: JSON.stringify(env.MOCK?.toLowerCase() === 'true'),
    },
  }
})
