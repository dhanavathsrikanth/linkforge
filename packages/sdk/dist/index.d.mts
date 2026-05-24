interface Link {
    id: string;
    workspaceId: string;
    shortUrl: string;
    destination: string;
    slug: string;
    domain: string;
    title: string | null;
    description: string | null;
    tags: string[];
    isActive: boolean;
    expiresAt: string | null;
    clickLimit: number | null;
    totalClicks: number;
    uniqueClicks: number;
    password: string | null;
    utmSource: string | null;
    utmMedium: string | null;
    utmCampaign: string | null;
    utmTerm: string | null;
    utmContent: string | null;
    abTestEnabled: boolean;
    abTestVariants: ABVariant[] | null;
    iosDestination: string | null;
    androidDestination: string | null;
    geoRouting: Record<string, string> | null;
    qrSettings: QRSettings | null;
    createdAt: string;
    updatedAt: string;
}
interface CreateLinkOptions {
    destination: string;
    slug?: string;
    domain?: string;
    title?: string;
    tags?: string[];
    expiresAt?: string;
    clickLimit?: number;
    password?: string;
    utm?: {
        source?: string;
        medium?: string;
        campaign?: string;
        term?: string;
        content?: string;
    };
    abTest?: {
        enabled: boolean;
        variants: Array<{
            destination: string;
            weight: number;
            label: string;
        }>;
    };
    smartRouting?: {
        ios?: string;
        android?: string;
        geo?: Record<string, string>;
    };
}
interface UpdateLinkOptions extends Partial<CreateLinkOptions> {
    isActive?: boolean;
}
interface ListLinksOptions {
    search?: string;
    tag?: string;
    page?: number;
    limit?: number;
    sortBy?: "clicks" | "created" | "updated";
    order?: "asc" | "desc";
    isActive?: boolean;
}
interface LinkList {
    links: Link[];
    total: number;
    page: number;
    limit: number;
    hasMore: boolean;
}
interface LinkAnalytics {
    summary: {
        totalClicks: number;
        uniqueClicks: number;
        totalConversions: number;
        conversionRate: number;
        comparedToPrevious: {
            clicks: number;
            uniqueClicks: number;
        };
    };
    timeSeries: {
        labels: string[];
        clicks: number[];
        uniqueClicks: number[];
    };
    geography: {
        byCountry: Array<{
            country: string;
            clicks: number;
            percentage: number;
        }>;
    };
    devices: {
        byDeviceType: Array<{
            type: string;
            clicks: number;
            percentage: number;
        }>;
    };
    browsers: {
        byBrowser: Array<{
            browser: string;
            clicks: number;
            percentage: number;
        }>;
    };
    referrers: {
        byType: Array<{
            type: string;
            clicks: number;
        }>;
    };
    abTestResults: ABTestResult | null;
}
interface AnalyticsOptions {
    range?: "1h" | "24h" | "7d" | "30d" | "90d" | "365d";
    startDate?: string;
    endDate?: string;
    groupBy?: "hour" | "day" | "week" | "month";
}
interface ABVariant {
    id: string;
    destination: string;
    weight: number;
    label: string;
    clicks: number;
    conversions: number;
    conversionRate: number;
}
interface ABTestResult {
    winner: string | null;
    confidence: number;
    isSignificant: boolean;
    recommendation: string;
    variantStats: Array<{
        destination: string;
        label: string;
        clicks: number;
        conversionRate: number;
        relativeUplift: number;
        pValue: number;
        isControl: boolean;
    }>;
}
interface QRSettings {
    fgColor: string;
    bgColor: string;
    errorLevel: "L" | "M" | "Q" | "H";
    size: number;
    logoUrl?: string;
    rounded: boolean;
    frameStyle: "none" | "border" | "scan-me";
}
interface QRCodeOptions {
    size?: number;
    fgColor?: string;
    bgColor?: string;
    errorLevel?: "L" | "M" | "Q" | "H";
    format?: "png" | "svg";
    logoUrl?: string;
    rounded?: boolean;
}
interface Workspace {
    id: string;
    name: string;
    slug: string;
    plan: "free" | "starter" | "growth" | "agency" | "business" | "enterprise";
    usage: {
        linksThisMonth: number;
        clicksThisMonth: number;
        customDomains: number;
        teamMembers: number;
    };
    limits: {
        linksPerMonth: number;
        clicksTrackedPerMonth: number;
        customDomains: number;
        teamMembers: number;
    };
}
interface ConversionEvent {
    linkId: string;
    event: string;
    value?: number;
    currency?: string;
    metadata?: Record<string, unknown>;
    sessionId?: string;
    customerId?: string;
}
interface AttributionReport {
    model: "first_touch" | "last_touch" | "linear" | "time_decay";
    totalConversions: number;
    totalRevenue: number;
    linkCredits: Array<{
        linkId: string;
        slug: string;
        credit: number;
        creditValue: number;
        assistedConversions: number;
        directConversions: number;
    }>;
    avgTouchpointsToConvert: number;
    avgDaysToConvert: number;
}
interface LinkForgeError extends Error {
    code: string;
    status: number;
}
interface LinkForgeConfig {
    apiKey: string;
    baseUrl?: string;
    timeout?: number;
    retry?: {
        attempts: number;
        delay: number;
    };
}

declare class LinkForgeClient {
    readonly apiKey: string;
    readonly baseUrl: string;
    readonly timeout: number;
    private readonly retry;
    constructor(config: LinkForgeConfig);
    request<T>(method: "GET" | "POST" | "PATCH" | "DELETE", path: string, body?: unknown, params?: Record<string, string | number | boolean | undefined>): Promise<T>;
}

declare class LinksResource {
    private readonly client;
    constructor(client: LinkForgeClient);
    create(options: CreateLinkOptions): Promise<Link>;
    list(options?: ListLinksOptions): Promise<LinkList>;
    get(id: string): Promise<Link>;
    update(id: string, options: UpdateLinkOptions): Promise<Link>;
    delete(id: string): Promise<void>;
    analytics(id: string, options?: AnalyticsOptions): Promise<LinkAnalytics>;
    bulkCreate(links: CreateLinkOptions[]): Promise<Link[]>;
    getQRCode(id: string, options?: {
        size?: number;
        format?: "png" | "svg";
    }): Promise<string>;
}

declare class AnalyticsResource {
    private readonly client;
    constructor(client: LinkForgeClient);
    getWorkspaceAnalytics(options?: {
        range?: string;
        startDate?: string;
        endDate?: string;
        groupBy?: string;
    }): Promise<unknown>;
    trackConversion(event: ConversionEvent): Promise<void>;
    getAttribution(options: {
        model: "first_touch" | "last_touch" | "linear" | "time_decay";
        range?: string;
    }): Promise<AttributionReport>;
    exportCSV(options: {
        range?: string;
        linkId?: string;
    }): Promise<Blob>;
}

declare class LinkForge {
    readonly links: LinksResource;
    readonly analytics: AnalyticsResource;
    constructor(config: LinkForgeConfig | string);
}

export { type ABTestResult, type ABVariant, type AnalyticsOptions, AnalyticsResource, type AttributionReport, type ConversionEvent, type CreateLinkOptions, type Link, type LinkAnalytics, LinkForge, LinkForgeClient, type LinkForgeConfig, type LinkForgeError, type LinkList, LinksResource, type ListLinksOptions, type QRCodeOptions, type QRSettings, type UpdateLinkOptions, type Workspace, LinkForge as default };
