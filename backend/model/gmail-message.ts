import { gmail_v1 } from 'googleapis';
import { EmailMessage } from './message';

function extractNameAndEmail(str: string): { email: string; name?: string } {
  // Sample: "ORCID - Do not reply \u003cDoNotReply@verify.orcid.org\u003e"
  const matches = str.match(/(.*) \\u003c(.*)\\u003e/);
  if (matches && matches.length === 3) {
    return { name: matches[1], email: matches[2] };
  }
  return { email: str };
}

function generateMessageIdFromGmailMessage(gmailMessage: gmail_v1.Schema$Message): string {
  const headers = gmailMessage.payload?.headers ?? [];
  const dateHeader = headers.find((header: any) => header.name === 'Date')!;
  const timestamp = new Date(dateHeader.value!).getTime();
  const from = extractNameAndEmail(headers.find((header: any) => header.name === 'From')!.value!);
  return timestamp + '-' + from.email;
}

function generateDictionaryFromHeaders(headers: gmail_v1.Schema$MessagePartHeader[]): {
  [key: string]: string | string[];
} {
  const dict: { [key: string]: string | string[] } = {};
  headers.forEach(header => {
    if (dict[header.name!]) {
      if (Array.isArray(dict[header.name!])) {
        dict[header.name!] = dict[header.name!].concat(header.value!);
      } else {
        dict[header.name!] = [dict[header.name!] as string, header.value!];
      }
    } else {
      dict[header.name!] = header.value!;
    }
  });
  return dict;
}

export function emailMessageFromGmail(gmailMessage: gmail_v1.Schema$Message): EmailMessage {
  const headers = gmailMessage.payload?.headers ?? [];
  const from = extractNameAndEmail(headers.find((header: any) => header.name === 'From')!.value!);
  const to = headers
    .filter(header => header.name === 'To')
    .map(header => extractNameAndEmail(header.value!));
  const subject = headers.find((header: any) => header.name === 'Subject')!;
  const date = new Date(headers.find((header: any) => header.name === 'Date')!.value!);
  const snippet = gmailMessage.snippet;
  const body = extractBody(gmailMessage.payload!)!;
  const attachments = gmailMessage.payload?.parts
    ?.filter((part: any) => part.filename)
    .map((part: any) => ({
      filename: part.filename,
      mimeType: part.mimeType,
      data: part.body.data,
    }));
  return {
    id: generateMessageIdFromGmailMessage(gmailMessage),
    to,
    from: from,
    headers: generateDictionaryFromHeaders(headers),
    subject: subject.value!,
    timestamp: date.getTime(),
    snippet: snippet ?? '',
    mimeType: body.mimeType,
    body: body.body,
    attachments: attachments,
    inlines: [],
  };
}

function extractBody(
  payload: gmail_v1.Schema$MessagePart
): { mimeType: string; body: string } | undefined {
  if (payload.parts) {
    const bodyParts = payload.parts.filter(v => v.filename == '');
    const htmlBody = bodyParts.find(v => v.mimeType == 'text/html');
    if (htmlBody) {
      return {
        mimeType: 'text/html',
        body: Buffer.from(htmlBody.body!.data!, 'base64').toString(),
      };
    }
    const textBody = bodyParts.find(v => v.mimeType == 'text/plain');
    if (textBody) {
      return {
        mimeType: 'text/plain',
        body: Buffer.from(textBody.body!.data!, 'base64').toString(),
      };
    }
  } else {
    if (payload.filename == '' && payload.body?.data) {
      return {
        mimeType: payload.mimeType!,
        body: Buffer.from(payload.body.data, 'base64').toString(),
      };
    }
  }
}
