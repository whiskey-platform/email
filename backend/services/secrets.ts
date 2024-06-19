import { InfisicalClient } from '@infisical/sdk';

const secretsClient = new InfisicalClient({
  auth: {
    awsIam: {
      identityId: '9732f5a9-8ea8-457c-bbac-aac3012c9c7f',
    },
  },
});

export const getSecret = (key: string) =>
  secretsClient.getSecret({
    environment: 'prod',
    projectId: '1042cd74-dfae-4ab0-8fb2-7e0fc04d5f1c',
    secretName: key,
  });
