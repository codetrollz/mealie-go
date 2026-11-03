import { applyParsedIngredients, type IngredientRow } from '../ingredientRows';
import type { RecipeIngredient } from '../../types';

let n = 0;
const makeKey = () => `k${++n}`;
const preview = (i: RecipeIngredient) => `PREVIEW ${i.originalText}`;
const row = (text: string, over: Partial<IngredientRow> = {}): IngredientRow => ({ key: `old-${text}`, text, ...over });
const result = (text: string, over: Partial<RecipeIngredient> = {}): RecipeIngredient =>
  ({ originalText: text, referenceId: `fresh-${text}`, quantity: 1, ...over } as RecipeIngredient);

beforeEach(() => { n = 0; });

test('a matched row keeps its section title and the reference id steps point at; the result takes that id', () => {
  const rows = [row('2 cups flour', { referenceId: 'ref-flour', title: 'Dough' }), row('1 egg', { referenceId: 'ref-egg' })];
  const out = applyParsedIngredients(rows, [result('2 cups flour'), result('1 egg')], makeKey, preview);
  expect(out.map(r => [r.text, r.title, r.referenceId, r.parsed?.referenceId])).toEqual([
    ['PREVIEW 2 cups flour', 'Dough', 'ref-flour', 'ref-flour'],
    ['PREVIEW 1 egg', undefined, 'ref-egg', 'ref-egg'],
  ]);
});

test('results the user reordered or removed in the review still find their own rows (matched by text, not position)', () => {
  const rows = [row('a', { referenceId: 'ra', title: 'A' }), row('b', { referenceId: 'rb' }), row('c', { referenceId: 'rc', title: 'C' })];
  const out = applyParsedIngredients(rows, [result('c'), result('a')], makeKey, preview);        // b removed, c moved first
  expect(out.map(r => [r.text, r.title, r.referenceId])).toEqual([['PREVIEW c', 'C', 'rc'], ['PREVIEW a', 'A', 'ra']]);
});

test('a result whose text no longer matches (edited in the review) is a plain new row with the parser\'s id', () => {
  const out = applyParsedIngredients([row('2 cups flour', { referenceId: 'ref-flour', title: 'Dough' })], [result('2 cups sifted flour')], makeKey, preview);
  expect(out[0]).toMatchObject({ title: undefined, referenceId: 'fresh-2 cups sifted flour' });
});

test('identical lines are matched in order, each row used once', () => {
  const rows = [row('salt', { referenceId: 'r1', title: 'First' }), row('salt', { referenceId: 'r2' })];
  const out = applyParsedIngredients(rows, [result('salt'), result('salt'), result('salt')], makeKey, preview);
  expect(out.map(r => [r.referenceId, r.title])).toEqual([['r1', 'First'], ['r2', undefined], ['fresh-salt', undefined]]);
});

test('lines the parser could not read stay plain rows but keep their id and title', () => {
  const out = applyParsedIngredients([row('a pinch of love', { referenceId: 'ref-love', title: 'Extras' })],
    [result('a pinch of love', { disableAmount: true })], makeKey, preview);
  expect(out[0]).toMatchObject({ parsed: undefined, referenceId: 'ref-love', title: 'Extras', text: 'PREVIEW a pinch of love' });
});

test('an already-structured row (its text is the preview) matches by that text and keeps the id from its parsed data', () => {
  const rows = [row('2 cups milk', { parsed: { referenceId: 'ref-milk', quantity: 2 } as RecipeIngredient, title: 'Wet' })];
  const out = applyParsedIngredients(rows, [result('2 cups milk')], makeKey, preview);
  expect(out[0]).toMatchObject({ referenceId: 'ref-milk', title: 'Wet' });
  expect(out[0].parsed?.referenceId).toBe('ref-milk');
});

test('blank rows are not carried over, keys are fresh and unique, and the parser\'s other fields are kept', () => {
  const rows = [row('   ', { title: 'Orphan heading' }), row('x', { referenceId: 'rx' })];
  const out = applyParsedIngredients(rows, [result('x', { quantity: 3, note: 'diced' }), result('y')], makeKey, preview);
  expect(out).toHaveLength(2);
  expect(new Set(out.map(r => r.key)).size).toBe(2);
  expect(out[0].parsed).toMatchObject({ quantity: 3, note: 'diced', referenceId: 'rx' });
});

test('a result with no original text cannot match anything and never crashes', () => {
  const out = applyParsedIngredients([row('x', { referenceId: 'rx' })], [{ quantity: 1 } as RecipeIngredient], makeKey, preview);
  expect(out[0].referenceId).toBeUndefined();
});

test('an empty result list gives no rows', () => {
  expect(applyParsedIngredients([row('x')], [], makeKey, preview)).toEqual([]);
});
