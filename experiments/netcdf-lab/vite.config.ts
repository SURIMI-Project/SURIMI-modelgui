import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { netcdfLabPlugin } from './vite-plugin';

export default defineConfig(async () => ({ plugins: [react(), await netcdfLabPlugin()] }));
