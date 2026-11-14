import type { ConfigContext, ExpoConfig } from 'expo/config';

// app.json holds the static config; this file exists so build-time settings can come from the environment.
// No secrets are needed for this app today (the map uses OpenStreetMap through a WebView, no API key).
export default ({ config }: ConfigContext): ExpoConfig => config as ExpoConfig;
