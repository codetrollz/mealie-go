import React from 'react';
import { render } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import i18n, { initI18n } from '../i18n';

// Renders a screen the way the app does: i18n initialised (English), inside a
// NavigationContainer so useNavigation works. Network is not touched here;
// tests mock `src/lib/mealieApi` at the boundary.
export async function renderScreen(ui: React.ReactElement) {
  if (!i18n.isInitialized) await initI18n();
  return render(<NavigationContainer>{ui}</NavigationContainer>);
}
