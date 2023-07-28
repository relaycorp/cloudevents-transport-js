# `@relaycorp/cloudevents-transport`

This is a Node.js library to send/receive [CloudEvents](https://cloudevents.io) over the following transports:

- [CloudEvents, HTTP binary mode](#ce-http-binary).
- [Google PubSub](#google-pubsub).

## Emitters

To create an emitter, simply pass the name of the transport and the _channel_ to the `makeEmitter` function. For example:

```typescript
import type { EmitterFunction } from 'cloudevents';
import { makeEmitter } from '@relaycorp/cloudevents-transport';

const transport = process.env.CE_TRANSPORT_NAME ?? 'ce-http-binary';
const channel = process.env.CE_CHANNEL ?? 'https://cloudevents-broker.com';
const emitter: EmitterFunction = await makeEmitter(transport, channel);
```

Refer to the documentation of each transport below to learn about the structure channel parameter.

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

## Receivers

To create a receiver, simply pass the name of the transport to the `makeReceiver` function. For example:

```typescript
import { makeReceiver } from '@relaycorp/cloudevents-transport';

const transport = process.env.CE_TRANSPORT_NAME ?? 'ce-http-binary';
const receiver = await makeReceiver(transport);
```

Then the `receiver` can be used to convert [`cloudevents`](https://www.npmjs.com/package/cloudevents) `Message`s to `CloudEventV1`s. For example, using [Fastify](https://fastify.dev):

```typescript
import { makeReceiver } from '@relaycorp/cloudevents-transport';
import type { CloudEventV1 } from 'cloudevents';
import type { FastifyInstance, FastifyPluginOptions } from 'fastify';

export async function registerEventReceiver(server: FastifyInstance): Promise<void> {
  // Accept any content type
  server.removeAllContentTypeParsers();
  server.addContentTypeParser('*', { parseAs: 'buffer' }, (_request, payload, next) => {
    next(null, payload);
  });

  // Initialise the receiver once and reuse it across requests
  const transport = process.env.CE_TRANSPORT_NAME ?? 'ce-http-binary';
  const convertMessageToEvent = await makeReceiver(transport);

  server.post('/', async (request, reply) => {
    let event: CloudEventV1<Buffer>;
    try {
      event = convertMessageToEvent(request.headers, request.body);
    } catch (err) {
      return reply.status(400).send({ reason: err.message });
    }

    return reply.status(200).send({ eventId: event.id });
  });
}
```

## Supported transports

### ce-http-binary

This is the standard CloudEvents HTTP transport, in binary mode.

The _channel_ passed to the emitter must be the URL of the CloudEvents endpoint that will receive the events.

### google-pubsub

This transport doesn't actually use CloudEvents at all -- it simply converts the CloudEvent to a [Google PubSub](https://cloud.google.com/pubsub) message and vice versa. Fields between the two formats are mapped as follows:

| CloudEvent field | PubSub field  |
| ---------------- | ------------- |
| `id`             | `messageId`   |
| `time`           | `publishTime` |
| `data`           | `data`        |

All other CloudEvents fields, including extensions, are mapped to PubSub attributes with the same name.

The _channel_ passed to the emitter must be the PubSub topic where messages are to be published.
