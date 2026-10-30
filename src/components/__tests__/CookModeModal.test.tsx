import React from 'react';
import { act, fireEvent, screen } from '@testing-library/react-native';
import { fireGestureHandler, getByGestureTestId } from 'react-native-gesture-handler/jest-utils';
import { State } from 'react-native-gesture-handler';
import CookModeModal from '../CookModeModal';
import { renderScreen } from '../../testing/render';

jest.mock('expo-keep-awake', () => ({ useKeepAwake: jest.fn() }));

const steps = [
  { text: 'Brown the beef.' }, { text: 'Add the onions.' }, { text: 'Simmer for ten minutes.' },
];
const open = () => renderScreen(
  <CookModeModal visible onClose={jest.fn()} recipeName="Stew" steps={steps} ingredientLines={[]} />,
);
const swipe = async (translationY: number, translationX = 0, endState: typeof State.END | typeof State.CANCELLED = State.END) => {
  await act(async () => {
    fireGestureHandler(getByGestureTestId('cook-step-swipe'), [
      { state: State.BEGAN, translationX: 0, translationY: 0 },
      { state: State.ACTIVE, translationX: translationX / 2, translationY: translationY / 2 },
      { state: endState, translationX, translationY },
    ]);
  });
};

test('swiping up moves to the next step and swiping down comes back', async () => {
  await open();
  expect(await screen.findByText('Step 1 of 3')).toBeTruthy();
  await swipe(-200);
  expect(await screen.findByText('Step 2 of 3')).toBeTruthy();
  expect(screen.getByText('Add the onions.')).toBeTruthy();
  await swipe(200);
  expect(await screen.findByText('Step 1 of 3')).toBeTruthy();
});

test('it stops at the first and last step', async () => {
  await open();
  await screen.findByText('Step 1 of 3');
  await swipe(200);                       // down on the first step: nowhere to go
  expect(screen.getByText('Step 1 of 3')).toBeTruthy();
  await swipe(-200); await swipe(-200);   // steps 2 and 3
  expect(await screen.findByText('Step 3 of 3')).toBeTruthy();
  await swipe(-200);                      // up on the last step
  expect(screen.getByText('Step 3 of 3')).toBeTruthy();
});

test('short drags and sideways swipes do nothing', async () => {
  await open();
  await screen.findByText('Step 1 of 3');
  await swipe(-30);
  await swipe(-80, 200);
  expect(screen.getByText('Step 1 of 3')).toBeTruthy();
});

test('a long step scrolls first: up only moves on once its text has been read to the bottom', async () => {
  await open();
  await screen.findByText('Step 1 of 3');
  const scroll = screen.getByTestId('cook-step-scroll');
  await fireEvent(scroll, 'layout', { nativeEvent: { layout: { height: 300 } } });
  await fireEvent(scroll, 'contentSizeChange', 300, 900);   // 900dp of text in a 300dp window
  await fireEvent.scroll(scroll, { nativeEvent: { contentOffset: { y: 0 }, contentSize: { height: 900 }, layoutMeasurement: { height: 300 } } });
  await swipe(-200);                                          // at the top of a long step: that is a scroll
  expect(screen.getByText('Step 1 of 3')).toBeTruthy();
  await fireEvent.scroll(scroll, { nativeEvent: { contentOffset: { y: 600 }, contentSize: { height: 900 }, layoutMeasurement: { height: 300 } } });
  await swipe(-200);                                          // now at the bottom: move on
  expect(await screen.findByText('Step 2 of 3')).toBeTruthy();
});

test('the buttons still work', async () => {
  await open();
  await screen.findByText('Step 1 of 3');
  await fireEvent.press(screen.getByText('Next ›'));
  expect(await screen.findByText('Step 2 of 3')).toBeTruthy();
});

test('a cancelled gesture (for example a system back swipe) does not move the step', async () => {
  await open();
  await screen.findByText('Step 1 of 3');
  await swipe(-200, 0, State.CANCELLED);
  expect(screen.getByText('Step 1 of 3')).toBeTruthy();
  await swipe(-200);                       // the same gesture, completed, does move on
  expect(await screen.findByText('Step 2 of 3')).toBeTruthy();
});
