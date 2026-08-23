import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'uz.openworld.academy',
  appName: 'Open World',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  }
};

export default config;
