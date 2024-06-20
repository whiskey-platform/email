import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { EmailMessage } from '../model/message';
import { Resource } from 'sst';
import { logger } from './logging';

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
    return JSON.parse((await res.Body?.transformToString()) ?? '{}');
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
    message.attachments?.forEach(async attachment => {
      const attachmentCommand = new PutObjectCommand({
        Bucket: Resource.EmailBucket.name,
        Key: `messages/${message.id}/attachments/${attachment.filename}`,
        Body: attachment.data,
        ContentType: attachment.mimeType,
      });
      await this.s3.send(attachmentCommand);
      logger.info(`Successfully uploaded attachment: ${attachment.filename}`);
    });
    // generate inlines
    logger.info('Generating inlines');
    message.inlines?.forEach(async inline => {
      const inlineCommand = new PutObjectCommand({
        Bucket: Resource.EmailBucket.name,
        Key: `messages/${message.id}/inlines/${inline.filename}`,
        Body: inline.data,
        ContentType: inline.mimeType,
      });
      await this.s3.send(inlineCommand);
      logger.info(`Successfully uploaded inline: ${inline.filename}`);
    });
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
