import { Handler } from "aws-lambda";
import { Gmail } from "../gmail";

export const handler: Handler = async (event) => {
  const gmail = new Gmail();
  await gmail.watchForMessages();
};
