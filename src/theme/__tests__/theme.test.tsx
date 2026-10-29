import React from 'react';
import * as fs from 'fs';
import * as path from 'path';
import { Text } from 'react-native';
import { fireEvent, render, screen } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as RN from 'react-native';
import {
  ACCENTS, buildColors, getSavedThemePreference, ThemeProvider, useTheme, type Colors, type Scheme,
} from '..';

function luminance(hex: string) {
  const [r, g, b] = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map(c => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function contrast(a: string, b: string) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

describe.each<Scheme>(['dark', 'light'])('%s palette', scheme => {
  const c = buildColors(scheme);
  test('body text reads on every surface (4.5:1)', () => {
    for (const bg of [c.background, c.surface, c.surfaceElevated]) {
      expect(contrast(c.textPrimary, bg)).toBeGreaterThanOrEqual(4.5);
      expect(contrast(c.textSecondary, bg)).toBeGreaterThanOrEqual(4.5);
    }
  });
  test('text on a primary button reads (4.5:1)', () => {
    expect(contrast(c.textInverse, c.primary)).toBeGreaterThanOrEqual(4.5);
  });
  test('primary used as text or an icon reads on the background (4.5:1)', () => {
    expect(contrast(c.primary, c.background)).toBeGreaterThanOrEqual(4.5);
  });
  test('error and success read on the background (3:1 for icons and large text)', () => {
    expect(contrast(c.error, c.background)).toBeGreaterThanOrEqual(3);
    expect(contrast(c.success, c.background)).toBeGreaterThanOrEqual(3);
  });
});

test('the dark palette is unchanged from the original dark-only theme', () => {
  expect(buildColors('dark')).toEqual({
    background: '#0F0D0A', surface: '#1A1510', surfaceElevated: '#251C14',
    primary: '#E87830', primaryLight: '#F09850', primaryDark: '#C45C18', accent: '#4E9E8C',
    success: '#5BA07A', warning: '#F0B429', error: '#E05D5D',
    textPrimary: '#F4F0EC', textSecondary: '#9A8070', textDisabled: '#52403A', textInverse: '#0F0D0A',
    border: '#2A1E14', borderLight: '#382818',
    tabBar: '#130E0A', tabBarActive: '#E87830', tabBarInactive: '#4A3428',
  });
});

test('an accent changes only primary colours and the active tab', () => {
  ACCENTS.test = { dark: { primary: '#111111', primaryLight: '#222222', primaryDark: '#333333' }, light: { primary: '#444444', primaryLight: '#555555', primaryDark: '#666666' } };
  try {
    const a = buildColors('light'); const b = buildColors('light', 'test');
    const changed = (Object.keys(a) as (keyof Colors)[]).filter(k => a[k] !== b[k]).sort();
    expect(changed).toEqual(['primary', 'primaryDark', 'primaryLight', 'tabBarActive']);
  } finally { delete ACCENTS.test; }
});

function Probe() {
  const { scheme, preference, colors, setPreference } = useTheme();
  return (
    <>
      <Text testID="scheme">{scheme}</Text>
      <Text testID="pref">{preference}</Text>
      <Text testID="bg">{colors.background}</Text>
      <Text onPress={() => setPreference('light')}>choose light</Text>
    </>
  );
}

describe('ThemeProvider', () => {
  beforeEach(async () => { await AsyncStorage.clear(); });
  afterEach(() => jest.restoreAllMocks());

  test('system follows the device and defaults to dark when unknown', async () => {
    const spy = jest.spyOn(RN, 'useColorScheme');
    spy.mockReturnValue('light');
    const { unmount } = await render(<ThemeProvider><Probe /></ThemeProvider>);
    expect(screen.getByTestId('scheme').props.children).toBe('light');
    await unmount();
    spy.mockReturnValue('unspecified');
    await render(<ThemeProvider><Probe /></ThemeProvider>);
    expect(screen.getByTestId('scheme').props.children).toBe('dark');
  });

  test('an explicit choice beats the device setting', async () => {
    jest.spyOn(RN, 'useColorScheme').mockReturnValue('dark');
    await render(<ThemeProvider initialPreference="light"><Probe /></ThemeProvider>);
    expect(screen.getByTestId('scheme').props.children).toBe('light');
    expect(screen.getByTestId('bg').props.children).toBe(buildColors('light').background);
  });

  test('choosing a theme switches live and is saved', async () => {
    jest.spyOn(RN, 'useColorScheme').mockReturnValue('dark');
    await render(<ThemeProvider><Probe /></ThemeProvider>);
    await fireEvent.press(screen.getByText('choose light'));
    expect(screen.getByTestId('scheme').props.children).toBe('light');
    expect(await getSavedThemePreference()).toBe('light');
  });

  test('a missing or invalid saved value means system', async () => {
    expect(await getSavedThemePreference()).toBe('system');
    await AsyncStorage.setItem('mealie_go.theme', 'purple');
    expect(await getSavedThemePreference()).toBe('system');
  });
});

// Colours must come from the theme so both schemes stay in sync. Scrims over
// photos and modal backdrops are deliberately the same in both themes.
test('no colour literals outside the theme (except photo scrims and print CSS)', () => {
  const root = path.resolve(__dirname, '../..');
  const files: string[] = [];
  const walk = (dir: string) => fs.readdirSync(dir, { withFileTypes: true }).forEach(e => {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) { if (!['theme', 'testing', 'i18n', '__tests__'].includes(e.name)) walk(p); }
    else if (/\.tsx?$/.test(e.name)) files.push(p);
  });
  walk(root);
  const allowed = /^(#fff|#000|rgba\(0,\s*0,\s*0,\s*[\d.]+\))$/i;
  const offenders: string[] = [];
  for (const f of files) {
    if (f.endsWith('RecipeDetailScreen.tsx')) continue; // contains the print-to-PDF stylesheet (white paper)
    fs.readFileSync(f, 'utf8').split('\n').forEach((line, i) => {
      if (/^\s*(\/\/|\*|\/\*)/.test(line)) return;
      for (const m of line.matchAll(/#[0-9a-fA-F]{3,8}\b|rgba?\([^)]*\)/g)) {
        if (!allowed.test(m[0])) offenders.push(`${path.relative(root, f)}:${i + 1} ${m[0]}`);
      }
    });
  }
  expect(offenders).toEqual([]);
});
