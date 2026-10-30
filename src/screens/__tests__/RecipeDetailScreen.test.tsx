import React from 'react';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
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
  // The jest preset resets mock implementations between tests, so set the wake-lock ones every time.
  (activateKeepAwakeAsync as jest.Mock).mockResolvedValue(undefined);
  (deactivateKeepAwake as jest.Mock).mockResolvedValue(undefined);
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

const swipe = async (fromX: number, toX: number, dy = 0) => {
  const area = await screen.findByTestId('recipe-tab-area');
  await fireEvent(area, 'touchStart', { nativeEvent: { pageX: fromX, pageY: 400, touches: [{}] } });
  await fireEvent(area, 'touchEnd', { nativeEvent: { pageX: toX, pageY: 400 + dy, touches: [] } });
};

test('swiping left moves from Ingredients to Steps and swiping right comes back', async () => {
  await renderScreen(<RecipeDetailScreen navigation={nav} route={route} />);
  expect(await screen.findByText('1 lb ground beef')).toBeTruthy();
  expect(screen.queryByText(/shape into four oval patties/)).toBeNull();

  await swipe(300, 100);
  expect(await screen.findByText(/shape into four oval patties/)).toBeTruthy();
  expect(screen.queryByText('1 lb ground beef')).toBeNull();

  await swipe(100, 300);
  expect(await screen.findByText('1 lb ground beef')).toBeTruthy();
  expect(screen.queryByText(/shape into four oval patties/)).toBeNull();
});

test('swiping right on the first tab, or scrolling down, does not change the tab', async () => {
  await renderScreen(<RecipeDetailScreen navigation={nav} route={route} />);
  expect(await screen.findByText('1 lb ground beef')).toBeTruthy();
  await swipe(100, 300);          // right on the first tab: nowhere to go
  await swipe(300, 280, 250);     // mostly vertical drag
  expect(screen.getByText('1 lb ground beef')).toBeTruthy();
  expect(screen.queryByText(/shape into four oval patties/)).toBeNull();
});

test('tapping a tab still works', async () => {
  await renderScreen(<RecipeDetailScreen navigation={nav} route={route} />);
  expect(await screen.findByText('1 lb ground beef')).toBeTruthy();
  await fireEvent.press(screen.getByText('Steps'));
  expect(await screen.findByText(/shape into four oval patties/)).toBeTruthy();
});

