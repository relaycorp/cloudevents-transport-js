import type { CloudEvent, EmitterFunction, type CloudEventV1, type Headers } from 'cloudevents';
import { PubSub } from '@google-cloud/pubsub';
import { google } from '@google-cloud/pubsub/build/protos/protos.js';
import { getUnixTime } from 'date-fns';
import envVar from 'env-var';

import IPubsubMessage = google.pubsub.v1.IPubsubMessage;

const CLIENT = new PubSub();

const CE_BUILTIN_ATTRS = [
  'specversion',
  'type',
  'source',
  'subject',
  'id',
  'time',
  'datacontenttype',
  'dataschema',
  'data',
  'data_base64',
];

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

function convertEventToMessage(event: CloudEvent<unknown>): IPubsubMessage {
  const publishTime = convertEventTimeToPublishTime(event);
  const ceAttributes = {
    ceSpecVersion: event.specversion,
    ceDataContentType: event.datacontenttype,
    ceDataSchema: event.dataschema,
    ceType: event.type,
    ceSubject: event.subject,
    ceSource: event.source,
  };
  const extensionAttributes = Object.entries(event)
    .filter(([key]) => !CE_BUILTIN_ATTRS.includes(key))
    .reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {});
  return {
    data: convertData(event),
    messageId: event.id,
    publishTime,
    attributes: suppressUndefined({ ...ceAttributes, ...extensionAttributes }),
  };
}

export function makeGooglePubSubEmitter(): EmitterFunction {
  const topicName = envVar.get('CE_GPUBSUB_TOPIC').required().asString();
  return async (event) => {
    const topic = CLIENT.topic(topicName);
    const message = convertEventToMessage(event);
    await topic.publishMessage(message);
  };
}

export function convertGooglePubSubMessage(headers: Headers, body: Buffer): CloudEventV1<Buffer> {
  throw new Error(`Not implemented${headers}${body}`);
}
