import { supportsWeekEntries } from '../serverFeatures';

test.each([
  ['v3.30.0', true], ['3.30.0', true], ['v3.30.1', true], ['v3.31.0', true], ['v4.0.0', true], ['v10.2.0', true],
  ['v3.29.9', false], ['v3.29.0', false], ['v2.8.0', false], ['v1.12.0', false], ['3.9.0', false],
])('%s supports week entries: %s', (version, expected) => {
  expect(supportsWeekEntries(version)).toBe(expected);
});

test.each([undefined, null, '', 'develop', 'nightly', 'v', 'abc.def'])(
  'an unknown version (%p) shows the feature rather than hiding it', (version) => {
    expect(supportsWeekEntries(version as string | undefined)).toBe(true);
  });
