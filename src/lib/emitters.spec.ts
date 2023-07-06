import { jest } from '@jest/globals';

const mockCeBinaryEmitter = Symbol('mockCeBinaryEmitter');
jest.unstable_mockModule('./ceBinary.js', () => ({
  makeCeBinaryEmitter: jest.fn().mockReturnValue(mockCeBinaryEmitter),
}));

const { makeEmitter } = await import('./emitters.js');

describe('makeEmitter', () => {
  test('CloudEvents binary emitter should be returned if requested', () => {
    expect(makeEmitter('ce-http-binary')).toBe(mockCeBinaryEmitter);
  });

  test('Unsupported emitter type should be refused', () => {
    expect(() => makeEmitter('unsupported')).toThrowWithMessage(
      Error,
      'Unsupported emitter type (unsupported)',
    );
  });
});
