import {
  type CloudEventV1,
  emitterFor,
  type EmitterFunction,
  type Headers,
  HTTP,
  httpTransport,
  Mode,
} from 'cloudevents';

export function makeCeBinaryEmitter(sinkUrl: string): EmitterFunction {
  const transport = httpTransport(sinkUrl);
  return emitterFor(transport, { mode: Mode.BINARY });
}

export function convertCeBinaryMessage(headers: Headers, body: Buffer): CloudEventV1<Buffer> {
  const message = { headers, body };
  return HTTP.toEvent(message) as CloudEventV1<Buffer>;
}
