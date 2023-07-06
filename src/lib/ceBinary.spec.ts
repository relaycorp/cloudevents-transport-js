import { jest } from '@jest/globals';
import envVar from 'env-var';

import { configureMockEnvVars } from '../testUtils/envVars.js';
import { getMockInstance, mockSpy } from '../testUtils/jest.js';

const mockEmitterFor = mockSpy(jest.fn());
const mockHttpTransport = Symbol('mockHttpTransport');
jest.unstable_mockModule('cloudevents', () => ({
  emitterFor: jest.fn<any>().mockReturnValue(mockEmitterFor),
  httpTransport: jest.fn<any>().mockReturnValue(mockHttpTransport),
  // eslint-disable-next-line @typescript-eslint/naming-convention
  Mode: { BINARY: 'binary' },
}));
const { makeCeBinaryEmitter } = await import('./ceBinary.js');
// eslint-disable-next-line @typescript-eslint/naming-convention
const { emitterFor, httpTransport, Mode } = await import('cloudevents');

const K_SINK = 'https://sink.example.com/';

const mockEnvVars = configureMockEnvVars({ K_SINK });

describe('ceBinary', () => {
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
});
