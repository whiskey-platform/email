import { logger } from './logging';
import axios from 'axios';
import { STSClient, GetCallerIdentityCommand } from '@aws-sdk/client-sts';
import { fromNodeProviderChain } from '@aws-sdk/credential-providers';
import { Sha256 } from '@aws-crypto/sha256-js';
import { createRequest } from '@aws-sdk/util-create-request';
import { SignatureV4 } from '@smithy/signature-v4';

interface InfisicalAccessInfo {
  accessToken: string;
  expiresIn: number;
  accessTokenMaxTTL: number;
  tokenType: string;
}
interface GetSecretResponse {
  secret: {
    environment: string;
    isFallback?: boolean;
    secretComment: string;
    secretKey: string;
    secretPath?: null | string;
    secretValue: string;
    type: string;
    version: number;
    workspace: string;
    [property: string]: any;
  };
}
export class Secrets {
  async get(key: string) {
    const accessToken = await this.getAccessToken();
    logger.info(`Getting secret ${key}`);
    const { data }: { data: GetSecretResponse } = await axios.get(
      `https://app.infisical.com/api/v3/secrets/raw/${key}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        params: {
          workspaceId: '1042cd74-dfae-4ab0-8fb2-7e0fc04d5f1c',
          environment: 'prod',
        },
      }
    );
    logger.info(`Successfully retrieved secret value for key: ${key}`);
    return data.secret.secretValue;
  }

  private async getAccessToken() {
    logger.info('Getting Infisical access token');
    const region = 'us-east-1';
    const iamRequestURL = `https://sts.${region}.amazonaws.com/`;

    const iamRequestBody = 'Action=GetCallerIdentity&Version=2011-06-15';
    const iamRequestHeaders = {
      'Content-Type': 'application/x-www-form-urlencoded; charset=utf-8',
      Host: `sts.${region}.amazonaws.com`,
    };

    const credentialProvider = fromNodeProviderChain();
    const credentials = await credentialProvider();

    const v4 = new SignatureV4({
      region,
      service: 'sts',
      credentials,
      sha256: Sha256,
    });
    const request = await createRequest(
      new STSClient({ endpoint: iamRequestURL }),
      new GetCallerIdentityCommand({})
    );
    logger.info('Signing request');
    const signedRequest = await v4.sign(request);
    const infisicalUrl = 'https://app.infisical.com';
    const identityId = '9732f5a9-8ea8-457c-bbac-aac3012c9c7f';
    logger.info('Requesting Infisical access token with signed headers');
    const { data }: { data: InfisicalAccessInfo } = await axios.post(
      `${infisicalUrl}/api/v1/auth/aws-auth/login`,
      {
        identityId,
        iamHttpRequestMethod: 'POST',
        iamRequestUrl: Buffer.from(iamRequestURL).toString('base64'),
        iamRequestBody: Buffer.from(iamRequestBody).toString('base64'),
        iamRequestHeaders: Buffer.from(JSON.stringify(signedRequest.headers)).toString('base64'),
      }
    );
    logger.info('Successfully retrieved Infisical access token');
    return data.accessToken;
  }
}
