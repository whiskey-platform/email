import { InfisicalClient } from '@infisical/sdk';

export class Secrets {
  secretsClient: InfisicalClient;
  constructor() {
    this.secretsClient = new InfisicalClient({
      auth: {
        awsIam: {
          identityId: '9732f5a9-8ea8-457c-bbac-aac3012c9c7f',
        },
      },
    });
  }
  async get(key: string) {
    const secret = await this.secretsClient.getSecret({
      environment: 'prod',
      projectId: '1042cd74-dfae-4ab0-8fb2-7e0fc04d5f1c',
      secretName: key,
    });
    return secret.secretValue;
  }
}
