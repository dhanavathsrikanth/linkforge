export declare class LinkForgeError extends Error {
    readonly code: string;
    readonly status: number;
    constructor(message: string, code: string, status: number);
}
export declare class AuthenticationError extends LinkForgeError {
    constructor(message?: string);
}
export declare class RateLimitError extends LinkForgeError {
    readonly resetTime?: number | undefined;
    constructor(message?: string, resetTime?: number | undefined);
}
export declare class ValidationError extends LinkForgeError {
    readonly details?: unknown | undefined;
    constructor(message: string, details?: unknown | undefined);
}
export declare class NotFoundError extends LinkForgeError {
    constructor(message?: string);
}
export declare class ForbiddenError extends LinkForgeError {
    constructor(message?: string);
}
//# sourceMappingURL=errors.d.ts.map