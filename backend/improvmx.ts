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
  private apiKey: string;

  constructor() {
    this.baseUrl = "https://api.improvmx.com/v3/";
    this.apiKey = process.env.IMPROVMX_API_KEY!;
  }

  async getWildcardAlias(domain: string): Promise<Alias> {
    const res = await fetch(this.baseUrl + `domains/${domain}/aliases/*`, {
      headers: {
        Authorization: `Basic api:${this.apiKey}`,
      },
    });
    const data = await res.json();
    if (data.success == true) {
      return data.alias;
    }
    throw data;
  }

  async updateWildcardAlias(domain: string, forward: string): Promise<Alias> {
    const res = await fetch(this.baseUrl + `domains/${domain}/aliases/*`, {
      method: "PUT",
      headers: {
        Authorization: `Basic api:${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        forward,
      }),
    });
    const data = await res.json();
    if (data.success == true) {
      return data.alias;
    }
    throw data;
  }
}
