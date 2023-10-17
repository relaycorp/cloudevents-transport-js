import { jest } from '@jest/globals';
import type { CloudEvent } from 'cloudevents';
import { formatISO, getUnixTime, setMilliseconds } from 'date-fns';

import { getPromiseRejection, mockSpy } from '../testUtils/jest';
import { GOOGLE_PUBSUB_TOPIC, EVENT } from '../testUtils/stubs';
import { jsonSerialise } from '../testUtils/json';

const mockPublishMessage = mockSpy(jest.fn<any>());
const mockTopic = jest.fn<any>().mockReturnValue({ publishMessage: mockPublishMessage });
jest.mock<any>('@google-cloud/pubsub', () => ({
  // eslint-disable-next-line @typescript-eslint/naming-convention
  PubSub: jest.fn<any>().mockReturnValue({
    topic: mockTopic,
  }),
}));
// eslint-disable-next-line import/first
import { makeGooglePubSubEmitter, convertGooglePubSubMessage } from './googlePubSub';

describe('makeGooglePubSubEmitter', () => {
  describe('Message', () => {
    describe('Data', () => {
      test('Buffer should be passed on as is', async () => {
        expect(EVENT.data).toBeInstanceOf(Buffer);

        await makeGooglePubSubEmitter(GOOGLE_PUBSUB_TOPIC)(EVENT);

        expect(mockPublishMessage).toHaveBeenCalledWith(
          expect.objectContaining({ data: EVENT.data }),
        );
      });

      test('String should be passed on as is', async () => {
        const event = EVENT.cloneWith({ data: 'data', datacontenttype: 'text/plain' });
        expect(event.data).toBeString();

        await makeGooglePubSubEmitter(GOOGLE_PUBSUB_TOPIC)(event);

        expect(mockPublishMessage).toHaveBeenCalledWith(
          expect.objectContaining({ data: event.data }),
        );
      });

      test('Other types should be JSON-serialised', async () => {
        const event = EVENT.cloneWith({
          data: { foo: 'bar' },
          datacontenttype: 'application/json',
        });

        await makeGooglePubSubEmitter(GOOGLE_PUBSUB_TOPIC)(event);

        expect(mockPublishMessage).toHaveBeenCalledWith(
          expect.objectContaining({ data: JSON.stringify(event.data) }),
        );
      });
    });

    test('Id should be taken from CloudEvent id', async () => {
      await makeGooglePubSubEmitter(GOOGLE_PUBSUB_TOPIC)(EVENT);

      expect(mockPublishMessage).toHaveBeenCalledWith(
        expect.objectContaining({ messageId: EVENT.id }),
      );
    });

    test('Publish time should be taken from CloudEvent time if set', async () => {
      const eventTime = setMilliseconds(new Date(), 0);
      const event = EVENT.cloneWith({ time: formatISO(eventTime) });

      await makeGooglePubSubEmitter(GOOGLE_PUBSUB_TOPIC)(event);

      expect(mockPublishMessage).toHaveBeenCalledWith(
        expect.objectContaining({ publishTime: { seconds: getUnixTime(eventTime) } }),
      );
    });

    test('Publish time should be unset if absent from CloudEvent', async () => {
      const event = { ...EVENT, time: undefined };

      await makeGooglePubSubEmitter(GOOGLE_PUBSUB_TOPIC)(event as CloudEvent<unknown>);

      expect(mockPublishMessage).toHaveBeenCalledWith(
        expect.objectContaining({ publishTime: undefined }),
      );
    });

    describe('CloudEvents attributes unsupported by PubSub', () => {
      test('Spec version should be stored as custom attribute', async () => {
        await makeGooglePubSubEmitter(GOOGLE_PUBSUB_TOPIC)(EVENT);

        expect(mockPublishMessage).toHaveBeenCalledWith(
          expect.objectContaining({
            attributes: expect.objectContaining({ specversion: EVENT.specversion }),
          }),
        );
      });

      test('Data schema should be stored as custom attribute if present', async () => {
        const event = EVENT.cloneWith({ dataschema: 'https://example.com/schema' });

        await makeGooglePubSubEmitter(GOOGLE_PUBSUB_TOPIC)(event);

        expect(mockPublishMessage).toHaveBeenCalledWith(
          expect.objectContaining({
            attributes: expect.objectContaining({ dataschema: event.dataschema }),
          }),
        );
      });

      test('Data schema should not be stored as custom attribute if absent', async () => {
        await makeGooglePubSubEmitter(GOOGLE_PUBSUB_TOPIC)(EVENT);

        expect(mockPublishMessage).not.toHaveBeenCalledWith(
          expect.objectContaining({
            attributes: expect.objectContaining({ dataschema: expect.anything() }),
          }),
        );
      });

      test('Data content type should be stored as custom attribute', async () => {
        const event = EVENT.cloneWith({ datacontenttype: 'text/plain' });

        await makeGooglePubSubEmitter(GOOGLE_PUBSUB_TOPIC)(event);

        expect(mockPublishMessage).toHaveBeenCalledWith(
          expect.objectContaining({
            attributes: expect.objectContaining({ datacontenttype: event.datacontenttype }),
          }),
        );
      });

      test('Data should not be set as a custom attribute', async () => {
        await makeGooglePubSubEmitter(GOOGLE_PUBSUB_TOPIC)(EVENT);

        expect(mockPublishMessage).not.toHaveBeenCalledWith(
          expect.objectContaining({
            attributes: expect.objectContaining({ data: expect.anything() }),
          }),
        );
      });

      test('Data base64 should not be set as a custom attribute', async () => {
        await makeGooglePubSubEmitter(GOOGLE_PUBSUB_TOPIC)(EVENT);

        expect(mockPublishMessage).not.toHaveBeenCalledWith(
          expect.objectContaining({
            // eslint-disable-next-line @typescript-eslint/naming-convention,camelcase
            attributes: expect.objectContaining({ data_base64: expect.anything() }),
          }),
        );
      });

      test('Subject should be stored as custom attribute', async () => {
        const event = EVENT.cloneWith({ subject: 'https://example.org' });

        await makeGooglePubSubEmitter(GOOGLE_PUBSUB_TOPIC)(event);

        expect(mockPublishMessage).toHaveBeenCalledWith(
          expect.objectContaining({
            attributes: expect.objectContaining({ subject: event.subject }),
          }),
        );
      });

      test('Subject should not be stored as custom attribute if absent', async () => {
        await makeGooglePubSubEmitter(GOOGLE_PUBSUB_TOPIC)(EVENT);

        expect(mockPublishMessage).not.toHaveBeenCalledWith(
          expect.objectContaining({
            attributes: expect.objectContaining({ subject: expect.anything() }),
          }),
        );
      });

      test('Source should be stored as custom attribute', async () => {
        await makeGooglePubSubEmitter(GOOGLE_PUBSUB_TOPIC)(EVENT);

        expect(mockPublishMessage).toHaveBeenCalledWith(
          expect.objectContaining({
            attributes: expect.objectContaining({ source: EVENT.source }),
          }),
        );
      });

      test('Type should be stored as custom attribute', async () => {
        await makeGooglePubSubEmitter(GOOGLE_PUBSUB_TOPIC)(EVENT);

        expect(mockPublishMessage).toHaveBeenCalledWith(
          expect.objectContaining({
            attributes: expect.objectContaining({ type: EVENT.type }),
          }),
        );
      });

      test('Extension attributes should be stored as custom attributes', async () => {
        const extensionAttributes = { foo: 'bar' };
        const event = EVENT.cloneWith(extensionAttributes);

        await makeGooglePubSubEmitter(GOOGLE_PUBSUB_TOPIC)(event);

        expect(mockPublishMessage).toHaveBeenCalledWith(
          expect.objectContaining({ attributes: expect.objectContaining(extensionAttributes) }),
        );
      });
    });
  });

  test('Topic should be taken from the parameter', async () => {
    await makeGooglePubSubEmitter(GOOGLE_PUBSUB_TOPIC)(EVENT);

    expect(mockTopic).toHaveBeenCalledWith(GOOGLE_PUBSUB_TOPIC);
  });

  test('Publish errors should be wrapped', async () => {
    const error = new Error('Publish error');
    mockPublishMessage.mockRejectedValue(error);

    const errorWrapper = await getPromiseRejection(
      async () => makeGooglePubSubEmitter(GOOGLE_PUBSUB_TOPIC)(EVENT),
      Error,
    );

    expect(errorWrapper.message).toBe(
      `Failed to publish message to Google PubSub topic "${GOOGLE_PUBSUB_TOPIC}"`,
    );
    expect(errorWrapper.cause).toBe(error);
  });
});

describe('convertGooglePubSubMessage', () => {
  const headers = {};

  const requestBody = {
    message: {
      data: EVENT.data_base64!,
      messageId: EVENT.id,
      publishTime: EVENT.time!,

      attributes: {
        type: EVENT.type,
        source: EVENT.source,
      },
    },

    subscription: 'projects/myproject/subscriptions/mysubscription',
  };
  const requestBodySerialised = jsonSerialise(requestBody);

  function copyBodyWithAttribute(attribute: string, value: string | undefined): Buffer {
    const body = {
      ...requestBody,

      message: {
        ...requestBody.message,
        attributes: { ...requestBody.message.attributes, [attribute]: value },
      },
    };
    return jsonSerialise(body);
  }

  test('Request body should be refused if it is malformed JSON', () => {
    expect(() => convertGooglePubSubMessage(headers, Buffer.from('malformed'))).toThrowWithMessage(
      Error,
      'Request body is not valid JSON',
    );
  });

  test('Request body should be refused if message field is missing', () => {
    const invalidRequestBody = { ...requestBody, message: undefined };
    const invalidRequestBodySerialised = jsonSerialise(invalidRequestBody);

    expect(() =>
      convertGooglePubSubMessage(headers, invalidRequestBodySerialised),
    ).toThrowWithMessage(Error, 'Request body is not a valid PubSub message');
  });

  describe('Id', () => {
    test('Should be taken from messageId', () => {
      const event = convertGooglePubSubMessage(headers, requestBodySerialised);

      expect(event.id).toBe(requestBody.message.messageId);
    });

    test('Message should be refused if messageId is missing', () => {
      const invalidRequestBody = {
        ...requestBody,
        message: { ...requestBody.message, messageId: undefined },
      };
      const invalidRequestBodySerialised = jsonSerialise(invalidRequestBody);

      expect(() =>
        convertGooglePubSubMessage(headers, invalidRequestBodySerialised),
      ).toThrowWithMessage(Error, 'Request body is not a valid PubSub message');
    });
  });

  describe('Time', () => {
    test('Should be taken from publishTime', () => {
      const event = convertGooglePubSubMessage(headers, requestBodySerialised);

      expect(event.time).toBe(requestBody.message.publishTime);
    });

    test('Message should be refused if publishTime is missing', () => {
      const invalidRequestBody = {
        ...requestBody,
        message: { ...requestBody.message, publishTime: undefined },
      };
      const invalidRequestBodySerialised = jsonSerialise(invalidRequestBody);

      expect(() =>
        convertGooglePubSubMessage(headers, invalidRequestBodySerialised),
      ).toThrowWithMessage(Error, 'Request body is not a valid PubSub message');
    });
  });

  describe('Data', () => {
    test('Should be taken from data', () => {
      const event = convertGooglePubSubMessage(headers, requestBodySerialised);

      expect(event.data).toMatchObject(EVENT.data!);
    });

    test('Should be empty if data is missing', () => {
      const body = {
        ...requestBody,

        message: {
          ...requestBody.message,
          data: undefined,
        },
      };
      const bodySerialised = jsonSerialise(body);

      const event = convertGooglePubSubMessage(headers, bodySerialised);

      expect(event.data).toBeUndefined();
    });
  });

  test('Event type should be taken from type attribute', () => {
    const event = convertGooglePubSubMessage(headers, requestBodySerialised);

    expect(event.type).toBe(EVENT.type);
  });

  test('Event source should be taken from source attribute', () => {
    const event = convertGooglePubSubMessage(headers, requestBodySerialised);

    expect(event.source).toBe(EVENT.source);
  });

  describe('Spec version', () => {
    test('Should be taken from specversion attribute', () => {
      const specVersion = '0.3';
      const body = copyBodyWithAttribute('specversion', specVersion);

      const event = convertGooglePubSubMessage(headers, body);

      expect(event.specversion).toBe(specVersion);
    });

    test('Should be default to 1.0 if absent', () => {
      const body = copyBodyWithAttribute('specversion', undefined);

      const event = convertGooglePubSubMessage(headers, body);

      expect(event.specversion).toBe('1.0');
    });
  });

  describe('Subject', () => {
    test('Should be taken from subject attribute', () => {
      const subject = 'my-subject';
      const body = copyBodyWithAttribute('subject', subject);

      const event = convertGooglePubSubMessage(headers, body);

      expect(event.subject).toBe(subject);
    });

    test('Should be undefined if subject attribute is absent', () => {
      const body = copyBodyWithAttribute('subject', undefined);

      const event = convertGooglePubSubMessage(headers, body);

      expect(event.subject).toBeUndefined();
    });
  });

  describe('Data content type', () => {
    test('Should be taken from datacontenttype attribute', () => {
      const dataContentType = 'application/json';
      const body = copyBodyWithAttribute('datacontenttype', dataContentType);

      const event = convertGooglePubSubMessage(headers, body);

      expect(event.datacontenttype).toBe(dataContentType);
    });

    test('Should be undefined if datacontenttype attribute is absent', () => {
      const body = copyBodyWithAttribute('datacontenttype', undefined);

      const event = convertGooglePubSubMessage(headers, body);

      expect(event.datacontenttype).toBeUndefined();
    });
  });

  describe('Data schema', () => {
    test('Should be taken from dataschema attribute', () => {
      const dataSchema = 'https://example.com/schema';
      const body = copyBodyWithAttribute('dataschema', dataSchema);

      const event = convertGooglePubSubMessage(headers, body);

      expect(event.dataschema).toBe(dataSchema);
    });

    test('Should be undefined if dataschema attribute is absent', () => {
      const body = copyBodyWithAttribute('dataschema', undefined);

      const event = convertGooglePubSubMessage(headers, body);

      expect(event.dataschema).toBeUndefined();
    });
  });

  test('Extension attributes should be taken from message.attributes', () => {
    const body = copyBodyWithAttribute('extension', 'value');

    const event = convertGooglePubSubMessage(headers, body);

    expect(event.extension).toBe('value');
  });

  test.each(['source', 'type'])(
    'Message should be refused if attribute %s is missing',
    (attributeName) => {
      const body = copyBodyWithAttribute(attributeName, undefined);

      expect(() => convertGooglePubSubMessage(headers, body)).toThrowWithMessage(
        Error,
        'Request body is not a valid PubSub message',
      );
    },
  );
});
