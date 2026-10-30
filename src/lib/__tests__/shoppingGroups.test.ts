import { groupByLabel } from '../shoppingGroups';
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
