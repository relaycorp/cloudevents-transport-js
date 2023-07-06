import type { EmitterFunction } from 'cloudevents';

import { makeCeBinaryEmitter } from './ceBinary.js';

type EmitterMaker = () => EmitterFunction;

const EMITTER_MAKER: { [type: string]: EmitterMaker } = {
  cloudevents: makeCeBinaryEmitter,
};

export function makeEmitter(type: string): EmitterFunction {
  const emitterFunction = EMITTER_MAKER[type] as EmitterMaker | undefined;
  if (emitterFunction !== undefined) {
    return emitterFunction();
  }

  throw new Error(`Unsupported emitter type (${type})`);
}
