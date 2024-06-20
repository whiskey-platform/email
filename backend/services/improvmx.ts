import { logger } from './logging';

type ImprovMXError = {
  success: boolean; // = false
  errors: { [key: string]: string[] };
};

type Alias = {
  created?: number;
  forward: string;
  id: string;
  alias: string;
};

export class ImprovMX {
  baseUrl: string;
  apiKey: string;

  constructor(apiKey: string) {
    this.baseUrl = 'https://api.improvmx.com/v3/';
    this.apiKey = apiKey;
  }

  async getWildcardAlias(domain: string): Promise<Alias> {
    logger.info(`Getting wildcard alias info for domain: ${domain}`);
    const apiKey = this.apiKey;
    const res = await fetch(this.baseUrl + `domains/${domain}/aliases/*`, {
      headers: {
        Authorization: `Basic api:${apiKey}`,
      },
    });
    const data = (await res.json()) as { success: boolean; alias: Alias };
    if (data.success == true) {
      logger.info(`Successfully retrieved wildcard alias info for domain: ${domain}`);
      return data.alias;
    }
    throw data;
  }

  async updateWildcardAlias(domain: string, forward: string): Promise<Alias> {
    logger.info(`Updating wildcard alias for domain: ${domain}`);
    const apiKey = this.apiKey;
    const res = await fetch(this.baseUrl + `domains/${domain}/aliases/*`, {
      method: 'PUT',
      headers: {
        Authorization: `Basic api:${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        forward,
      }),
    });
    const data = (await res.json()) as { success: boolean; alias: Alias };
    if (data.success == true) {
      logger.info(`Successfully updated wildcard alias for domain: ${domain}`);
      return data.alias;
    }
    throw data;
  }
}
