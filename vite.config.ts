import { defineConfig } from 'vite';
export default defineConfig({
  build: {
    rolldownOptions: {
      output: { codeSplitting: { groups: [
        { name: 'three', test: /node_modules\/three/ },
        { name: 'physics', test: /node_modules\/@dimforge/ },
      ] } },
    },
  },
});
