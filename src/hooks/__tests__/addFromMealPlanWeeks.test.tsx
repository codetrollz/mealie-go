import { act, renderHook, waitFor } from '@testing-library/react-native';
import { useShoppingListDetail } from '../useShoppingLists';
import { api } from '../../lib/mealieApi';

jest.mock('../../lib/mealieApi', () => ({
  api: {
    getShoppingList: jest.fn(), getShoppingLists: jest.fn(), getShoppingLabels: jest.fn(), getMealPlans: jest.fn(),
    addRecipesToShoppingList: jest.fn(),
  },
}));

const entry = (id: number, date: string, recipeId?: string, endDate?: string) => ({
  id, groupId: 'g', householdId: 'h', userId: 'u', date, endDate, entryType: 'dinner' as const, recipeId, title: 't',
});

beforeEach(() => {
  jest.clearAllMocks();
  (api.getShoppingLabels as jest.Mock).mockResolvedValue({ items: [] });
  (api.getShoppingList as jest.Mock).mockResolvedValue({ id: 'l', name: 'L', listItems: [] });
  (api.addRecipesToShoppingList as jest.Mock).mockResolvedValue(undefined);
});

async function addWeeks(perWeek: ReturnType<typeof entry>[][], weeks: { start: string; end: string }[]) {
  perWeek.forEach((items, i) => (api.getMealPlans as jest.Mock).mockResolvedValueOnce({ items }));
  const hook = await renderHook(() => useShoppingListDetail('l'));
  await waitFor(() => expect(hook.result.current.list).not.toBeNull());
  let count = -1;
  await act(async () => { count = await hook.result.current.addFromMealPlanWeeks(weeks); });
  return count;
}

const W1 = { start: '2026-11-02', end: '2026-11-08' };
const W2 = { start: '2026-11-09', end: '2026-11-15' };

test('day entries are added once each, as before', async () => {
  const count = await addWeeks([[entry(1, '2026-11-03', 'a'), entry(2, '2026-11-04', 'b'), entry(3, '2026-11-05', 'a')]], [W1]);
  expect(count).toBe(2);
  expect(api.addRecipesToShoppingList).toHaveBeenCalledWith('l', ['a', 'b']);
});

test('a week entry that starts in the week is added', async () => {
  const count = await addWeeks([[entry(1, '2026-11-02', 'a', '2026-11-08')]], [W1]);
  expect(count).toBe(1);
  expect(api.addRecipesToShoppingList).toHaveBeenCalledWith('l', ['a']);
});

test('a week entry that started in the previous week and only overlaps this one is not added', async () => {
  // Wed 11-04 .. Tue 11-10: the server returns it for both weeks; only week 1 holds its start date.
  const wed = entry(1, '2026-11-04', 'a', '2026-11-10');
  const count = await addWeeks([[wed], [wed, entry(2, '2026-11-11', 'b')]], [W1, W2]);
  expect(count).toBe(2);
  expect(api.addRecipesToShoppingList).toHaveBeenCalledWith('l', ['a', 'b']);   // 'a' once, from week 1
});

test('a week with only an overlapping week entry adds nothing', async () => {
  const count = await addWeeks([[entry(1, '2026-11-04', 'a', '2026-11-10')]], [W2]);
  expect(count).toBe(0);
  expect(api.addRecipesToShoppingList).not.toHaveBeenCalled();
});

test('each week is judged against its own dates, not the first week\'s', async () => {
  // W2's response holds one week entry that starts in W2 (add) and one that started in W1 (skip).
  const count = await addWeeks([[], [entry(1, '2026-11-09', 'a', '2026-11-15'), entry(2, '2026-11-04', 'b', '2026-11-10')]], [W1, W2]);
  expect(count).toBe(1);
  expect(api.addRecipesToShoppingList).toHaveBeenCalledWith('l', ['a']);
});
