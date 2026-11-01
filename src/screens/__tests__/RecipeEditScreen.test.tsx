import React from 'react';
import { Alert } from 'react-native';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import RecipeEditScreen from '../RecipeEditScreen';
import { renderScreen } from '../../testing/render';
import { api } from '../../lib/mealieApi';
import { recipeDetail } from '../../testing/screenshots/fixtures';

jest.mock('expo-image-picker', () => ({ launchImageLibraryAsync: jest.fn(), launchCameraAsync: jest.fn() }));
jest.mock('expo-document-picker', () => ({ getDocumentAsync: jest.fn() }));
jest.mock('expo-sharing', () => ({ isAvailableAsync: jest.fn(), shareAsync: jest.fn() }));
jest.mock('react-native-webview', () => ({ WebView: () => null }));
jest.mock('../../context/AuthContext', () => ({
  useAuth: () => ({ serverUrl: 'https://mealie.test', token: 't', user: { groupSlug: 'home' } }),
}));
jest.mock('../../lib/mealieApi', () => ({
  api: { getRecipe: jest.fn(), updateRecipe: jest.fn(), getTags: jest.fn(), getCategories: jest.fn() },
  recipeImageSource: () => undefined,
  recipeAssetUrl: () => '',
  isImageFileName: () => false,
}));

const nav: any = { navigate: jest.fn(), goBack: jest.fn(), popTo: jest.fn(), setOptions: jest.fn(), getState: () => ({ routes: [] }), addListener: () => () => {} };
const route: any = { key: 'e', name: 'RecipeEdit', params: { slug: recipeDetail.slug, name: recipeDetail.name } };

const stepsOnScreen = () => screen.getAllByPlaceholderText('Describe this step...').map(i => i.props.value);

beforeEach(() => {
  jest.clearAllMocks();
  (api.getRecipe as jest.Mock).mockResolvedValue(recipeDetail);
  (api.getTags as jest.Mock).mockResolvedValue({ items: [] });
  (api.getCategories as jest.Mock).mockResolvedValue({ items: [] });
  (api.updateRecipe as jest.Mock).mockResolvedValue({ ...recipeDetail });
});

const open = async () => {
  await renderScreen(<RecipeEditScreen navigation={nav} route={route} />);
  await screen.findAllByPlaceholderText('Describe this step...');
};

test('moving a step down and another up reorders the steps, and Save sends them in that order', async () => {
  await open();
  const [one, two, three] = recipeDetail.recipeInstructions.map(s => s.text);
  expect(stepsOnScreen()).toEqual([one, two, three]);

  await fireEvent.press(screen.getByLabelText('Move step 1 down'));
  expect(stepsOnScreen()).toEqual([two, one, three]);
  await fireEvent.press(screen.getByLabelText('Move step 3 up'));
  expect(stepsOnScreen()).toEqual([two, three, one]);

  await fireEvent.press(screen.getByText('Save'));
  await waitFor(() => expect(api.updateRecipe).toHaveBeenCalled());
  const saved = (api.updateRecipe as jest.Mock).mock.calls[0][1];
  expect(saved.recipeInstructions.map((s: any) => s.text)).toEqual([two, three, one]);
  // The step title travels with its text (the Gravy step was step 3).
  expect(saved.recipeInstructions[1].title).toBe('Gravy');
});

test('a step keeps what was typed into it when it moves', async () => {
  await open();
  const first = screen.getAllByPlaceholderText('Describe this step...')[0];
  await fireEvent.changeText(first, 'Edited first step');
  await fireEvent.press(screen.getByLabelText('Move step 1 down'));
  expect(stepsOnScreen()[1]).toBe('Edited first step');
});

test('the first step cannot move up and the last cannot move down', async () => {
  await open();
  const before = stepsOnScreen();
  await fireEvent.press(screen.getByLabelText('Move step 1 up'));
  await fireEvent.press(screen.getByLabelText('Move step 3 down'));
  expect(stepsOnScreen()).toEqual(before);
  expect(screen.getByLabelText('Move step 1 up').props.accessibilityState?.disabled).toBe(true);
  expect(screen.getByLabelText('Move step 3 down').props.accessibilityState?.disabled).toBe(true);
});

test('step numbers follow the new order', async () => {
  await open();
  await fireEvent.press(screen.getByLabelText('Move step 1 down'));
  // The step that was Gravy (3rd) still reads 3rd; the others swapped places.
  expect(screen.getAllByPlaceholderText('Step title (optional)').map(i => i.props.value)).toEqual(['', '', 'Gravy']);
  expect(screen.getByLabelText('Move step 3 down')).toBeTruthy();
});
