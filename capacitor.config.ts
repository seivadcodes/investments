import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.depressedtogether.app',
  appName: 'Depressed Together',
  webDir: 'out', 
  server: {
    url: 'https://www.depressedtogether.com', // Your live Vercel URL
    cleartext: true, 
  },
  android: {
    allowMixedContent: true,
  },
};

export default config;