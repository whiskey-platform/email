import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { EmailMessage } from '../model/message';
import { Resource } from 'sst';

export class S3 {
  s3: S3Client;
  constructor() {
    this.s3 = new S3Client({ region: 'us-east-1' });
  }
  async getRawEmail(key: string): Promise<any> {
    const command = new GetObjectCommand({
      Bucket: Resource.EmailBucket.name,
      Key: key,
    });
    const res = await this.s3.send(command);
    return JSON.parse((await res.Body?.transformToString()) ?? '{}');
  }
  async uploadEmailMessage(message: EmailMessage) {
    // generate meta.json
    const metaCommand = new PutObjectCommand({
      Bucket: Resource.EmailBucket.name,
      Key: `messages/${message.id}/meta.json`,
      Body: JSON.stringify(message),
    });
    await this.s3.send(metaCommand);
    // generate body.html or body.txt dependin on message.mimeType
    const bodyCommand = new PutObjectCommand({
      Bucket: Resource.EmailBucket.name,
      Key: `messages/${message.id}/body.${extensionFromMimeType(message.mimeType)}`,
      Body: message.body,
    });
    await this.s3.send(bodyCommand);
    // generate attachments
    message.attachments?.forEach(async attachment => {
      const attachmentCommand = new PutObjectCommand({
        Bucket: Resource.EmailBucket.name,
        Key: `messages/${message.id}/attachments/${attachment.filename}`,
        Body: attachment.data,
        ContentType: attachment.mimeType,
      });
      await this.s3.send(attachmentCommand);
    });
    // generate inlines
    message.inlines?.forEach(async inline => {
      const inlineCommand = new PutObjectCommand({
        Bucket: Resource.EmailBucket.name,
        Key: `messages/${message.id}/inlines/${inline.filename}`,
        Body: inline.data,
        ContentType: inline.mimeType,
      });
      await this.s3.send(inlineCommand);
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
