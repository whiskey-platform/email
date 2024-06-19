import { Handler } from 'aws-lambda';
import { ImprovMX } from '../services/improvmx';

export const handler: Handler = async event => {
  console.log('event', event);
  const improvmx = new ImprovMX();
  const payload = JSON.parse(event.body ?? '{}');
  const webhook = payload['webhook'];
  const wildcardAlias = await improvmx.getWildcardAlias('mattwyskiel.com');
  // if the wildcard alias, separated by commas, does not include the webhook URL
  if (!wildcardAlias.forward.split(',').includes(webhook)) {
    const newForward = wildcardAlias.forward + ',' + webhook;
    await improvmx.updateWildcardAlias('mattwyskiel.com', newForward);
  }
};
