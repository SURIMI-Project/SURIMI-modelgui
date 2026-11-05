import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { netcdfLabPlugin } from '../../experiments/netcdf-lab/vite-plugin'

// https://vite.dev/config/
export default defineConfig(async () => ({
  plugins: [react(), await netcdfLabPlugin()],
}))
