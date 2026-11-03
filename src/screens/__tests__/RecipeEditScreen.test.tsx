import React from 'react';
import { Alert } from 'react-native';
import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
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
  api: { getRecipe: jest.fn(), updateRecipe: jest.fn(), getTags: jest.fn(), getCategories: jest.fn(), parseIngredients: jest.fn() },
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

test('moving a step down and then the step now below it up swaps back, so positions follow the order', async () => {
  await open();
  const original = stepsOnScreen();
  await fireEvent.press(screen.getByLabelText('Move step 1 down'));
  await fireEvent.press(screen.getByLabelText('Move step 2 up'));
  expect(stepsOnScreen()).toEqual(original);
});

test('two quick taps before a re-render move the step twice, not the wrong row', async () => {
  await open();
  const [one, two, three] = stepsOnScreen();
  const down = screen.getByLabelText('Move step 1 down');
  await act(async () => { fireEvent.press(down); fireEvent.press(down); });
  expect(stepsOnScreen()).toEqual([two, three, one]);
});

test('an empty step sitting between moved steps is dropped on save, the others keep their new order', async () => {
  await open();
  const [one, two, three] = recipeDetail.recipeInstructions.map(s => s.text);
  await fireEvent.press(screen.getByLabelText('Move step 3 up'));   // one, three, two
  await fireEvent.press(screen.getByText('+ Add Step'));              // one, three, two, (empty)
  await fireEvent.press(screen.getByLabelText('Move step 4 up'));   // one, three, (empty), two
  await fireEvent.press(screen.getByText('Save'));
  await waitFor(() => expect(api.updateRecipe).toHaveBeenCalled());
  expect((api.updateRecipe as jest.Mock).mock.calls[0][1].recipeInstructions.map((s: any) => s.text)).toEqual([one, three, two]);
});


// ---- hidden fields on steps, ingredients and notes must survive a save ----
const R1 = '11111111-1111-4111-8111-111111111111';
const R2 = '22222222-2222-4222-8222-222222222222';
const N1 = '33333333-3333-4333-8333-333333333333';
const rich = {
  ...recipeDetail,
  recipeIngredient: [
    { referenceId: R1, note: '1 cup flour', originalText: '1 cup flour', display: '1 cup flour' },                 // plain text row
    { referenceId: R2, quantity: 2, unit: { id: 'u', name: 'cup' }, food: { id: 'f', name: 'milk' }, display: '2 cups milk' },  // structured row
  ],
  recipeInstructions: [
    { id: 'st1', title: 'Mix', summary: 'the batter', text: 'Mix the flour and milk.', ingredientReferences: [{ referenceId: R1 }, { referenceId: R2 }],
      noteReferences: [{ referenceId: N1 }], durationSeconds: 600 },
    { id: 'st2', title: '', text: 'Bake it.', ingredientReferences: [], durationSeconds: 1800, someFutureField: { nested: true } },
    { id: 'st3', title: 'Rest', text: 'Let it rest.', durationSeconds: null },
  ],
  notes: [{ referenceId: N1, title: 'Tip', text: 'Use cold milk.' }],
};

const saveAndRead = async () => {
  await fireEvent.press(screen.getByText('Save'));
  await waitFor(() => expect(api.updateRecipe).toHaveBeenCalled());
  return (api.updateRecipe as jest.Mock).mock.calls[0][1];
};
const openRich = async () => {
  (api.getRecipe as jest.Mock).mockResolvedValue(rich);
  await renderScreen(<RecipeEditScreen navigation={nav} route={route} />);
  await screen.findAllByPlaceholderText('Describe this step...');
};

test('saving without changes writes every step back exactly as the server had it (id, summary, links, duration, unknown fields)', async () => {
  await openRich();
  const saved = await saveAndRead();
  expect(saved.recipeInstructions).toEqual([
    { id: 'st1', title: 'Mix', summary: 'the batter', text: 'Mix the flour and milk.', ingredientReferences: [{ referenceId: R1 }, { referenceId: R2 }],
      noteReferences: [{ referenceId: N1 }], durationSeconds: 600 },
    { id: 'st2', text: 'Bake it.', ingredientReferences: [], durationSeconds: 1800, someFutureField: { nested: true } },   // empty title is omitted
    { id: 'st3', title: 'Rest', text: 'Let it rest.', durationSeconds: null },
  ]);
});

test('editing a step changes its text and keeps its duration and links', async () => {
  await openRich();
  await fireEvent.changeText(screen.getAllByPlaceholderText('Describe this step...')[0], '  Whisk the flour and milk.  ');
  const saved = await saveAndRead();
  expect(saved.recipeInstructions[0]).toMatchObject({ id: 'st1', text: 'Whisk the flour and milk.', durationSeconds: 600, summary: 'the batter',
    ingredientReferences: [{ referenceId: R1 }, { referenceId: R2 }], noteReferences: [{ referenceId: N1 }] });
});

test('moving a step moves its duration and links with it', async () => {
  await openRich();
  await fireEvent.press(screen.getByLabelText('Move step 1 down'));
  const saved = await saveAndRead();
  expect(saved.recipeInstructions.map((s: any) => [s.id, s.text, s.durationSeconds])).toEqual([
    ['st2', 'Bake it.', 1800], ['st1', 'Mix the flour and milk.', 600], ['st3', 'Let it rest.', null],
  ]);
  expect(saved.recipeInstructions[1].ingredientReferences).toEqual([{ referenceId: R1 }, { referenceId: R2 }]);
});

test('a new step carries no hidden fields, and a removed step is gone', async () => {
  await openRich();
  await fireEvent.press(screen.getByText('+ Add Step'));
  const bodies = screen.getAllByPlaceholderText('Describe this step...');
  await fireEvent.changeText(bodies[3], 'Serve warm.');
  await fireEvent.press(screen.getByTestId('remove-step-0'));
  const saved = await saveAndRead();
  expect(saved.recipeInstructions.map((s: any) => s.id)).toEqual(['st2', 'st3', undefined]);
  expect(saved.recipeInstructions[2]).toEqual({ text: 'Serve warm.' });
});

test('clearing a step title drops the title but keeps the rest of the step', async () => {
  await openRich();
  await fireEvent.changeText(screen.getAllByPlaceholderText('Step title (optional)')[0], '');
  const saved = await saveAndRead();
  expect(saved.recipeInstructions[0].title).toBeUndefined();
  expect(saved.recipeInstructions[0]).toMatchObject({ id: 'st1', durationSeconds: 600 });
});

test('ingredients keep the id steps use to point at them, whether plain text or structured, and notes keep theirs', async () => {
  await openRich();
  const saved = await saveAndRead();
  expect(saved.recipeIngredient.map((i: any) => i.referenceId)).toEqual([R1, R2]);
  expect(saved.recipeIngredient[0]).toMatchObject({ note: '1 cup flour', disableAmount: true });
  expect(saved.recipeIngredient[1]).toMatchObject({ quantity: 2, food: { name: 'milk' } });
  expect(saved.notes).toEqual([{ referenceId: N1, title: 'Tip', text: 'Use cold milk.' }]);
});

test('an ingredient or note added in the editor has no reference id', async () => {
  await openRich();
  await fireEvent.press(screen.getByText('+ Add Ingredient'));
  // the structured row shows a preview instead of a text box, so the new row is the 2nd text box
  await fireEvent.changeText(screen.getAllByPlaceholderText('e.g. 2 cups all-purpose flour')[1], '3 eggs');
  await fireEvent.press(screen.getByText('+ Add Note'));
  await fireEvent.changeText(screen.getAllByPlaceholderText('Note title')[1], 'Another');
  await fireEvent.changeText(screen.getAllByPlaceholderText('Note content...')[1], 'Body of another note');
  const saved = await saveAndRead();
  expect(saved.recipeIngredient[2]).toMatchObject({ note: '3 eggs' });
  expect(saved.recipeIngredient[2].referenceId).toBeUndefined();
  expect(saved.notes[1].referenceId).toBeUndefined();
});


test('editing a plain-text ingredient keeps its reference id', async () => {
  await openRich();
  await fireEvent.changeText(screen.getByPlaceholderText('e.g. 2 cups all-purpose flour'), '2 cups sifted flour');
  const saved = await saveAndRead();
  expect(saved.recipeIngredient[0]).toMatchObject({ note: '2 cups sifted flour', referenceId: R1 });
});

test('turning a structured ingredient back into text keeps its reference id', async () => {
  await openRich();
  await fireEvent.press(screen.getByText('Edit as text'));
  const saved = await saveAndRead();
  expect(saved.recipeIngredient[1]).toMatchObject({ disableAmount: true, referenceId: R2 });
  expect(saved.recipeIngredient[1].quantity).toBeUndefined();
});

test('removing the middle note leaves the other two with their own reference ids', async () => {
  const [a, b, c] = ['aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'cccccccc-cccc-4ccc-8ccc-cccccccccccc'];
  (api.getRecipe as jest.Mock).mockResolvedValue({ ...rich, notes: [
    { referenceId: a, title: 'A', text: 'one' }, { referenceId: b, title: 'B', text: 'two' }, { referenceId: c, title: 'C', text: 'three' }] });
  await renderScreen(<RecipeEditScreen navigation={nav} route={route} />);
  await screen.findAllByPlaceholderText('Describe this step...');
  await fireEvent.press(screen.getByTestId('remove-note-n1'));
  const saved = await saveAndRead();
  expect(saved.notes.map((n: any) => [n.referenceId, n.title])).toEqual([[a, 'A'], [c, 'C']]);
});

test('a step whose text is cleared is dropped together with its duration (a step needs text)', async () => {
  await openRich();
  await fireEvent.changeText(screen.getAllByPlaceholderText('Describe this step...')[1], '   ');
  const saved = await saveAndRead();
  expect(saved.recipeInstructions.map((s: any) => s.id)).toEqual(['st1', 'st3']);
});

describe('parse ingredients review', () => {
  const parsedLine = (text: string, qty: number, unit: string, food: string) => ({
    input: text, confidence: { average: 0.99 },
    ingredient: { originalText: text, referenceId: `fresh-${food}`, quantity: qty, unit: { id: `u-${unit}`, name: unit }, food: { id: `f-${food}`, name: food }, display: text },
  });

  test('running the review keeps each ingredient\'s section title and the id steps use to point at it', async () => {
    (api.getRecipe as jest.Mock).mockResolvedValue({ ...rich,
      recipeIngredient: [
        { referenceId: R1, title: 'Dough', note: '2 cups flour', originalText: '2 cups flour', display: '2 cups flour' },
        { referenceId: R2, note: '1 cup milk', originalText: '1 cup milk', display: '1 cup milk' },
      ] });
    (api.parseIngredients as jest.Mock).mockResolvedValue([parsedLine('2 cups flour', 2, 'cup', 'flour'), parsedLine('1 cup milk', 1, 'cup', 'milk')]);
    const autoRoute = { ...route, params: { ...route.params, autoParse: true } };
    await renderScreen(<RecipeEditScreen navigation={nav} route={autoRoute} />);
    await fireEvent.press(await screen.findByText('Save 2 Ingredients'));          // the review's own save button
    const saved = await saveAndRead();
    expect(saved.recipeIngredient.map((i: any) => [i.referenceId, i.title, i.quantity, i.food?.name])).toEqual([
      [R1, 'Dough', 2, 'flour'], [R2, undefined, 1, 'milk'],
    ]);
    expect(saved.recipeIngredient[0].referenceId).not.toBe('fresh-flour');           // the parser's fresh id did not replace it
    expect(saved.recipeInstructions[0].ingredientReferences).toEqual([{ referenceId: R1 }, { referenceId: R2 }]);   // so the step links still resolve
  });
});
