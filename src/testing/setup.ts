// Jest setup: native modules that have no JS implementation under test.
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);
// react-native-gesture-handler: lets GestureDetector render under Jest and exposes fireGestureHandler.
require('react-native-gesture-handler/jestSetup');
