import { google } from 'googleapis';
import { logger } from './logging';

export class Gmail {
  oauth2Client;

  constructor(clientId: string, clientSecret: string, accessToken: string, refreshToken: string) {
    this.oauth2Client = new google.auth.OAuth2(clientId, clientSecret);
    this.oauth2Client.setCredentials({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
  }

  private async listMessages(pageToken?: string) {
    logger.info('Listing messages');
    logger.info(`Page token: ${pageToken}`);
    const gmail = google.gmail({ version: 'v1', auth: this.oauth2Client });
    const res = await gmail.users.messages.list({
      userId: 'me',
      pageToken,
    });
    const fullDetails = await Promise.all(
      (res.data.messages || []).map(async message => {
        return await this.getFullMessage(message.id!);
      })
    );
    logger.info('Successfully retrieved messages');
    return { messages: fullDetails, pageToken: res.data.nextPageToken };
  }

  public async getFullMessage(id: string) {
    logger.info(`Getting full message details for message: ${id}`);
    const gmail = google.gmail({ version: 'v1', auth: this.oauth2Client });
    const res = await gmail.users.messages.get({
      userId: 'me',
      id,
    });
    logger.info(`Successfully retrieved full message details for message: ${id}`);
    return res.data;
  }

  public async listFullMessages() {
    var { messages, pageToken } = await this.listMessages();
    while (pageToken) {
      const nextPage = await this.listMessages(pageToken);
      messages = messages!.concat(nextPage.messages!);
      pageToken = nextPage.pageToken;
    }
  }

  public async watchForMessages() {
    logger.info('Alerting Google Pub/Sub to watch for messages');
    const gmail = google.gmail({ version: 'v1', auth: this.oauth2Client });
    await gmail.users.watch({
      userId: 'me',
      requestBody: {
        topicName: process.env.GMAIL_TOPIC,
      },
    });
    logger.info('Successfully sent WATCH request to Gmail');
  }

  async getHistory(startHistoryId: string, pageToken?: string) {
    logger.info(`Getting history starting from historyId: ${startHistoryId}`);
    logger.info(`Page token: ${pageToken}`);
    const gmail = google.gmail({ version: 'v1', auth: this.oauth2Client });
    const res = await gmail.users.history.list({
      userId: 'me',
      startHistoryId,
      pageToken,
    });
    logger.info(`Successfully retrieved history`);
    return {
      history: res.data.history ?? [],
      nextPageToken: res.data.nextPageToken,
    };
  }

  public async getFullHistory(startHistoryId: string) {
    var { history, nextPageToken } = await this.getHistory(startHistoryId);
    while (nextPageToken) {
      const nextPage = await this.getHistory(startHistoryId, nextPageToken);
      history = history.concat(nextPage.history!);
      nextPageToken = nextPage.nextPageToken;
    }
    return history;
  }
}
