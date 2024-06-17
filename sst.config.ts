/// <reference path="./.sst/platform/config.d.ts" />
export default $config({
  app(input) {
    return {
      name: "email",
      removal: input?.stage === "production" ? "retain" : "remove",
      home: "aws",
      providers: {
        aws: true,
        gcp: true,
        command: true,
      },
    };
  },
  async run() {
    const bucket = new sst.aws.Bucket("EmailBucket");

    const api = new sst.aws.ApiGatewayV2("EmailApi");
    api.route("POST /improvmx-webhook", {
      handler: "backend/functions/improvmx-webhook.handler",
      link: [bucket],
    });
    bucket.subscribe(
      {
        handler: "backend/functions/on-improvmx-message-add.handler",
        link: [bucket],
      },
      {
        events: ["s3:ObjectCreated:*"],
        filterPrefix: "raw/improvmx/",
      }
    );

    const addToImprovMXDomain = new sst.aws.Function("AddToImprovMXDomain", {
      handler: "backend/functions/add-to-improvmx-domain.handler",
    });
    new command.local.Command("executeAdd", {
      create: `aws lambda invoke --function-name "$FN" --payload '{"webhook": "$WEBHOOK_URL"}'`,
      environment: {
        FN: addToImprovMXDomain.arn,
        WEBHOOK_URL: api.url.apply((url) => `${url}/improvmx-webhook`),
      },
    });

    const gmailTopic = new gcp.pubsub.Topic("GmailTopic");
    api.route("POST /gmail-webhook", {
      handler: "backend/functions/gmail-webhook.handler",
      link: [bucket],
    });
    const gmailSubscription = new gcp.pubsub.Subscription(
      "GmailWebhookSubscription",
      {
        topic: gmailTopic.id,
        pushConfig: {
          pushEndpoint: api.url.apply((url) => `${url}/gmail-webhook`),
        },
      }
    );
    const gmailWatchCron = new sst.aws.Cron(
      "GmailWatchCron",
      {
        schedule: "rate(1 day)",
        job: {
          handler: "backend/functions/gmail-watch.handler",
          environment: {
            GMAIL_TOPIC: gmailTopic.id,
          },
        },
      },
      { dependsOn: [gmailSubscription] }
    );

    bucket.subscribe(
      {
        handler: "backend/functions/on-gmail-message-add.handler",
        link: [bucket],
      },
      {
        events: ["s3:ObjectCreated:*"],
        filterPrefix: "raw/gmail/",
      }
    );
  },
});
