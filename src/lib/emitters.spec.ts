import { jest } from '@jest/globals';

const mockCeBinaryEmitter = Symbol('mockCeBinaryEmitter');
let wasCeImported = false;
jest.unstable_mockModule('./ceBinary.js', () => {
  wasCeImported = true;
  return {
    makeCeBinaryEmitter: jest.fn().mockReturnValue(mockCeBinaryEmitter),
  };
});

const mockGooglePubSubEmitter = Symbol('mockGooglePubSubEmitter');
let wasGooglePubSubImported = false;
jest.unstable_mockModule('./googlePubSub.ts', () => {
  wasGooglePubSubImported = true;
  return {
    makeGooglePubSubEmitter: jest.fn().mockReturnValue(mockGooglePubSubEmitter),
  };
});

const { makeEmitter } = await import('./emitters.js');

describe('makeEmitter', () => {
  test('Transports should be loaded lazily', async () => {
    expect(wasCeImported).toBeFalse();
    expect(wasGooglePubSubImported).toBeFalse();

    await makeEmitter('ce-http-binary');
    expect(wasCeImported).toBeTrue();
    expect(wasGooglePubSubImported).toBeFalse();

    await makeEmitter('google-pubsub');
    expect(wasGooglePubSubImported).toBeTrue();
  });

  test('CloudEvents binary emitter should be returned if requested', async () => {
    await expect(makeEmitter('ce-http-binary')).resolves.toBe(mockCeBinaryEmitter);
  });

  test('Google PubSub emitter should be returned if requested', async () => {
    await expect(makeEmitter('google-pubsub')).resolves.toBe(mockGooglePubSubEmitter);
  });

  test('Unsupported transport should be refused', async () => {
    await expect(makeEmitter('unsupported')).rejects.toThrowWithMessage(
      Error,
      'Unsupported emitter type (unsupported)',
    );
  });
});
