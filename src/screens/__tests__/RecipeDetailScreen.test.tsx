import React from 'react';
import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import { fireGestureHandler, getByGestureTestId } from 'react-native-gesture-handler/jest-utils';
import { State } from 'react-native-gesture-handler';
import { Alert, Share } from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
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
jest.mock('expo-file-system/legacy', () => ({
  cacheDirectory: 'file:///cache/', deleteAsync: jest.fn(), copyAsync: jest.fn(),
  StorageAccessFramework: {}, EncodingType: { Base64: 'base64' },
}));
jest.mock('expo-sharing', () => ({ isAvailableAsync: jest.fn(), shareAsync: jest.fn() }));
jest.mock('expo-image-picker', () => ({ launchImageLibraryAsync: jest.fn(), launchCameraAsync: jest.fn() }));
jest.mock('expo-document-picker', () => ({ getDocumentAsync: jest.fn() }));
jest.mock('react-native-webview', () => ({ WebView: () => null }));
jest.mock('../../lib/mealieApi', () => {
  const resolved = (v: unknown) => jest.fn().mockResolvedValue(v);
  return {
    api: {
      getRecipe: resolved(null), getComments: resolved([]), getShareTokens: resolved([]), createShareToken: jest.fn(), getShoppingLists: resolved({ items: [] }),
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

// A completed horizontal pan on the tab area, as the gesture handler reports it.
const swipe = async (translationX: number, translationY = 0, endState: typeof State.END | typeof State.CANCELLED = State.END) => {
  await screen.findByTestId('recipe-tab-area');
  await act(async () => {
    fireGestureHandler(getByGestureTestId('recipe-tab-swipe'), [
      { state: State.BEGAN, translationX: 0, translationY: 0 },
      { state: State.ACTIVE, translationX: translationX / 2, translationY: translationY / 2 },
      { state: endState, translationX, translationY },
    ]);
  });
};

test('swiping left moves from Ingredients to Steps and swiping right comes back', async () => {
  await renderScreen(<RecipeDetailScreen navigation={nav} route={route} />);
  expect(await screen.findByText('1 lb ground beef')).toBeTruthy();
  expect(screen.queryByText(/shape into four oval patties/)).toBeNull();

  await swipe(-200);
  expect(await screen.findByText(/shape into four oval patties/)).toBeTruthy();
  expect(screen.queryByText('1 lb ground beef')).toBeNull();

  await swipe(200);
  expect(await screen.findByText('1 lb ground beef')).toBeTruthy();
  expect(screen.queryByText(/shape into four oval patties/)).toBeNull();
});

test('swiping right on the first tab, a short drag, or a mostly vertical one does not change the tab', async () => {
  await renderScreen(<RecipeDetailScreen navigation={nav} route={route} />);
  expect(await screen.findByText('1 lb ground beef')).toBeTruthy();
  await swipe(200);          // right on the first tab: nowhere to go
  await swipe(-40);          // too short
  await swipe(-80, 250);     // mostly vertical
  expect(screen.getByText('1 lb ground beef')).toBeTruthy();
  expect(screen.queryByText(/shape into four oval patties/)).toBeNull();
});

test('swiping all the way across stops at the last tab', async () => {
  await renderScreen(<RecipeDetailScreen navigation={nav} route={route} />);
  expect(await screen.findByText('1 lb ground beef')).toBeTruthy();
  await swipe(-200);   // steps
  await swipe(-200);   // notes
  expect(await screen.findByText('Serve over mashed potatoes.')).toBeTruthy();
  await swipe(-200);   // comments
  expect(await screen.findByText('No comments yet — be the first!')).toBeTruthy();
  await swipe(-200);   // already on the last tab: stays
  expect(screen.getByText('No comments yet — be the first!')).toBeTruthy();
  await swipe(200);    // back to notes
  expect(await screen.findByText('Serve over mashed potatoes.')).toBeTruthy();
});

test('a cancelled swipe does not change the tab', async () => {
  await renderScreen(<RecipeDetailScreen navigation={nav} route={route} />);
  expect(await screen.findByText('1 lb ground beef')).toBeTruthy();
  await swipe(-200, 0, State.CANCELLED);
  expect(screen.getByText('1 lb ground beef')).toBeTruthy();
  expect(screen.queryByText(/shape into four oval patties/)).toBeNull();
});

test('tapping a tab still works', async () => {
  await renderScreen(<RecipeDetailScreen navigation={nav} route={route} />);
  expect(await screen.findByText('1 lb ground beef')).toBeTruthy();
  await fireEvent.press(screen.getByText('Steps'));
  expect(await screen.findByText(/shape into four oval patties/)).toBeTruthy();
});

describe('Share Recipe screen: text and PDF', () => {
  const openShare = async () => {
    await renderScreen(<RecipeDetailScreen navigation={nav} route={route} />);
    expect(await screen.findByText('1 lb ground beef')).toBeTruthy();
    await fireEvent.press(screen.getByText('Share'));
    return screen.findByText('Share as text');
  };

  beforeEach(() => {
    jest.spyOn(Share, 'share').mockResolvedValue({ action: 'sharedAction' } as any);
    (Print.printToFileAsync as jest.Mock).mockResolvedValue({ uri: 'file:///cache/Print/abc-123.pdf' });
    (Sharing.isAvailableAsync as jest.Mock).mockResolvedValue(true);
    (Sharing.shareAsync as jest.Mock).mockResolvedValue(undefined);
    (FileSystem.deleteAsync as jest.Mock).mockResolvedValue(undefined);
    (FileSystem.copyAsync as jest.Mock).mockResolvedValue(undefined);
  });

  test('Share as text sends the recipe as plain text without creating a public link', async () => {
    await fireEvent.press(await openShare());
    expect(Share.share).toHaveBeenCalledTimes(1);
    const { title, message } = (Share.share as jest.Mock).mock.calls[0][0];
    expect(title).toBe(recipeDetail.name);
    expect(message).toContain(recipeDetail.name);
    expect(message).toContain('• 1 lb ground beef');
    expect(message).toContain('• salt and pepper to taste');
    expect(message).toContain('1. Mix the beef');
    expect(message).toContain('3. Gravy — Cook the mushrooms');
    expect(message).toContain('Tip: Serve over mashed potatoes.');
    expect(message).not.toMatch(/https?:/);
    expect(api.createShareToken).not.toHaveBeenCalled();
  });

  test('Share as text follows the servings scaler', async () => {
    await renderScreen(<RecipeDetailScreen navigation={nav} route={route} />);
    expect(await screen.findByText('1 lb ground beef')).toBeTruthy();
    await fireEvent.press(screen.getByText('+'));
    await fireEvent.press(screen.getByText('Share'));
    await fireEvent.press(await screen.findByText('Share as text'));
    const { message } = (Share.share as jest.Mock).mock.calls[0][0];
    expect(message).toContain('• 1.25 lb ground beef');   // 4 -> 5 servings
    expect(message).toContain('Serves: 5');
  });

  test('Share as PDF builds the PDF and opens the share sheet with a file named after the recipe', async () => {
    await fireEvent.press(await openShare().then(() => screen.getByText('Share as PDF')));
    await waitFor(() => expect(Sharing.shareAsync).toHaveBeenCalled());
    expect(Print.printToFileAsync).toHaveBeenCalledTimes(1);
    expect(FileSystem.copyAsync).toHaveBeenCalledWith({
      from: 'file:///cache/Print/abc-123.pdf', to: `file:///cache/${recipeDetail.slug}.pdf`,
    });
    expect(Sharing.shareAsync).toHaveBeenCalledWith(`file:///cache/${recipeDetail.slug}.pdf`, { mimeType: 'application/pdf' });
  });

  test('if renaming the PDF fails it is still shared under its generated name', async () => {
    (FileSystem.copyAsync as jest.Mock).mockRejectedValue(new Error('disk'));
    await fireEvent.press(await openShare().then(() => screen.getByText('Share as PDF')));
    await waitFor(() => expect(Sharing.shareAsync).toHaveBeenCalledWith('file:///cache/Print/abc-123.pdf', { mimeType: 'application/pdf' }));
  });

  test('a PDF that cannot be built shows an error and shares nothing', async () => {
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    (Print.printToFileAsync as jest.Mock).mockRejectedValue(new Error('print failed'));
    await fireEvent.press(await openShare().then(() => screen.getByText('Share as PDF')));
    await waitFor(() => expect(alert).toHaveBeenCalledWith('Export failed', 'print failed'));
    expect(Sharing.shareAsync).not.toHaveBeenCalled();
  });
});
