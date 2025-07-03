import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.geocalc.ai',
  appName: 'GeoCalc AI',
  webDir: 'out',
  server: {
    androidScheme: 'https'
  }
};

export default config;
