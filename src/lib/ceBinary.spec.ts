import { jest } from '@jest/globals';
import type { Message } from 'cloudevents';

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

const SINK_URL = 'https://sink.example.com/';

describe('makeCeBinaryEmitter', () => {
  test('should create an HTTP transport with the sink URL', () => {
    makeCeBinaryEmitter(SINK_URL);

    expect(httpTransport).toHaveBeenCalledWith(SINK_URL);
  });

  test('should create an HTTP transport with binary mode', () => {
    makeCeBinaryEmitter(SINK_URL);

    expect(emitterFor).toHaveBeenCalledWith(mockHttpTransport, { mode: Mode.BINARY });
  });

  test('should return an emitter function', () => {
    const mockEmitter = Symbol('mockEmitter');
    getMockInstance(emitterFor).mockReturnValue(mockEmitter);

    const emitter = makeCeBinaryEmitter(SINK_URL);

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
