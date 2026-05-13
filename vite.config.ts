import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const base = process.env.DEPLOY_TARGET === 'godaddy'
  ? '/apps/pronunciation-scaffolder/'
  : '/new_pronunciation_scaffolder_app/';

export default defineConfig({
  plugins: [react()],
  base,
});
