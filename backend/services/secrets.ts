import { InfisicalClient } from '@infisical/sdk';
import { logger } from './logging';

export class Secrets {
  secretsClient: InfisicalClient;
  constructor() {
    logger.info('Creating secrets client');
    this.secretsClient = new InfisicalClient({
      auth: {
        awsIam: {
          identityId: '9732f5a9-8ea8-457c-bbac-aac3012c9c7f',
        },
      },
    });
    logger.info('Successfully authenticated with Infisical');
  }
  async get(key: string) {
    logger.info(`Getting secret ${key}`);
    const secret = await this.secretsClient.getSecret({
      environment: 'prod',
      projectId: '1042cd74-dfae-4ab0-8fb2-7e0fc04d5f1c',
      secretName: key,
    });
    logger.info(`Successfully retrieved secret value for key: ${key}`);
    return secret.secretValue;
  }
}
