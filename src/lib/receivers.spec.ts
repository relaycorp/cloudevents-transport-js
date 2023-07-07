import { jest } from '@jest/globals';

const mockCeBinaryConverter = Symbol('mockCeBinaryConverter');
let wasCeImported = false;
jest.unstable_mockModule('./ceBinary.js', () => {
  wasCeImported = true;
  return { convertCeBinaryMessage: mockCeBinaryConverter };
});

const mockGooglePubSubConverter = Symbol('mockGooglePubSubConverter');
let wasGooglePubSubImported = false;
jest.unstable_mockModule('./googlePubSub.ts', () => {
  wasGooglePubSubImported = true;
  return {
    convertGooglePubSubMessage: mockGooglePubSubConverter,
  };
});

const { makeReceiver } = await import('./receivers.js');

describe('makeReceiver', () => {
  test('Transports should be load lazily', async () => {
    expect(wasCeImported).toBeFalse();

    await makeReceiver('ce-http-binary');
    expect(wasCeImported).toBeTrue();
    expect(wasGooglePubSubImported).toBeFalse();

    await makeReceiver('google-pubsub');
    expect(wasGooglePubSubImported).toBeTrue();
  });

  test('CloudEvents binary receiver should be returned if requested', async () => {
    await expect(makeReceiver('ce-http-binary')).resolves.toBe(mockCeBinaryConverter);
  });

  test('Google PubSub receiver should be returned if requested', async () => {
    await expect(makeReceiver('google-pubsub')).resolves.toBe(mockGooglePubSubConverter);
  });

  test('Unsupported transport should be refused', async () => {
    await expect(makeReceiver('unsupported')).rejects.toThrowWithMessage(
      Error,
      'Unsupported receiver type (unsupported)',
    );
  });
});
