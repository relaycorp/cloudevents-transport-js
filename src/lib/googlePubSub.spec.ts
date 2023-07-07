import { jest } from '@jest/globals';
import type { CloudEvent } from 'cloudevents';
import { formatISO, getUnixTime, setMilliseconds } from 'date-fns';
import envVar from 'env-var';

import { configureMockEnvVars } from '../testUtils/envVars.js';
import { mockSpy } from '../testUtils/jest.js';
import { EVENT } from '../testUtils/stubs.js';

const mockPublishMessage = mockSpy(jest.fn<any>().mockResolvedValue(undefined));
const mockTopic = jest.fn<any>().mockReturnValue({ publishMessage: mockPublishMessage });
jest.unstable_mockModule('@google-cloud/pubsub', () => ({
  // eslint-disable-next-line @typescript-eslint/naming-convention
  PubSub: jest.fn<any>().mockReturnValue({
    topic: mockTopic,
  }),
}));
const { makeGooglePubSubEmitter } = await import('./googlePubSub.js');

const CE_GPUBSUB_TOPIC = 'the topic';
const mockEnvVars = configureMockEnvVars({ CE_GPUBSUB_TOPIC });

describe('makeGooglePubSubEmitter', () => {
  describe('Message', () => {
    describe('Data', () => {
      test('Buffer should be passed on as is', async () => {
        expect(EVENT.data).toBeInstanceOf(Buffer);

        await makeGooglePubSubEmitter()(EVENT);

        expect(mockPublishMessage).toHaveBeenCalledWith(
          expect.objectContaining({ data: EVENT.data }),
        );
      });

      test('String should be passed on as is', async () => {
        const event = EVENT.cloneWith({ data: 'data', datacontenttype: 'text/plain' });
        expect(event.data).toBeString();

        await makeGooglePubSubEmitter()(event);

        expect(mockPublishMessage).toHaveBeenCalledWith(
          expect.objectContaining({ data: event.data }),
        );
      });

      test('Other types should be JSON-serialised', async () => {
        const event = EVENT.cloneWith({
          data: { foo: 'bar' },
          datacontenttype: 'application/json',
        });

        await makeGooglePubSubEmitter()(event);

        expect(mockPublishMessage).toHaveBeenCalledWith(
          expect.objectContaining({ data: JSON.stringify(event.data) }),
        );
      });
    });

    test('Id should be taken from CloudEvent id', async () => {
      await makeGooglePubSubEmitter()(EVENT);

      expect(mockPublishMessage).toHaveBeenCalledWith(
        expect.objectContaining({ messageId: EVENT.id }),
      );
    });

    test('Publish time should be taken from CloudEvent time if set', async () => {
      const eventTime = setMilliseconds(new Date(), 0);
      const event = EVENT.cloneWith({ time: formatISO(eventTime) });

      await makeGooglePubSubEmitter()(event);

      expect(mockPublishMessage).toHaveBeenCalledWith(
        expect.objectContaining({ publishTime: { seconds: getUnixTime(eventTime) } }),
      );
    });

    test('Publish time should be unset if absent from CloudEvent', async () => {
      const event = { ...EVENT, time: undefined };

      await makeGooglePubSubEmitter()(event as CloudEvent<unknown>);

      expect(mockPublishMessage).toHaveBeenCalledWith(
        expect.objectContaining({ publishTime: undefined }),
      );
    });

    describe('CloudEvents attributes unsupported by PubSub', () => {
      test('Spec version should be stored as custom attribute', async () => {
        await makeGooglePubSubEmitter()(EVENT);

        expect(mockPublishMessage).toHaveBeenCalledWith(
          expect.objectContaining({
            attributes: expect.objectContaining({ specversion: EVENT.specversion }),
          }),
        );
      });

      test('Data schema should be stored as custom attribute if present', async () => {
        const event = EVENT.cloneWith({ dataschema: 'https://example.com/schema' });

        await makeGooglePubSubEmitter()(event);

        expect(mockPublishMessage).toHaveBeenCalledWith(
          expect.objectContaining({
            attributes: expect.objectContaining({ dataschema: event.dataschema }),
          }),
        );
      });

      test('Data schema should not be stored as custom attribute if absent', async () => {
        await makeGooglePubSubEmitter()(EVENT);

        expect(mockPublishMessage).not.toHaveBeenCalledWith(
          expect.objectContaining({
            attributes: expect.objectContaining({ dataschema: expect.anything() }),
          }),
        );
      });

      test('Data content type should be stored as custom attribute', async () => {
        const event = EVENT.cloneWith({ datacontenttype: 'text/plain' });

        await makeGooglePubSubEmitter()(event);

        expect(mockPublishMessage).toHaveBeenCalledWith(
          expect.objectContaining({
            attributes: expect.objectContaining({ datacontenttype: event.datacontenttype }),
          }),
        );
      });

      test('Data should not be set as a custom attribute', async () => {
        await makeGooglePubSubEmitter()(EVENT);

        expect(mockPublishMessage).not.toHaveBeenCalledWith(
          expect.objectContaining({
            attributes: expect.objectContaining({ data: expect.anything() }),
          }),
        );
      });

      test('Data base64 should not be set as a custom attribute', async () => {
        await makeGooglePubSubEmitter()(EVENT);

        expect(mockPublishMessage).not.toHaveBeenCalledWith(
          expect.objectContaining({
            // eslint-disable-next-line @typescript-eslint/naming-convention,camelcase
            attributes: expect.objectContaining({ data_base64: expect.anything() }),
          }),
        );
      });

      test('Subject should be stored as custom attribute', async () => {
        const event = EVENT.cloneWith({ subject: 'https://example.org' });

        await makeGooglePubSubEmitter()(event);

        expect(mockPublishMessage).toHaveBeenCalledWith(
          expect.objectContaining({
            attributes: expect.objectContaining({ subject: event.subject }),
          }),
        );
      });

      test('Subject should not be stored as custom attribute if absent', async () => {
        await makeGooglePubSubEmitter()(EVENT);

        expect(mockPublishMessage).not.toHaveBeenCalledWith(
          expect.objectContaining({
            attributes: expect.objectContaining({ subject: expect.anything() }),
          }),
        );
      });

      test('Source should be stored as custom attribute', async () => {
        await makeGooglePubSubEmitter()(EVENT);

        expect(mockPublishMessage).toHaveBeenCalledWith(
          expect.objectContaining({
            attributes: expect.objectContaining({ source: EVENT.source }),
          }),
        );
      });

      test('Type should be stored as custom attribute', async () => {
        await makeGooglePubSubEmitter()(EVENT);

        expect(mockPublishMessage).toHaveBeenCalledWith(
          expect.objectContaining({
            attributes: expect.objectContaining({ type: EVENT.type }),
          }),
        );
      });

      test('Extension attributes should be stored as custom attributes', async () => {
        const extensionAttributes = { foo: 'bar' };
        const event = EVENT.cloneWith(extensionAttributes);

        await makeGooglePubSubEmitter()(event);

        expect(mockPublishMessage).toHaveBeenCalledWith(
          expect.objectContaining({ attributes: expect.objectContaining(extensionAttributes) }),
        );
      });
    });
  });

  test('Environment variable CE_GPUBSUB_TOPIC should be set', () => {
    mockEnvVars({ CE_GPUBSUB_TOPIC: undefined });

    expect(makeGooglePubSubEmitter).toThrowWithMessage(envVar.EnvVarError, /CE_GPUBSUB_TOPIC/u);
  });

  test('Topic should be taken from environment variable CE_GPUBSUB_TOPIC', async () => {
    await makeGooglePubSubEmitter()(EVENT);

    expect(mockTopic).toHaveBeenCalledWith(CE_GPUBSUB_TOPIC);
  });
});
