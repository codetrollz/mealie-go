import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../mealieApi';

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(async (key: string) => (key.includes('proxy') ? null : 'https://mealie.test')),
  setItemAsync: jest.fn(), deleteItemAsync: jest.fn(),
}));

beforeEach(async () => {
  await AsyncStorage.setItem('mealie_go.server_url', 'https://mealie.test');
  await AsyncStorage.setItem('mealie_go.auth_token', 'token');
});

test('shopping labels are fetched from /api/groups/labels, which exists in Mealie 3, not the old household route', async () => {
  const fetchMock = jest.fn().mockResolvedValue({
    ok: true, status: 200, json: async () => ({ items: [{ id: 'dairy', name: 'Dairy' }] }),
  });
  (global as any).fetch = fetchMock;
  const result = await api.getShoppingLabels();
  expect(fetchMock).toHaveBeenCalledTimes(1);
  const url = fetchMock.mock.calls[0][0] as string;
  expect(url).toBe('https://mealie.test/api/groups/labels?perPage=100');
  expect(url).not.toContain('/households/shopping/labels');
  expect(result.items[0].name).toBe('Dairy');
});

const reply = (body: unknown) => jest.fn().mockResolvedValue({ ok: true, status: 200, json: async () => body, text: async () => JSON.stringify(body) });

test('adding a shopping item sends the typed text as the note and reads Mealie 3\'s created-items reply', async () => {
  const fetchMock = reply({ createdItems: [{ id: 'new1', note: 'paper towels', display: '1 paper towels' }], updatedItems: [], deletedItems: [] });
  (global as any).fetch = fetchMock;
  const changes = await api.addShoppingItem('list-1', 'paper towels', undefined, 'label-9');
  const [url, init] = fetchMock.mock.calls[0];
  expect(url).toBe('https://mealie.test/api/households/shopping/items');
  expect(JSON.parse(init.body)).toEqual({ shoppingListId: 'list-1', note: 'paper towels', isFood: false, checked: false, labelId: 'label-9' });
  expect(changes.createdItems).toEqual([{ id: 'new1', note: 'paper towels', display: '1 paper towels' }]);
});

test('updating a shopping item reads the updated-items reply (not the item itself)', async () => {
  (global as any).fetch = reply({ createdItems: [], updatedItems: [{ id: 'a', checked: true, display: 'milk' }], deletedItems: [] });
  const changes = await api.updateShoppingItem('a', { checked: true });
  expect(changes.updatedItems).toEqual([{ id: 'a', checked: true, display: 'milk' }]);
});

test('an older server that answers with the item itself still works', async () => {
  (global as any).fetch = reply({ id: 'a', note: 'milk', display: 'milk' });
  expect((await api.addShoppingItem('l', 'milk')).createdItems[0].display).toBe('milk');
  (global as any).fetch = reply({ id: 'a', checked: true });
  expect((await api.updateShoppingItem('a', { checked: true })).updatedItems[0].checked).toBe(true);
});

test('meal plans are read with include_week_entries, which Mealie 3.30 needs to return week-long entries', async () => {
  const fetchMock = reply({ items: [] });
  (global as any).fetch = fetchMock;
  await api.getMealPlans('2026-11-09', '2026-11-15');
  const url = new URL(fetchMock.mock.calls[0][0] as string);
  expect(url.pathname).toBe('/api/households/mealplans');
  expect(url.searchParams.get('include_week_entries')).toBe('true');
  expect(url.searchParams.get('start_date')).toBe('2026-11-09');
  expect(url.searchParams.get('end_date')).toBe('2026-11-15');
});

test('a week-long entry is created with its endDate, a day entry without one', async () => {
  const fetchMock = reply({ id: 1 });
  (global as any).fetch = fetchMock;
  await api.createMealPlan({ date: '2026-11-09', endDate: '2026-11-15', entryType: 'dinner', recipeId: 'r1' });
  expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ date: '2026-11-09', endDate: '2026-11-15', entryType: 'dinner', recipeId: 'r1' });
});

test('the server version comes from the authenticated /api/app/about and a failure gives null', async () => {
  (global as any).fetch = reply({ version: 'v3.30.0' });
  expect(await api.getAppAbout()).toEqual({ version: 'v3.30.0' });
  (global as any).fetch = jest.fn().mockRejectedValue(new Error('offline'));
  expect(await api.getAppAbout()).toBeNull();
});
