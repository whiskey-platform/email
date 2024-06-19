import { google } from 'googleapis';

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
    return { messages: fullDetails, pageToken: res.data.nextPageToken };
  }

  public async getFullMessage(id: string) {
    const gmail = google.gmail({ version: 'v1', auth: this.oauth2Client });
    const res = await gmail.users.messages.get({
      userId: 'me',
      id,
    });
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
    const gmail = google.gmail({ version: 'v1', auth: this.oauth2Client });
    await gmail.users.watch({
      userId: 'me',
      requestBody: {
        topicName: process.env.GMAIL_TOPIC,
      },
    });
  }

  async getHistory(startHistoryId: string, pageToken?: string) {
    const gmail = google.gmail({ version: 'v1', auth: this.oauth2Client });
    const res = await gmail.users.history.list({
      userId: 'me',
      startHistoryId,
      pageToken,
    });
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
