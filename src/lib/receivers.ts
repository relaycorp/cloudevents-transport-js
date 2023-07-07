import type { Receiver } from './Receiver.js';

export async function makeReceiver(transport: string): Promise<Receiver> {
  // Avoid import-time side effects (e.g., expensive API calls) by loading emitter functions lazily
  let receiver: Receiver;
  if (transport === 'ce-http-binary') {
    const { convertCeBinaryMessage } = await import('./ceBinary.js');
    receiver = convertCeBinaryMessage;
  } else if (transport === 'google-pubsub') {
    const { convertGooglePubSubMessage } = await import('./googlePubSub.js');
    receiver = convertGooglePubSubMessage;
  } else {
    throw new Error(`Unsupported receiver type (${transport})`);
  }

  return receiver;
}
