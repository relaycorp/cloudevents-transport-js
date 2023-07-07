import type { CloudEventV1, Headers } from 'cloudevents';

export type Receiver = (headers: Headers, body: Buffer) => CloudEventV1<Buffer>;
