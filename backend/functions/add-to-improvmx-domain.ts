import { Handler } from 'aws-lambda';
import { ImprovMX } from '../services/improvmx';
import { Secrets } from '../services/secrets';

export const handler: Handler = async event => {
  const secrets = new Secrets();
  const improvmxApiKey = await secrets.get('IMPROVMX_API_KEY');
  const improvmx = new ImprovMX(improvmxApiKey);
  console.log('event', event);
  const payload = JSON.parse(event.body ?? '{}');
  const webhook = payload['webhook'];
  const wildcardAlias = await improvmx.getWildcardAlias('mattwyskiel.com');
  // if the wildcard alias, separated by commas, does not include the webhook URL
  if (!wildcardAlias.forward.split(',').includes(webhook)) {
    const newForward = wildcardAlias.forward + ',' + webhook;
    await improvmx.updateWildcardAlias('mattwyskiel.com', newForward);
  }
};
