import { date, pgTable, serial, text, varchar } from "drizzle-orm/pg-core";

export const oauthAccounts = pgTable("oauth_accounts", {
  type: text("type").primaryKey(),
  loginId: text("login_id").primaryKey(),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  connectionDate: date("connection_date"),
});
