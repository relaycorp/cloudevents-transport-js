import { jest } from '@jest/globals';
import type { Message } from 'cloudevents';
import envVar from 'env-var';

import { configureMockEnvVars } from '../testUtils/envVars.js';
import { getMockInstance, mockSpy } from '../testUtils/jest.js';
import { EVENT } from '../testUtils/stubs.js';
import { dropStringPrefix } from '../testUtils/strings.js';

const mockEmitterFor = mockSpy(jest.fn());
const mockHttpTransport = Symbol('mockHttpTransport');
jest.unstable_mockModule('cloudevents', () => ({
  emitterFor: jest.fn<any>().mockReturnValue(mockEmitterFor),
  httpTransport: jest.fn<any>().mockReturnValue(mockHttpTransport),

  HTTP: {
    toEvent: (message: Message) => {
      const attributes = Object.entries(message.headers).reduce((acc, [key, value]) => {
        const attributeName = dropStringPrefix(key, 'ce-');
        return { ...acc, [attributeName]: value };
      }, {});
      return { ...attributes, data: message.body };
    },
  },

  // eslint-disable-next-line @typescript-eslint/naming-convention
  Mode: { BINARY: 'binary' },
}));
const { makeCeBinaryEmitter, convertCeBinaryMessage } = await import('./ceBinary.js');
// eslint-disable-next-line @typescript-eslint/naming-convention
const { emitterFor, httpTransport, Mode } = await import('cloudevents');

const K_SINK = 'https://sink.example.com/';

const mockEnvVars = configureMockEnvVars({ K_SINK });

describe('makeCeBinaryEmitter', () => {
  test('should fail if K_SINK is not set', () => {
    mockEnvVars({ K_SINK: undefined });

    expect(makeCeBinaryEmitter).toThrowWithMessage(envVar.EnvVarError, /K_SINK/u);
  });

  test('should fail if K_SINK is not a valid URL', () => {
    mockEnvVars({ K_SINK: 'not a URL' });

    expect(makeCeBinaryEmitter).toThrowWithMessage(envVar.EnvVarError, /K_SINK/u);
  });

  test('should create an HTTP transport with the K_SINK URL', () => {
    makeCeBinaryEmitter();

    expect(httpTransport).toHaveBeenCalledWith(K_SINK);
  });

  test('should create an HTTP transport with binary mode', () => {
    makeCeBinaryEmitter();

    expect(emitterFor).toHaveBeenCalledWith(mockHttpTransport, { mode: Mode.BINARY });
  });

  test('should return an emitter function', () => {
    const mockEmitter = Symbol('mockEmitter');
    getMockInstance(emitterFor).mockReturnValue(mockEmitter);

    const emitter = makeCeBinaryEmitter();

    expect(emitter).toBe(mockEmitter);
  });
});

describe('convertCeBinaryMessage', () => {
  const headers = {
    // eslint-disable-next-line @typescript-eslint/naming-convention
    'ce-id': EVENT.id,
    // eslint-disable-next-line @typescript-eslint/naming-convention
    'ce-source': EVENT.source,
    // eslint-disable-next-line @typescript-eslint/naming-convention
    'ce-type': EVENT.type,
  };
  const body = EVENT.data!;

  test('Message headers should be converted to attributes', () => {
    const event = convertCeBinaryMessage(headers, body);

    expect(event.id).toBe(headers['ce-id']);
    expect(event.source).toBe(headers['ce-source']);
    expect(event.type).toBe(headers['ce-type']);
  });

  test('Message body should be converted to CloudEvent data', () => {
    const event = convertCeBinaryMessage(headers, body);

    expect(event.data).toMatchObject(body);
  });
});
