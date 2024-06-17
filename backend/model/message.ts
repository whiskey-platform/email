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
  attachments:
    | { filename: string; mimeType: string; data: string }[]
    | undefined;
};

export const messageMeta = (
  message: EmailMessage
): Omit<Omit<Omit<EmailMessage, "body">, "attachments">, "inlines"> => {
  return {
    id: message.id,
    headers: message.headers,
    to: message.to,
    from: message.from,
    subject: message.subject,
    timestamp: message.timestamp,
    snippet: message.snippet,
    mimeType: message.mimeType,
  };
};
