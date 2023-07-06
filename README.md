# `@relaycorp/cloudevents-transport`

This is a Node.js library to send/receive [CloudEvents](https://cloudevents.io) over the following transports:

- [CloudEvents, HTTP binary mode](#ce-http-binary).

## Emitters

To create an emitter, simply pass the name of the transport to the `makeEmitter` function. For example:

```typescript
import type { EmitterFunction } from 'cloudevents';
import { makeEmitter } from '@relaycorp/cloudevents-transport';

const emitter: EmitterFunction = makeEmitter(process.env.CE_TRANSPORT_NAME);
```

Then the `emitter` can be used as a regular `EmitterFunction` from the [`cloudevents`](https://www.npmjs.com/package/cloudevents) library. For example:

```typescript
import { CloudEvent } from 'cloudevents';

const event = new CloudEvent({
  type: 'com.example.some-event',
  source: 'https://example.com',
  data: 'Hello, world!',
});
await emitter(event);
```

## Supported transports

### ce-http-binary

This is the standard CloudEvents HTTP transport, in binary mode.

The emitter uses the following environment variables:

- `K_SINK` (required): The URL of the CloudEvents endpoint that will receive the events.
