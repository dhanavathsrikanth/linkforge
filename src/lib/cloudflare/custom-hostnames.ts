import { cfHostnameStatusEnum, cfSslStatusEnum } from "@/lib/db/schema";

export type CfHostnameStatus = (typeof cfHostnameStatusEnum.enumValues)[number];
export type CfSslStatus = (typeof cfSslStatusEnum.enumValues)[number];

export interface CfDcvDelegationRecord {
  cname?: string;
  cname_target?: string;
  emails?: string[];
  http_body?: string;
  http_url?: string;
  status?: string;
  txt_name?: string;
  txt_value?: string;
}

export interface CfSslSettings {
  ciphers?: string[];
  early_hints?: "on" | "off";
  http2?: "on" | "off";
  min_tls_version?: "1.0" | "1.1" | "1.2" | "1.3";
  tls_1_3?: "on" | "off";
}

export interface CfSsl {
  id?: string;
  bundle_method?: "ubiquitous" | "optimal" | "force";
  certificate_authority?: "digicert" | "google" | "lets_encrypt" | "ssl_com";
  custom_certificate?: string;
  custom_csr_id?: string;
  custom_key?: string;
  dcv_delegation_records?: CfDcvDelegationRecord[];
  expires_on?: string;
  hosts?: string[];
  issuer?: string;
  method: "http" | "txt" | "email";
  serial_number?: string;
  settings?: CfSslSettings;
  signature?: string;
  status: CfSslStatus;
  type?: "dv";
  uploaded_on?: string;
  validation_errors?: Array<{ message?: string }>;
  validation_records?: CfDcvDelegationRecord[];
  wildcard?: boolean;
}

export interface CfOwnershipVerification {
  name?: string;
  type?: "txt";
  value?: string;
}

export interface CfOwnershipVerificationHttp {
  http_body?: string;
  http_url?: string;
}

export interface CfCustomHostname {
  id: string;
  hostname: string;
  created_at?: string;
  custom_metadata?: Record<string, unknown>;
  custom_origin_server?: string;
  custom_origin_sni?: string;
  ownership_verification?: CfOwnershipVerification;
  ownership_verification_http?: CfOwnershipVerificationHttp;
  ssl?: CfSsl;
  status: CfHostnameStatus;
  verification_errors?: string[];
}

export interface CfListResultInfo {
  count: number;
  page: number;
  per_page: number;
  total_count: number;
  total_pages: number;
}

export interface CfCreateHostnameOptions {
  hostname: string;
  sslMethod?: "http" | "txt" | "email";
  customMetadata?: Record<string, unknown>;
  customOriginServer?: string;
}

interface CfApiResponse<T> {
  success: boolean;
  result: T;
  result_info?: CfListResultInfo;
  errors?: Array<{ code: number; message: string; documentation_url?: string }>;
  messages?: Array<{ code: number; message: string; documentation_url?: string }>;
}

class CloudflareCustomHostnames {
  private apiToken: string;
  private zoneId: string;
  private baseUrl: string;

  constructor() {
    this.apiToken = process.env.CLOUDFLARE_API_TOKEN || "";
    this.zoneId = process.env.CLOUDFLARE_ZONE_ID || "";
    this.baseUrl = "https://api.cloudflare.com/client/v4";

    if (!this.apiToken) {
      console.warn("[Cloudflare] CLOUDFLARE_API_TOKEN not configured - Custom Hostnames will be skipped");
    }
    if (!this.zoneId) {
      console.warn("[Cloudflare] CLOUDFLARE_ZONE_ID not configured - Custom Hostnames will be skipped");
    }
  }

  isConfigured(): boolean {
    return !!this.apiToken && !!this.zoneId;
  }

  private async request<T>(
    endpoint: string,
    options?: RequestInit
  ): Promise<CfApiResponse<T>> {
    if (!this.isConfigured()) {
      throw new Error("Cloudflare not configured. Set CLOUDFLARE_API_TOKEN and CLOUDFLARE_ZONE_ID.");
    }

    const url = `${this.baseUrl}/zones/${this.zoneId}${endpoint}`;

    const response = await fetch(url, {
      ...options,
      headers: {
        "Authorization": `Bearer ${this.apiToken}`,
        "Content-Type": "application/json",
        ...options?.headers,
      },
    });

    const data = (await response.json()) as CfApiResponse<T>;

    if (!response.ok || !data.success) {
      const errorMsg = data.errors?.[0]?.message || `Cloudflare API error: ${response.status}`;
      throw new Error(errorMsg);
    }

    return data;
  }

  async create(options: CfCreateHostnameOptions): Promise<CfCustomHostname> {
    const body: Record<string, unknown> = {
      hostname: options.hostname,
      ssl: {
        method: options.sslMethod || "http",
        type: "dv",
        settings: {
          min_tls_version: "1.2",
          http2: "on",
        },
      },
    };

    if (options.customMetadata) {
      body.custom_metadata = options.customMetadata;
    }

    if (options.customOriginServer) {
      body.custom_origin_server = options.customOriginServer;
    }

    const data = await this.request<CfCustomHostname>("/custom_hostnames", {
      method: "POST",
      body: JSON.stringify(body),
    });

    return data.result;
  }

  async get(hostnameId: string): Promise<CfCustomHostname> {
    const data = await this.request<CfCustomHostname>(`/custom_hostnames/${hostnameId}`);
    return data.result;
  }

  async getByHostname(hostname: string): Promise<CfCustomHostname | null> {
    const data = await this.request<CfCustomHostname[]>(
      `/custom_hostnames?hostname=${encodeURIComponent(hostname)}`
    );
    return data.result?.[0] || null;
  }

  async list(options?: {
    id?: string;
    hostname?: string;
    hostnameFilter?: string;
    hostnameStatus?: CfHostnameStatus;
    sslStatus?: CfSslStatus;
    certificateAuthority?: 'google' | 'lets_encrypt' | 'ssl_com';
    customOriginServer?: string;
    direction?: 'asc' | 'desc';
    order?: 'ssl' | 'ssl_status';
    page?: number;
    perPage?: number;
    ssl?: 0 | 1;
    wildcard?: boolean;
  }): Promise<{ result: CfCustomHostname[]; resultInfo: CfListResultInfo }> {
    const params = new URLSearchParams();
    if (options?.id) params.set("id", options.id);
    if (options?.hostname) params.set("hostname", options.hostname);
    if (options?.hostnameFilter) params.set("hostname[contain]", options.hostnameFilter);
    if (options?.hostnameStatus) params.set("hostname_status", options.hostnameStatus);
    if (options?.sslStatus) params.set("ssl_status", options.sslStatus);
    if (options?.certificateAuthority) params.set("certificate_authority", options.certificateAuthority);
    if (options?.customOriginServer) params.set("custom_origin_server", options.customOriginServer);
    if (options?.direction) params.set("direction", options.direction);
    if (options?.order) params.set("order", options.order);
    if (options?.page) params.set("page", options.page.toString());
    if (options?.perPage) params.set("per_page", options.perPage.toString());
    if (options?.ssl !== undefined) params.set("ssl", options.ssl.toString());
    if (options?.wildcard !== undefined) params.set("wildcard", options.wildcard.toString());

    const queryString = params.toString();
    const endpoint = queryString ? `/custom_hostnames?${queryString}` : "/custom_hostnames";

    const data = await this.request<CfCustomHostname[]>(endpoint);
    return {
      result: data.result,
      resultInfo: data.result_info ?? {
        count: 0, page: 1, per_page: 20,
        total_count: 0, total_pages: 0,
      },
    };
  }

  async update(
    hostnameId: string,
    updates: {
      ssl?: { method?: "http" | "txt" | "email" };
      customMetadata?: Record<string, unknown>;
    }
  ): Promise<CfCustomHostname> {
    const body: Record<string, unknown> = {};

    if (updates.ssl) {
      body.ssl = {
        method: updates.ssl.method || "http",
        type: "dv",
      };
    }

    if (updates.customMetadata) {
      body.custom_metadata = updates.customMetadata;
    }

    const requestBody =
      Object.keys(body).length > 0
        ? body
        : { ssl: { method: "http" as const, type: "dv" as const } };

    const data = await this.request<CfCustomHostname>(`/custom_hostnames/${hostnameId}`, {
      method: "PATCH",
      body: JSON.stringify(requestBody),
    });

    return data.result;
  }

  async revalidate(hostnameId: string): Promise<CfCustomHostname> {
    return this.update(hostnameId, {});
  }

  async delete(hostnameId: string): Promise<void> {
    await this.request<{ id: string }>(`/custom_hostnames/${hostnameId}`, {
      method: "DELETE",
    });
  }
}

export const cloudflareCustomHostnames = new CloudflareCustomHostnames();
