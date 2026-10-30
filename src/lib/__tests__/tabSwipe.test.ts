import { swipeTarget, SWIPE_MIN_DISTANCE } from '../tabSwipe';

const TABS = ['ingredients', 'steps', 'notes', 'comments'] as const;

test('swiping left goes to the next tab, right to the previous one', () => {
  expect(swipeTarget(TABS, 'ingredients', -120, 5)).toBe('steps');
  expect(swipeTarget(TABS, 'steps', 120, -5)).toBe('ingredients');
  expect(swipeTarget(TABS, 'steps', -120, 0)).toBe('notes');
});

test('the ends do not wrap around', () => {
  expect(swipeTarget(TABS, 'ingredients', 200, 0)).toBeNull();
  expect(swipeTarget(TABS, 'comments', -200, 0)).toBeNull();
});

test('a short drag is not a swipe', () => {
  expect(swipeTarget(TABS, 'ingredients', -(SWIPE_MIN_DISTANCE - 1), 0)).toBeNull();
  expect(swipeTarget(TABS, 'ingredients', -SWIPE_MIN_DISTANCE, 0)).toBe('steps');
});

test('a mostly vertical gesture (scrolling) never changes the tab', () => {
  expect(swipeTarget(TABS, 'ingredients', -80, 200)).toBeNull();
  expect(swipeTarget(TABS, 'ingredients', -90, 60)).toBeNull(); // diagonal, more up/down than a swipe allows
  expect(swipeTarget(TABS, 'ingredients', -120, 40)).toBe('steps');
});

test('an unknown active tab does nothing', () => {
  expect(swipeTarget(TABS, 'bogus' as never, -120, 0)).toBeNull();
});
