import React from 'react';
import { fireEvent, screen } from '@testing-library/react-native';
import SettingsScreen from '../SettingsScreen';
import { renderScreen } from '../../testing/render';
import { buildColors, getSavedAccent } from '../../theme';

jest.mock('expo-constants', () => ({ __esModule: true, default: { expoConfig: { version: '1.8.2' } } }));

test('choosing Light in Settings restyles the screen immediately', async () => {
  await renderScreen(<SettingsScreen />, { theme: 'dark' });
  expect(screen.getByText('Settings')).toHaveStyle({ color: buildColors('dark').textPrimary });

  await fireEvent.press(screen.getByText('Light'));
  expect(screen.getByText('Settings')).toHaveStyle({ color: buildColors('light').textPrimary });

  await fireEvent.press(screen.getByText('Dark'));
  expect(screen.getByText('Settings')).toHaveStyle({ color: buildColors('dark').textPrimary });
});

test('the current appearance choice is marked selected', async () => {
  await renderScreen(<SettingsScreen />, { theme: 'light' });
  expect(screen.getByRole('button', { name: 'Light' })).toBeSelected();
  expect(screen.getByRole('button', { name: 'Dark' })).not.toBeSelected();
});

test('picking an accent colour restyles the selected control and is saved', async () => {
  await renderScreen(<SettingsScreen />, { theme: 'light' });
  const selectedSegment = () => screen.getByRole('button', { name: 'Light' });
  expect(selectedSegment()).toHaveStyle({ backgroundColor: buildColors('light', 'orange').primary });

  await fireEvent.press(screen.getByRole('button', { name: 'Blue' }));
  expect(selectedSegment()).toHaveStyle({ backgroundColor: buildColors('light', 'blue').primary });
  expect(screen.getByRole('button', { name: 'Blue' })).toBeSelected();
  expect(screen.getByRole('button', { name: 'Orange' })).not.toBeSelected();
  expect(await getSavedAccent()).toBe('blue');
});
