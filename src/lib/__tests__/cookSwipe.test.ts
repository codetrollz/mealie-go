import { cookSwipeDirection, COOK_SWIPE_MIN_DISTANCE } from '../cookSwipe';

test('swiping up goes to the next step, swiping down to the previous one', () => {
  expect(cookSwipeDirection(-150, 5, true, true)).toBe('next');
  expect(cookSwipeDirection(150, -5, true, true)).toBe('prev');
});

test('a long step: up only moves on from its bottom, down only from its top', () => {
  expect(cookSwipeDirection(-150, 0, true, false)).toBeNull();   // at the top: swiping up scrolls the text
  expect(cookSwipeDirection(-150, 0, false, true)).toBe('next'); // at the bottom: swiping up moves on
  expect(cookSwipeDirection(150, 0, false, true)).toBeNull();    // at the bottom: swiping down scrolls back up
  expect(cookSwipeDirection(150, 0, true, false)).toBe('prev');  // at the top: swiping down goes back
  expect(cookSwipeDirection(-150, 0, false, false)).toBeNull();  // mid-text: scrolling only
});

test('a short drag is not a swipe', () => {
  expect(cookSwipeDirection(-(COOK_SWIPE_MIN_DISTANCE - 1), 0, true, true)).toBeNull();
  expect(cookSwipeDirection(-COOK_SWIPE_MIN_DISTANCE, 0, true, true)).toBe('next');
});

test('a mostly sideways gesture never changes the step', () => {
  expect(cookSwipeDirection(-80, 200, true, true)).toBeNull();
  expect(cookSwipeDirection(-100, 80, true, true)).toBeNull();
  expect(cookSwipeDirection(-150, 50, true, true)).toBe('next');
});
