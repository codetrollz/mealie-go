import 'react-native-url-polyfill/auto';
import { useEffect, useState } from 'react';
import { SystemBars } from 'react-native-edge-to-edge';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './src/context/AuthContext';
import { FavoritesProvider } from './src/context/FavoritesContext';
import RootNavigator from './src/navigation/RootNavigator';
import { initI18n } from './src/i18n';
import { ThemeProvider, ThemePreference, getSavedThemePreference, useTheme } from './src/theme';

// Status/navigation bar icons must contrast with the current theme: dark icons on light.
function ThemedSystemBars() {
  const { scheme } = useTheme();
  const style = scheme === 'dark' ? 'light' : 'dark';
  return <SystemBars style={{ statusBar: style, navigationBar: style }} />;
}

export default function App() {
  const [i18nReady, setI18nReady] = useState(false);
  const [themePreference, setThemePreference] = useState<ThemePreference | null>(null);

  // Read before the first render so the app never flashes the wrong theme.
  useEffect(() => {
    getSavedThemePreference().then(setThemePreference);
  }, []);

  // Resources are bundled JSON (no network dependency) and the only async
  // step is an AsyncStorage read for a saved language preference, so this
  // resolves near-instantly -- still gated so no screen renders with
  // untranslated keys for a frame before i18n finishes initializing.
  // initI18n() is written to never reject, but this .catch() is a second
  // line of defense: since the entire app's first render is gated on this
  // promise settling, letting it hang or reject unhandled would mean a
  // permanent blank screen for every user, not just a missing translation.
  useEffect(() => {
    initI18n()
      .then(() => setI18nReady(true))
      .catch(() => setI18nReady(true));
  }, []);

  if (!i18nReady || themePreference === null) return null;

  return (
    <ThemeProvider initialPreference={themePreference}>
      <SafeAreaProvider>
        <AuthProvider>
          <FavoritesProvider>
            <ThemedSystemBars />
            <RootNavigator />
          </FavoritesProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </ThemeProvider>
  );
}
