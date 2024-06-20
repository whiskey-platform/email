/// <reference path="./.sst/platform/config.d.ts" />
import { readFileSync } from 'fs';
export default $config({
  app(input) {
    return {
      name: 'email',
      removal: input?.stage === 'production' ? 'retain' : 'remove',
      home: 'aws',
      providers: {
        aws: true,
        gcp: true,
        command: true,
      },
    };
  },
  async run() {
    $transform(sst.aws.Function, (args, opts) => {
      args.nodejs = {
        install: ['@infisical/sdk'],
      };
    });

    const bucket = new sst.aws.Bucket('EmailBucket');
    const eventBus = aws.cloudwatch.EventBus.get('EventBus', 'whiskey-event-bus');
    const api = new sst.aws.ApiGatewayV2('EmailApi', {
      transform: {
        route: {
          handler: {
            permissions: [
              {
                actions: ['events:PutEvents'],
                resources: [eventBus.arn],
              },
            ],
            link: [bucket],
          },
        },
      },
    });

    const newMessageSchema = new aws.schemas.Schema('NewMessageSchema', {
      registryName: 'com.mattwyskiel.whiskey.events',
      name: 'whiskey.email.NewMessage',
      description: 'A new email message received by *@mattwyskiel.com or mwwyskiel@gmail.com',
      type: 'OpenApi3',
      content: readFileSync('./events/schemas/NewMessage.json', 'utf8'),
    });

    const improvmx = api.route(
      'POST /improvmx-webhook',
      'backend/functions/improvmx-webhook.handler'
    );
    bucket.subscribe('backend/functions/on-improvmx-message-add.handler', {
      events: ['s3:ObjectCreated:*'],
      filterPrefix: 'raw/improvmx/',
    });

    const addToImprovMXDomain = new sst.aws.Function('AddToImprovMXDomain', {
      handler: 'backend/functions/add-to-improvmx-domain.handler',
    });
    new command.local.Command('ExecuteAdd', {
      create: `aws lambda invoke --function-name "$FN" --payload '{"webhook": "$WEBHOOK_URL"}'`,
      environment: {
        FN: addToImprovMXDomain.arn,
        WEBHOOK_URL: api.url.apply(url => `${url}/improvmx-webhook`),
      },
    });

    const gmailTopic = new gcp.pubsub.Topic('GmailTopic');
    api.route('POST /gmail-webhook', 'backend/functions/gmail-webhook.handler');
    const gmailSubscription = new gcp.pubsub.Subscription('GmailWebhookSubscription', {
      topic: gmailTopic.id,
      pushConfig: {
        pushEndpoint: api.url.apply(url => `${url}/gmail-webhook`),
      },
    });
    const gmailWatchCron = new sst.aws.Cron(
      'GmailWatchCron',
      {
        schedule: 'rate(1 day)',
        job: {
          handler: 'backend/functions/gmail-watch.handler',
          environment: {
            GMAIL_TOPIC: gmailTopic.id,
          },
        },
      },
      { dependsOn: [gmailSubscription] }
    );

    bucket.subscribe('backend/functions/on-gmail-message-add.handler', {
      events: ['s3:ObjectCreated:*'],
      filterPrefix: 'raw/gmail/',
    });
  },
});
