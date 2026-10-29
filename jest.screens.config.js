// Renders real screens with react-native-web in jsdom and saves the resulting
// HTML, so a browser can screenshot them (see the screenshot script). This is
// how dark and light themes are compared visually without a device.
module.exports = {
  testEnvironment: 'jsdom',
  roots: ['<rootDir>/src'],
  testMatch: ['**/*.shot.tsx'],
  globalSetup: '<rootDir>/src/testing/globalSetup.js',
  setupFiles: ['<rootDir>/src/testing/screenshots/setup.ts', '<rootDir>/src/testing/setup.ts'],
  transform: { '^.+\\.[jt]sx?$': ['babel-jest', { configFile: './babel.config.js' }] },
  transformIgnorePatterns: ['node_modules/(?!(react-native-web|@react-navigation|react-native-screens|react-native-safe-area-context|expo|expo-.*|@expo|i18next|react-i18next)/)'],
  moduleNameMapper: { '^react-native$': 'react-native-web' },
  moduleFileExtensions: ['web.tsx', 'web.ts', 'tsx', 'ts', 'web.js', 'js', 'json'],
};
