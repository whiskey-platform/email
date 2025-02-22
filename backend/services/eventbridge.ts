import {
  EventBridgeClient,
  PutEventsCommand,
  PutEventsRequestEntry,
} from '@aws-sdk/client-eventbridge';
import { EmailMessageMetadata } from '../model/message';
import { logger } from '@whiskey-platform/logging';

const eventBridge = new EventBridgeClient({});

export class EventBridge {
  async putNewMessageEvent(messageMeta: EmailMessageMetadata) {
    logger.info('Putting new message event');
    const putEventsCommand = new PutEventsCommand({
      Entries: [this.newMessageEvent(messageMeta)],
    });
    await eventBridge.send(putEventsCommand);
    logger.info('Successfully put new message event');
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
