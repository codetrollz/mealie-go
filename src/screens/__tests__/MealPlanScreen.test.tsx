import React from 'react';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import MealPlanScreen from '../MealPlanScreen';
import { renderScreen } from '../../testing/render';
import { api } from '../../lib/mealieApi';

jest.mock('../../lib/mealieApi', () => ({
  api: { getMealPlans: jest.fn(), createMealPlan: jest.fn(), deleteMealPlan: jest.fn(), getRecipes: jest.fn(), getRandomRecipe: jest.fn() },
}));

const entry = (id: number, date: string, title: string) => ({
  id, groupId: 'g', householdId: 'h', userId: 'u', date, entryType: 'dinner', title, text: '',
});

// Thursday 2026-10-29 00:25 UTC is Wednesday 2026-10-28 20:25 in New York:
// the evening when the local date and the UTC date differ.
const NOW = new Date('2026-10-29T00:25:00Z');

beforeEach(() => {
  // Fake only the clock; timers must stay real so async rendering works.
  jest.useFakeTimers({ now: NOW, doNotFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'setImmediate', 'clearImmediate', 'nextTick', 'queueMicrotask'] });
  (api.getMealPlans as jest.Mock).mockResolvedValue({
    items: [entry(1, '2026-10-27', 'Tuesday dinner'), entry(2, '2026-10-28', 'Wednesday dinner')],
  });
});
afterEach(() => jest.useRealTimers());

test('a weekday shows the meals dated that day, in the evening west of UTC', async () => {
  await renderScreen(<MealPlanScreen />);
  await waitFor(() => expect(api.getMealPlans).toHaveBeenCalled());
  fireEvent.press(screen.getByText('Wed'));
  expect(await screen.findByText('Wednesday dinner')).toBeTruthy();
  expect(screen.queryByText('Tuesday dinner')).toBeNull();
});

test('opens on today, not on the first day of the week', async () => {
  // Wednesday evening in New York; the plan has meals on Tuesday and Wednesday.
  await renderScreen(<MealPlanScreen />);
  await waitFor(() => expect(api.getMealPlans).toHaveBeenCalled());
  expect(await screen.findByText('Wednesday dinner')).toBeTruthy();
  expect(screen.queryByText('Tuesday dinner')).toBeNull();
});
