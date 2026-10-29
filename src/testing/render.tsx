import React from 'react';
import { render } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import i18n, { initI18n } from '../i18n';
import { ThemeProvider, type ThemePreference } from '../theme';

// Renders a screen the way the app does: i18n initialised (English), inside the
// safe-area and theme providers and a NavigationContainer so useSafeAreaInsets,
// useTheme and useNavigation work.
// Network is not touched here; tests mock `src/lib/mealieApi` at the boundary.
export async function renderScreen(ui: React.ReactElement, options: { theme?: ThemePreference } = {}) {
  if (!i18n.isInitialized) await initI18n();
  return render(
    <SafeAreaProvider initialMetrics={{ frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 28, left: 0, right: 0, bottom: 16 } }}>
      <ThemeProvider initialPreference={options.theme ?? 'dark'}>
        <NavigationContainer>{ui}</NavigationContainer>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
