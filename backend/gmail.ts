import { google } from "googleapis";
import { web as GoogleInfo } from "../google-oauth-info.json";
import { db } from "./db";
import { oauthAccounts } from "./db/schema";
import { eq } from "drizzle-orm";

export class Gmail {
  private oauth2Client;
  constructor() {
    this.oauth2Client = new google.auth.OAuth2(
      GoogleInfo.client_id,
      GoogleInfo.client_secret,
      GoogleInfo.redirect_uris[0]
    );
  }

  private async authenticate() {
    const googleClient = (
      await db
        .select()
        .from(oauthAccounts)
        .where(eq(oauthAccounts.type, "google"))
    )[0];
    this.oauth2Client.setCredentials({
      access_token: googleClient.accessToken,
      refresh_token: googleClient.refreshToken,
    });
  }

  private async listMessages(pageToken?: string) {
    await this.authenticate();
    const gmail = google.gmail({ version: "v1", auth: this.oauth2Client });
    const res = await gmail.users.messages.list({
      userId: "me",
      pageToken,
    });
    const fullDetails = await Promise.all(
      (res.data.messages || []).map(async (message) => {
        return await this.getFullMessage(message.id!);
      })
    );
    return { messages: fullDetails, pageToken: res.data.nextPageToken };
  }

  public async getFullMessage(id: string) {
    await this.authenticate();
    const gmail = google.gmail({ version: "v1", auth: this.oauth2Client });
    const res = await gmail.users.messages.get({
      userId: "me",
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
    await this.authenticate();
    const gmail = google.gmail({ version: "v1", auth: this.oauth2Client });
    await gmail.users.watch({
      userId: "me",
      requestBody: {
        topicName: process.env.GMAIL_TOPIC,
      },
    });
  }

  async getHistory(startHistoryId: string, pageToken?: string) {
    await this.authenticate();
    const gmail = google.gmail({ version: "v1", auth: this.oauth2Client });
    const res = await gmail.users.history.list({
      userId: "me",
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
