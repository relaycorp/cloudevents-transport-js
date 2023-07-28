import { CloudEvent } from 'cloudevents';

export const EVENT = new CloudEvent({
  id: 'the id',
  source: 'https://example.com',
  type: 'com.example',
  data: Buffer.from('data'),
  datacontenttype: 'application/vnd.example',
});

export const CE_SINK_URL = 'https://sink.example.com/';

export const GOOGLE_PUBSUB_TOPIC = 'the topic';
