import { jest } from '@jest/globals';
import type { Message } from 'cloudevents';

import { getMockInstance, mockSpy } from '../testUtils/jest';
import { dropStringPrefix } from '../testUtils/strings';

const mockEmitterFor = mockSpy(jest.fn());
const mockHttpTransport = Symbol('mockHttpTransport');
jest.mock<any>('cloudevents', () => {
  const actualCloudevents = jest.requireActual<any>('cloudevents');
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return
  return {
    ...actualCloudevents,
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
  };
});

// eslint-disable-next-line import/first,import/order,no-duplicate-imports
import { emitterFor, httpTransport, Mode } from 'cloudevents';

// eslint-disable-next-line import/first
import { CE_SINK_URL, EVENT } from '../testUtils/stubs';

// eslint-disable-next-line import/first
import { makeCeBinaryEmitter, convertCeBinaryMessage } from './ceBinary';

describe('makeCeBinaryEmitter', () => {
  test('should create an HTTP transport with the sink URL', () => {
    makeCeBinaryEmitter(CE_SINK_URL);

    expect(httpTransport).toHaveBeenCalledWith(CE_SINK_URL);
  });

  test('should create an HTTP transport with binary mode', () => {
    makeCeBinaryEmitter(CE_SINK_URL);

    expect(emitterFor).toHaveBeenCalledWith(mockHttpTransport, { mode: Mode.BINARY });
  });

  test('should return an emitter function', () => {
    const mockEmitter = Symbol('mockEmitter');
    getMockInstance(emitterFor).mockReturnValue(mockEmitter);

    const emitter = makeCeBinaryEmitter(CE_SINK_URL);

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
