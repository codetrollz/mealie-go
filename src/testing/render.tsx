import React from 'react';
import { render } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import i18n, { initI18n } from '../i18n';
import { ThemeProvider, type ThemePreference } from '../theme';

// Renders a screen the way the app does: i18n initialised (English), inside the
// theme provider and a NavigationContainer so useTheme/useNavigation work.
// Network is not touched here; tests mock `src/lib/mealieApi` at the boundary.
export async function renderScreen(ui: React.ReactElement, options: { theme?: ThemePreference } = {}) {
  if (!i18n.isInitialized) await initI18n();
  return render(
    <ThemeProvider initialPreference={options.theme ?? 'dark'}>
      <NavigationContainer>{ui}</NavigationContainer>
    </ThemeProvider>
  );
}
