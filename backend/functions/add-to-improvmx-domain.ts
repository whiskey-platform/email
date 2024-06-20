import { Handler } from 'aws-lambda';
import { ImprovMX } from '../services/improvmx';
import { Secrets } from '../services/secrets';

export const handler: Handler = async event => {
  const secrets = new Secrets();
  const improvmxApiKey = await secrets.get('IMPROVMX_API_KEY');
  const improvmx = new ImprovMX(improvmxApiKey);
  const webhook = event['webhook'];
  const wildcardAlias = await improvmx.getWildcardAlias('mattwyskiel.com');

  if (!wildcardAlias.forward.split(',').includes(webhook)) {
    const newForward = wildcardAlias.forward + ',' + webhook;
    await improvmx.updateWildcardAlias('mattwyskiel.com', newForward);
  }
};
