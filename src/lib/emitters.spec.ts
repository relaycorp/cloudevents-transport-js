import { jest } from '@jest/globals';

const mockCeBinaryEmitter = Symbol('mockCeBinaryEmitter');
jest.unstable_mockModule('./ceBinary.js', () => ({
  makeCeBinaryEmitter: jest.fn().mockReturnValue(mockCeBinaryEmitter),
}));

const { makeEmitter } = await import('./emitters.js');

describe('makeEmitter', () => {
  test('CloudEvents binary transport should be returned if requested', () => {
    expect(makeEmitter('ce-http-binary')).toBe(mockCeBinaryEmitter);
  });

  test('Unsupported transport should be refused', () => {
    expect(() => makeEmitter('unsupported')).toThrowWithMessage(
      Error,
      'Unsupported emitter type (unsupported)',
    );
  });

  test.todo('Transports should be loaded lazily');
});
