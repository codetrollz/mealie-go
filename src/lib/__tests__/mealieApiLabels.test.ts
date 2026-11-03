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
