import { Handler } from "aws-lambda";
import { Gmail } from "../gmail";

export const handler: Handler = async (event) => {
  const gmail = new Gmail();
  const messages = await gmail.listFullMessages();
  // save to database
  // save backups
  // send events
};
