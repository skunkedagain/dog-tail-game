import { defineConfig, loadEnv } from 'vite';
import { leaderboardApi } from './server/dev-api';
export default defineConfig(({mode})=>({
  plugins:[leaderboardApi({...loadEnv(mode,process.cwd(),''),...process.env} as Record<string,string>)],
  build: {
    rolldownOptions: {
      output: { codeSplitting: { groups: [
        { name: 'three', test: /node_modules\/three/ },
        { name: 'physics', test: /node_modules\/@dimforge/ },
      ] } },
    },
  },
}));
