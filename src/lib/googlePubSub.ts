import { PubSub } from '@google-cloud/pubsub';
import { google } from '@google-cloud/pubsub/build/protos/protos.js';
import { CloudEvent, type CloudEventV1, type EmitterFunction, type Headers } from 'cloudevents';
import { getUnixTime } from 'date-fns';

import { compileSchema } from '../utils/ajv.js';

import IPubsubMessage = google.pubsub.v1.IPubsubMessage;

const CLIENT = new PubSub();

const CE_DATA_ATTRS = ['data', 'data_base64'];
const CE_BUILTIN_ATTRS = [
  'specversion',
  'type',
  'source',
  'subject',
  'id',
  'time',
  'datacontenttype',
  'dataschema',
  ...CE_DATA_ATTRS,
];

const pubSubBody = {
  type: 'object',

  properties: {
    message: {
      type: 'object',

      properties: {
        attributes: {
          type: 'object',

          properties: {
            specversion: { type: 'string' },
            source: { type: 'string' },
            type: { type: 'string' },
            subject: { type: 'string' },
            datacontenttype: { type: 'string' },
            dataschema: { type: 'string' },
          },

          required: ['source', 'type'],
        },

        data: { type: 'string' },
        messageId: { type: 'string' },
        publishTime: { type: 'string' },
      },

      required: ['attributes', 'messageId', 'publishTime'],
    },
  },

  required: ['message'],
} as const;
const isPubSubBody = compileSchema(pubSubBody);

function convertData(event: CloudEvent<unknown>): Buffer | string {
  if (event.data instanceof Buffer || typeof event.data === 'string') {
    return event.data;
  }
  return JSON.stringify(event.data);
}

function convertEventTimeToPublishTime(
  event: CloudEvent<unknown>,
): { seconds: number } | undefined {
  if (event.time !== undefined) {
    const date = new Date(event.time);
    return { seconds: getUnixTime(date) };
  }
  return undefined;
}

function suppressUndefined(obj: { [key: string]: string | undefined }): { [key: string]: string } {
  return Object.entries(obj)
    .filter(([, value]) => value !== undefined)
    .reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {});
}

function filterExtensionAttributes(obj: { [key: string]: unknown }) {
  return Object.entries(obj)
    .filter(([key]) => !CE_BUILTIN_ATTRS.includes(key))
    .reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {});
}

function getMessageAttributesFromEvent(event: CloudEvent<unknown>) {
  const ceAttributes = Object.entries(event)
    .filter(([key]) => CE_BUILTIN_ATTRS.includes(key) && !CE_DATA_ATTRS.includes(key))
    .reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {});
  const extensionAttributes = filterExtensionAttributes(event);
  return suppressUndefined({ ...ceAttributes, ...extensionAttributes });
}

function convertEventToMessage(event: CloudEvent<unknown>): IPubsubMessage {
  const publishTime = convertEventTimeToPublishTime(event);
  const attributes = getMessageAttributesFromEvent(event);
  return {
    data: convertData(event),
    messageId: event.id,
    publishTime,
    attributes,
  };
}

export function makeGooglePubSubEmitter(topicName: string): EmitterFunction {
  return async (event) => {
    const topic = CLIENT.topic(topicName);
    const message = convertEventToMessage(event);
    await topic.publishMessage(message);
  };
}

export function convertGooglePubSubMessage(_headers: Headers, body: Buffer): CloudEventV1<Buffer> {
  const bodyString = body.toString();
  let bodyJson: unknown;
  try {
    bodyJson = JSON.parse(bodyString);
  } catch {
    throw new Error('Request body is not valid JSON');
  }

  if (isPubSubBody(bodyJson)) {
    const { message } = bodyJson;
    const data = message.data === undefined ? undefined : Buffer.from(message.data!, 'base64');
    const extensionAttributes = filterExtensionAttributes(message.attributes);
    return new CloudEvent<Buffer>({
      specversion: message.attributes.specversion,
      id: message.messageId,
      source: message.attributes.source,
      type: message.attributes.type,
      subject: message.attributes.subject,
      time: message.publishTime,
      datacontenttype: message.attributes.datacontenttype,
      dataschema: message.attributes.dataschema,
      data,
      ...extensionAttributes,
    });
  }

  throw new Error('Request body is not a valid PubSub message');
}
