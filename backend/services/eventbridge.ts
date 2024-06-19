import {
  EventBridgeClient,
  PutEventsCommand,
  PutEventsRequestEntry,
} from '@aws-sdk/client-eventbridge';
import { EmailMessageMetadata } from '../model/message';

const eventBridge = new EventBridgeClient({});

export class EventBridge {
  async putNewMessageEvent(messageMeta: EmailMessageMetadata) {
    const putEventsCommand = new PutEventsCommand({
      Entries: [this.newMessageEvent(messageMeta)],
    });
    await eventBridge.send(putEventsCommand);
  }
  newMessageEvent(messageMeta: EmailMessageMetadata): PutEventsRequestEntry {
    return {
      Source: 'whiskey.email',
      DetailType: 'New Message',
      Detail: JSON.stringify(messageMeta),
      EventBusName: 'whiskey-event-bus',
    };
  }
}
