import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { EmailMessage } from '../model/message';
import { Resource } from 'sst';
import { logger } from '@whiskey-platform/logging';

export class S3 {
  s3: S3Client;
  constructor() {
    this.s3 = new S3Client({ region: 'us-east-1' });
  }
  async getRawEmail(key: string): Promise<any> {
    logger.info(`Fetching raw email from S3: ${key}`);
    const command = new GetObjectCommand({
      Bucket: Resource.EmailBucket.name,
      Key: key,
    });
    const res = await this.s3.send(command);
    logger.info(`Successfully retrieved raw email from S3: ${key}`);
    if (!res.Body) {
      logger.error('No body in S3 response');
      return {};
    }
    const jsonString = await res.Body?.transformToString();
    if (!jsonString) {
      logger.error('Failed to transform body to string');
      return {};
    }
    return JSON.parse(jsonString);
  }
  async uploadEmailMessage(message: EmailMessage) {
    // generate meta.json
    logger.info(`Uploading email message to S3: ${message.id}`);
    logger.info('Generating meta.json');
    const metaCommand = new PutObjectCommand({
      Bucket: Resource.EmailBucket.name,
      Key: `messages/${message.id}/meta.json`,
      Body: JSON.stringify(message),
    });
    await this.s3.send(metaCommand);
    logger.info('Successfully uploaded meta.json');
    // generate body.html or body.txt dependin on message.mimeType
    logger.info('Generating body file');
    logger.info(`MIME Type: ${message.mimeType}`);
    const bodyCommand = new PutObjectCommand({
      Bucket: Resource.EmailBucket.name,
      Key: `messages/${message.id}/body.${extensionFromMimeType(message.mimeType)}`,
      Body: message.body,
    });
    await this.s3.send(bodyCommand);
    logger.info(`Successfully uploaded body.${extensionFromMimeType(message.mimeType)}`);
    // generate attachments
    logger.info('Generating attachments');
    for (const attachment of message.attachments || []) {
      let data: any = attachment.data;
      if (attachment.encoding === 'base64') {
        data = Buffer.from(attachment.data, 'base64');
      }
      const attachmentCommand = new PutObjectCommand({
        Bucket: Resource.EmailBucket.name,
        Key: `messages/${message.id}/attachments/${attachment.filename}`,
        Body: data,
        ContentType: attachment.mimeType,
      });
      await this.s3.send(attachmentCommand);
      logger.info(`Successfully uploaded attachment: ${attachment.filename}`);
    }
    // generate inlines
    logger.info('Generating inlines');
    for (const inline of message.inlines || []) {
      let data: any = inline.data;
      if (inline.encoding === 'base64') {
        data = Buffer.from(inline.data, 'base64');
      }
      const inlineCommand = new PutObjectCommand({
        Bucket: Resource.EmailBucket.name,
        Key: `messages/${message.id}/inlines/${inline.filename}`,
        Body: data,
        ContentType: inline.mimeType,
      });
      await this.s3.send(inlineCommand);
      logger.info(`Successfully uploaded inline: ${inline.filename}`);
    }
  }
}

function extensionFromMimeType(mimeType: string): string {
  switch (mimeType) {
    case 'text/html':
      return 'html';
    case 'text/plain':
      return 'txt';
    default:
      return 'txt';
  }
}
