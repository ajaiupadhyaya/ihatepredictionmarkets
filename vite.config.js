import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 5173,
    open: true
  },
  build: {
    target: 'es2015',
    outDir: 'dist',
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return;

          if (id.includes('/d3')) return 'vendor-d3';
          if (id.includes('/p5')) return 'vendor-p5';
          if (id.includes('/three') || id.includes('@react-three')) return 'vendor-3d';
          if (id.includes('/chart.js') || id.includes('chartjs-plugin-annotation')) return 'vendor-chart';

          return 'vendor';
        }
      }
    }
  }
});
