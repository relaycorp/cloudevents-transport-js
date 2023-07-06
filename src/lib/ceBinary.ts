import { emitterFor, type EmitterFunction, httpTransport, Mode } from 'cloudevents';
import envVar from 'env-var';

export function makeCeBinaryEmitter(): EmitterFunction {
  const sinkUrl = envVar.get('K_SINK').required().asUrlString();
  const transport = httpTransport(sinkUrl);
  return emitterFor(transport, { mode: Mode.BINARY });
}
