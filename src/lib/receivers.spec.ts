import { jest } from '@jest/globals';

const mockCeBinaryConverter = Symbol('mockCeBinaryConverter');
let wasCeImported = false;
jest.unstable_mockModule('./ceBinary.js', () => {
  wasCeImported = true;
  return { convertCeBinaryMessage: mockCeBinaryConverter };
});

const { makeReceiver } = await import('./receivers.js');

describe('makeReceiver', () => {
  test('Transports should be load lazily', async () => {
    expect(wasCeImported).toBeFalse();

    await makeReceiver('ce-http-binary');
    expect(wasCeImported).toBeTrue();
  });

  test('CloudEvents binary receiver should be returned if requested', async () => {
    await expect(makeReceiver('ce-http-binary')).resolves.toBe(mockCeBinaryConverter);
  });

  test('Unsupported transport should be refused', async () => {
    await expect(makeReceiver('unsupported')).rejects.toThrowWithMessage(
      Error,
      'Unsupported receiver type (unsupported)',
    );
  });
});
