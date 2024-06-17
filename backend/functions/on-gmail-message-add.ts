import { S3Handler } from "aws-lambda";
import { S3 } from "../s3";
import { emailMessageFromGmail } from "../model/gmail-message";

const s3 = new S3();

export const handler: S3Handler = async (event) => {
  console.log("event", event);
  event.Records.forEach(async (record) => {
    const key = record.s3.object.key;
    const rawEmail = await s3.getRawEmail(key);
    const message = emailMessageFromGmail(rawEmail);
    await s3.uploadEmailMessage(message);
  });
};
