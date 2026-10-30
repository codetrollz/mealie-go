import { groupByLabel, orderLabels } from '../shoppingGroups';
import type { ShoppingLabel, ShoppingListItem } from '../../types';

const label = (id: string): ShoppingLabel => ({ id, groupId: 'g', householdId: 'h', name: id });
const item = (id: string, labelId?: string) =>
  ({ id, shoppingListId: 'l', checked: false, position: 0, isFood: true, labelId } as ShoppingListItem);

test('one section per label in label order, empty labels skipped, unlabelled last', () => {
  const groups = groupByLabel(
    [item('milk', 'dairy'), item('onion', 'produce'), item('mystery'), item('cheese', 'dairy')],
    [label('produce'), label('meat'), label('dairy')],
  );
  expect(groups.map(g => [g.label?.id ?? null, g.items.map(i => i.id)])).toEqual([
    ['produce', ['onion']],
    ['dairy', ['milk', 'cheese']],
    [null, ['mystery']],
  ]);
});

test('an item whose label no longer exists stays visible in the unlabelled section', () => {
  const groups = groupByLabel([item('a', 'deleted-label'), item('b', 'produce')], [label('produce')]);
  expect(groups.map(g => [g.label?.id ?? null, g.items.map(i => i.id)])).toEqual([
    ['produce', ['b']],
    [null, ['a']],
  ]);
});

test('no labels at all: a single unlabelled section with everything', () => {
  const items = [item('a', 'produce'), item('b')];
  expect(groupByLabel(items, [])).toEqual([{ label: null, items }]);
});

test('every item ends up in exactly one section', () => {
  const items = [item('a', 'x'), item('b', 'y'), item('c'), item('d', 'z')];
  const total = groupByLabel(items, [label('x'), label('y')]).reduce((n, g) => n + g.items.length, 0);
  expect(total).toBe(items.length);
});

const setting = (labelId: string, position: number) => ({ id: `s-${labelId}`, shoppingListId: 'l', labelId, position });

test('orderLabels follows the positions saved on the list, lowest first', () => {
  const labels = [label('dairy'), label('meat'), label('produce')];   // the global (alphabetical-ish) order
  const settings = [setting('produce', 0), setting('meat', 1), setting('dairy', 2)];
  expect(orderLabels(labels, settings).map(l => l.id)).toEqual(['produce', 'meat', 'dairy']);
});

test('a label with no setting goes after the ones that have one, in its original order', () => {
  const labels = [label('a'), label('b'), label('c'), label('d')];
  expect(orderLabels(labels, [setting('c', 0), setting('a', 5)]).map(l => l.id)).toEqual(['c', 'a', 'b', 'd']);
});

test('equal positions keep the original order, and no settings means no change', () => {
  const labels = [label('x'), label('y')];
  expect(orderLabels(labels, [setting('x', 3), setting('y', 3)]).map(l => l.id)).toEqual(['x', 'y']);
  expect(orderLabels(labels, undefined)).toBe(labels);
  expect(orderLabels(labels, [])).toBe(labels);
});

test('the reported case: Produce first on the list but last in the label list', () => {
  const labels = [label('dairy'), label('meat'), label('produce')];
  const ordered = orderLabels(labels, [setting('produce', 0), setting('meat', 3), setting('dairy', 11)]);
  const sections = groupByLabel([item('milk', 'dairy'), item('beef', 'meat'), item('onion', 'produce')], ordered);
  expect(sections.map(g => g.label?.id)).toEqual(['produce', 'meat', 'dairy']);
});
