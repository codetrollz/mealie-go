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
