import { jest } from '@jest/globals';

import { CE_SINK_URL, GOOGLE_PUBSUB_TOPIC } from '../testUtils/stubs';

const mockCeBinaryEmitter = Symbol('mockCeBinaryEmitter');
let wasCeImported = false;
jest.mock<any>('./ceBinary', () => {
  wasCeImported = true;
  return {
    makeCeBinaryEmitter: jest.fn().mockReturnValue(mockCeBinaryEmitter),
  };
});

const mockGooglePubSubEmitter = Symbol('mockGooglePubSubEmitter');
let wasGooglePubSubImported = false;
jest.mock<any>('./googlePubSub', () => {
  wasGooglePubSubImported = true;
  return {
    makeGooglePubSubEmitter: jest.fn().mockReturnValue(mockGooglePubSubEmitter),
  };
});

// eslint-disable-next-line import/first
import { makeEmitter } from './emitters';

describe('makeEmitter', () => {
  test('Transports should be loaded lazily', async () => {
    expect(wasCeImported).toBeFalse();
    expect(wasGooglePubSubImported).toBeFalse();

    await makeEmitter('ce-http-binary', CE_SINK_URL);
    expect(wasCeImported).toBeTrue();
    expect(wasGooglePubSubImported).toBeFalse();

    await makeEmitter('google-pubsub', GOOGLE_PUBSUB_TOPIC);
    expect(wasGooglePubSubImported).toBeTrue();
  });

  test('CloudEvents binary emitter should be returned if requested', async () => {
    await expect(makeEmitter('ce-http-binary', CE_SINK_URL)).resolves.toBe(mockCeBinaryEmitter);
  });

  test('Google PubSub emitter should be returned if requested', async () => {
    await expect(makeEmitter('google-pubsub', GOOGLE_PUBSUB_TOPIC)).resolves.toBe(
      mockGooglePubSubEmitter,
    );
  });

  test('Unsupported transport should be refused', async () => {
    await expect(makeEmitter('unsupported', 'foo')).rejects.toThrowWithMessage(
      Error,
      'Unsupported emitter type (unsupported)',
    );
  });
});
