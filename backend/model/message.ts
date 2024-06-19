export type EmailMessage = {
  id: string;
  to: { email: string; name?: string }[];
  from: { email: string; name?: string };
  //headers: { name: string; value: string | string[] }[];
  headers: { [key: string]: string | string[] };
  subject: string;
  timestamp: number; // milliseconds
  snippet: string;
  mimeType: string;
  body: string;
  inlines: {
    filename: string;
    mimeType: string;
    data: string;
  }[];
  attachments: { filename: string; mimeType: string; data: string }[] | undefined;
};

export type EmailMessageMetadata = Omit<
  Omit<Omit<EmailMessage, 'body'>, 'attachments'>,
  'inlines'
> & {
  attachments:
    | {
        filename: string;
        mimeType: string;
      }[]
    | undefined;
  inlines:
    | {
        filename: string;
        mimeType: string;
      }[]
    | undefined;
};

export const messageMeta = (message: EmailMessage): EmailMessageMetadata => {
  return {
    id: message.id,
    headers: message.headers,
    to: message.to,
    from: message.from,
    subject: message.subject,
    timestamp: message.timestamp,
    snippet: message.snippet,
    mimeType: message.mimeType,
    attachments: message.attachments?.map(attachment => {
      return {
        filename: attachment.filename,
        mimeType: attachment.mimeType,
      };
    }),
    inlines: message.inlines.map(inline => {
      return {
        filename: inline.filename,
        mimeType: inline.mimeType,
      };
    }),
  };
};
