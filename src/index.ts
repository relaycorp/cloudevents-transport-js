/* eslint-disable import/no-unused-modules */

// Do NOT import specific adapters here, because some SDKs do some heavy lifting on import (e.g.,
// call APIs).

export { makeEmitter } from './lib/emitters';

export { makeReceiver } from './lib/receivers';
export type { Receiver } from './lib/Receiver';
