import { EmailMessage } from './message';

type ImprovMXMessage = {
  headers: {
    [key: string]: string | string[] | { name: string | undefined; email: string };
  };
  'message-id': string;
  date: string;
  to: { email: string; name?: string }[];
  from: { email: string; name?: string };
  subject: string;
  'return-path': { email: string; name?: string };
  timestamp: number; // in *seconds*
  text: string;
  html: string;
  inlines: {
    type: string;
    name: string;
    content: string;
    cid: string;
  }[];
  attachments: {
    type: string;
    name: string;
    content: string;
    encoding: string;
  }[];
};

function generateMessageIdFromImprovmxMessage(message: ImprovMXMessage): string {
  return `${message.timestamp * 1000}-${message.from.email}`;
}

export function emailMessageFromImprovmx(improvmxMessage: ImprovMXMessage): EmailMessage {
  delete improvmxMessage.headers['Delivered-To'];
  return {
    id: generateMessageIdFromImprovmxMessage(improvmxMessage),
    to: improvmxMessage.to,
    from: improvmxMessage.from,
    headers: improvmxMessage.headers as { [key: string]: string | string[] },
    subject: improvmxMessage.subject,
    timestamp: improvmxMessage.timestamp * 1000, // convert seconds to milliseconds
    snippet: improvmxMessage.text ?? '',
    mimeType: improvmxMessage.html && improvmxMessage.html !== '' ? 'text/html' : 'text/plain',
    body:
      improvmxMessage.html && improvmxMessage.html !== ''
        ? improvmxMessage.html
        : improvmxMessage.text,
    attachments: improvmxMessage.attachments.map(attachment => ({
      filename: attachment.name,
      mimeType: attachment.type,
      data: attachment.content,
    })),
    inlines: improvmxMessage.inlines.map(inline => ({
      filename: inline.name,
      mimeType: inline.type,
      data: inline.content,
    })),
  };
}
