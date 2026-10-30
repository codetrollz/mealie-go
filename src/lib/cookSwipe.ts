/** Same feel as the recipe tab swipe: long enough and clearly more up/down than sideways. */
export const COOK_SWIPE_MIN_DISTANCE = 60;
export const COOK_SWIPE_VERTICAL_RATIO = 1.8;
/** The pan starts after 20dp up/down and gives up after 20dp sideways. */
export const COOK_SWIPE_ACTIVATE_Y = 20;
export const COOK_SWIPE_FAIL_X = 20;

export type CookSwipe = 'next' | 'prev' | null;

/**
 * What a vertical swipe on the step means. Swiping up goes to the next step and swiping down to the
 * previous one, but only when the step text was already scrolled to the matching end when the swipe
 * began: swiping up on a long step scrolls it, and only a swipe that starts at its bottom moves on.
 * (A short step that fits on screen is at both ends, so either direction works.)
 */
export function cookSwipeDirection(dy: number, dx: number, atTop: boolean, atBottom: boolean): CookSwipe {
  if (Math.abs(dy) < COOK_SWIPE_MIN_DISTANCE || Math.abs(dy) < Math.abs(dx) * COOK_SWIPE_VERTICAL_RATIO) return null;
  if (dy < 0) return atBottom ? 'next' : null;
  return atTop ? 'prev' : null;
}
