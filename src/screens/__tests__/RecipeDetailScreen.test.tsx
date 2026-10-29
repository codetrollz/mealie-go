import React from 'react';
import { screen, waitFor } from '@testing-library/react-native';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import RecipeDetailScreen from '../RecipeDetailScreen';
import { renderScreen } from '../../testing/render';
import { api } from '../../lib/mealieApi';
import { recipeDetail } from '../../testing/screenshots/fixtures';

// Native-only modules the screen imports.
jest.mock('expo-keep-awake', () => ({
  activateKeepAwakeAsync: jest.fn().mockResolvedValue(undefined),
  deactivateKeepAwake: jest.fn().mockResolvedValue(undefined),
  useKeepAwake: jest.fn(),
}));
jest.mock('expo-print', () => ({ printToFileAsync: jest.fn() }));
jest.mock('expo-sharing', () => ({ isAvailableAsync: jest.fn(), shareAsync: jest.fn() }));
jest.mock('expo-image-picker', () => ({ launchImageLibraryAsync: jest.fn(), launchCameraAsync: jest.fn() }));
jest.mock('expo-document-picker', () => ({ getDocumentAsync: jest.fn() }));
jest.mock('react-native-webview', () => ({ WebView: () => null }));
jest.mock('../../lib/mealieApi', () => {
  const resolved = (v: unknown) => jest.fn().mockResolvedValue(v);
  return {
    api: {
      getRecipe: resolved(null), getComments: resolved([]), getShareTokens: resolved([]), getShoppingLists: resolved({ items: [] }),
    },
    recipeImageSource: () => undefined,
    recipeAssetUrl: () => '',
    isImageFileName: () => false,
  };
});

const nav: any = { navigate: jest.fn(), goBack: jest.fn(), setOptions: jest.fn(), addListener: () => () => {} };
const route: any = { key: 'r', name: 'RecipeDetail', params: { slug: recipeDetail.slug, name: recipeDetail.name } };

beforeEach(() => {
  jest.clearAllMocks();
  (api.getRecipe as jest.Mock).mockResolvedValue(recipeDetail);
  (api.getComments as jest.Mock).mockResolvedValue([]);
});

test('an open recipe keeps the screen awake and lets it sleep again when it closes', async () => {
  const { unmount } = await renderScreen(<RecipeDetailScreen navigation={nav} route={route} />);
  await waitFor(() => expect(activateKeepAwakeAsync).toHaveBeenCalledWith('recipe-detail'));
  expect(await screen.findByText(recipeDetail.name)).toBeTruthy();
  expect(deactivateKeepAwake).not.toHaveBeenCalled();

  await unmount();
  expect(deactivateKeepAwake).toHaveBeenCalledWith('recipe-detail');
});

test('a failing wake lock never breaks the recipe screen', async () => {
  (activateKeepAwakeAsync as jest.Mock).mockRejectedValueOnce(new Error('unsupported'));
  await renderScreen(<RecipeDetailScreen navigation={nav} route={route} />);
  expect(await screen.findByText(recipeDetail.name)).toBeTruthy();
});
