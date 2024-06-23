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
      args.environment = {
        ...args.environment,
        POWERTOOLS_SERVICE_NAME: 'whiskey.email',
      };
    });

    const bucket = new sst.aws.Bucket('EmailBucket');
    const eventBus = aws.cloudwatch.EventBus.get('EventBus', 'whiskey-event-bus');
    const api = new sst.aws.ApiGatewayV2('EmailApi', {
      transform: {
        route: {
          handler: {
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

    api.route('POST /improvmx-webhook', 'backend/functions/improvmx-webhook.handler');

    const addToImprovMXDomain = new sst.aws.Function('AddToImprovMXDomain', {
      handler: 'backend/functions/add-to-improvmx-domain.handler',
    });
    new command.local.Command('ExecuteAdd', {
      create: `aws lambda invoke --function-name "$FN" --payload '{"webhook": "$WEBHOOK_URL"}' --cli-binary-format raw-in-base64-out out.txt >/dev/null && cat out.txt | tr -d '"'  && rm out.txt`,
      environment: {
        FN: addToImprovMXDomain.arn,
        WEBHOOK_URL: api.url.apply(url => `${url}/improvmx-webhook`),
      },
    });

    const gmailTopic = new gcp.pubsub.Topic('GmailTopic');
    new gcp.pubsub.TopicIAMBinding('GmailTopicBinding', {
      topic: gmailTopic.id,
      role: 'roles/pubsub.publisher',
      members: ['serviceAccount:gmail-api-push@system.gserviceaccount.com'],
    });
    api.route('POST /gmail-webhook', 'backend/functions/gmail-webhook.handler');
    const gmailSubscription = new gcp.pubsub.Subscription('GmailWebhookSubscription', {
      topic: gmailTopic.id,
      pushConfig: {
        pushEndpoint: api.url.apply(url => `${url}/gmail-webhook`),
      },
    });
    new sst.aws.Cron(
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

    const onGmailMessageAdd = new sst.aws.Function('GmailMessageAdd', {
      handler: 'backend/functions/on-gmail-message-add.handler',
      permissions: [
        {
          actions: ['events:PutEvents'],
          resources: [eventBus.arn],
        },
      ],
      link: [bucket],
    });
    const onImprovmxMessageAdd = new sst.aws.Function('ImprovmxMessageAdd', {
      handler: 'backend/functions/on-improvmx-message-add.handler',
      permissions: [
        {
          actions: ['events:PutEvents'],
          resources: [eventBus.arn],
        },
      ],
      link: [bucket],
    });
    const bucketSubscriber = bucket.subscribe(
      {
        handler: 'backend/functions/s3-notifications-handler.handler',
        environment: {
          GMAIL_FUNCTION: onGmailMessageAdd.arn,
          IMPROVMX_FUNCTION: onImprovmxMessageAdd.arn,
        },
        link: [onGmailMessageAdd, onImprovmxMessageAdd],
      },
      { events: ['s3:ObjectCreated:*'] }
    );

    // Housekeeping
    const reloadRaw = new sst.aws.Function('ReloadRawEmails', {
      handler: 'backend/functions/housekeeping/reload-raw.handler',
      link: [bucket, bucketSubscriber.nodes.function],
      environment: {
        SUBSCRIBER_FUNCTION_ARN: bucketSubscriber.nodes.function.arn,
      },
    });
  },
});
