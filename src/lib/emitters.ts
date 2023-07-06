import type { EmitterFunction } from 'cloudevents';

type EmitterMaker = () => EmitterFunction;

export async function makeEmitter(transport: string): Promise<EmitterFunction> {
  // Avoid import-time side effects (e.g., expensive API calls) by loading emitter functions lazily
  let emitterFunction: EmitterMaker;
  if (transport === 'ce-http-binary') {
    const { makeCeBinaryEmitter } = await import('./ceBinary.js');
    emitterFunction = makeCeBinaryEmitter;
  } else if (transport === 'google-pubsub') {
    const { makeGooglePubSubEmitter } = await import('./googlePubSub.js');
    emitterFunction = makeGooglePubSubEmitter;
  } else {
    throw new Error(`Unsupported emitter type (${transport})`);
  }

  return emitterFunction();
}
