import {
  type CloudEventV1,
  emitterFor,
  type EmitterFunction,
  type Headers,
  HTTP,
  httpTransport,
  Mode,
} from 'cloudevents';
import envVar from 'env-var';

/**
 * The URL of the CloudEvents sink.
 *
 * Unfortunately, we're stuck with the name `K_SINK` because that's what Knative uses.
 */
const CE_SERVER_URL_ENV_VAR = 'K_SINK';

export function makeCeBinaryEmitter(): EmitterFunction {
  const sinkUrl = envVar.get(CE_SERVER_URL_ENV_VAR).required().asUrlString();
  const transport = httpTransport(sinkUrl);
  return emitterFor(transport, { mode: Mode.BINARY });
}

export function convertCeBinaryMessage(headers: Headers, body: Buffer): CloudEventV1<Buffer> {
  const message = { headers, body };
  return HTTP.toEvent(message) as CloudEventV1<Buffer>;
}