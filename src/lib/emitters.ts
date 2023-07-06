import type { EmitterFunction } from 'cloudevents';

import { makeCeBinaryEmitter } from './ceBinary.js';
import { makeGooglePubSubEmitter } from './googlePubSub.js';

type EmitterMaker = () => EmitterFunction;

const EMITTER_MAKER_BY_TRANSPORT: { [type: string]: EmitterMaker } = {
  // eslint-disable-next-line @typescript-eslint/naming-convention
  'ce-http-binary': makeCeBinaryEmitter,
  // eslint-disable-next-line @typescript-eslint/naming-convention
  'google-pubsub': makeGooglePubSubEmitter,
};

export function makeEmitter(transport: string): EmitterFunction {
  const emitterFunction = EMITTER_MAKER_BY_TRANSPORT[transport] as EmitterMaker | undefined;
  if (emitterFunction !== undefined) {
    return emitterFunction();
  }

  throw new Error(`Unsupported emitter type (${transport})`);
}
