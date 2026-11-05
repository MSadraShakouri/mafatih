import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  // Follows the convention used by the other apps. Choose the permanent ID
  // before distributing an APK: changing it creates a different Android app.
  appId: 'com.msadrashakouri.mafatih',
  appName: 'Mafatih',
  webDir: 'dist',
  server: { androidScheme: 'https' },
};

export default config;
