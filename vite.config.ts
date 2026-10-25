import { defineConfig } from 'vite';

// `base` cấu hình qua biến môi trường VITE_BASE (CI đặt thành /<tên-repo>/).
const base = process.env.VITE_BASE ?? './';

export default defineConfig({
  base,
  build: {
    target: 'es2022',
    sourcemap: false,
  },
  worker: { format: 'es' },
});
