import { buildRecipeShareText, RecipeShareTextInput } from '../recipeShareText';

const base: RecipeShareTextInput = {
  name: 'Pasta E Fagioli',
  description: 'Hearty soup.',
  meta: ['Prep: 10 min', '', 'Serves: 6'],
  ingredients: [{ text: '1 lb sausage' }, { text: '2 stalks celery' }],
  steps: [{ text: 'Brown the sausage.' }, { title: 'Simmer', text: 'Add beans.' }],
  notes: [{ title: 'Tip', text: 'Better next day.' }, { text: 'Freezes well.' }],
  labels: { ingredients: 'Ingredients', instructions: 'Steps', notes: 'Notes' },
};

test('full recipe: title, description, meta, ingredients, numbered steps, notes', () => {
  expect(buildRecipeShareText(base)).toBe([
    'Pasta E Fagioli',
    'Hearty soup.',
    'Prep: 10 min · Serves: 6',
    'Ingredients\n• 1 lb sausage\n• 2 stalks celery',
    'Steps\n1. Brown the sausage.\n2. Simmer — Add beans.',
    'Notes\nTip: Better next day.\nFreezes well.',
  ].join('\n\n'));
});

test('empty sections vanish instead of leaving bare headings', () => {
  const text = buildRecipeShareText({ ...base, description: ' ', meta: [], ingredients: [{ text: '  ' }], steps: [{ text: '' }], notes: [] });
  expect(text).toBe('Pasta E Fagioli');
});

test('ingredient section titles start a new group, with a gap before every group but the first', () => {
  const text = buildRecipeShareText({
    ...base, description: undefined, meta: [], steps: [], notes: [],
    ingredients: [{ title: 'Sauce', text: '1 cup stock' }, { text: '1 tsp salt' }, { title: 'Topping', text: 'Parmesan' }],
  });
  expect(text).toBe('Pasta E Fagioli\n\nIngredients\nSauce\n• 1 cup stock\n• 1 tsp salt\n\nTopping\n• Parmesan');
});

test('step numbers count only the steps that are kept', () => {
  const text = buildRecipeShareText({ ...base, steps: [{ text: 'One' }, { text: '  ' }, { text: 'Two' }] });
  expect(text).toContain('1. One\n2. Two');
});

test('headings come from the labels, so another language is not hard-coded away', () => {
  const text = buildRecipeShareText({ ...base, labels: { ingredients: 'Zutaten', instructions: 'Zubereitung', notes: 'Notizen' } });
  expect(text).toContain('Zutaten\n• 1 lb sausage');
  expect(text).toContain('Zubereitung\n1.');
  expect(text).toContain('Notizen\nTip:');
});

test('a link is appended last, and only when given', () => {
  expect(buildRecipeShareText({ ...base, link: 'https://x.test/s/1' }).endsWith('\n\nhttps://x.test/s/1')).toBe(true);
  expect(buildRecipeShareText(base)).not.toContain('http');
});
