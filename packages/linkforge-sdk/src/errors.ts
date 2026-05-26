export class PivotUrlError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "PivotUrlError";
  }
}

export class AuthenticationError extends PivotUrlError {
  constructor(message = "Invalid or missing API key.") {
    super(message, "UNAUTHORIZED", 401);
    this.name = "AuthenticationError";
  }
}

export class RateLimitError extends PivotUrlError {
  constructor(
    message = "API rate limit exceeded.",
    public readonly resetTime?: number,
  ) {
    super(message, "RATE_LIMITED", 429);
    this.name = "RateLimitError";
  }
}

export class ValidationError extends PivotUrlError {
  constructor(message: string, public readonly details?: unknown) {
    super(message, "VALIDATION_ERROR", 422);
    this.name = "ValidationError";
  }
}

export class NotFoundError extends PivotUrlError {
  constructor(message = "Resource not found.") {
    super(message, "NOT_FOUND", 404);
    this.name = "NotFoundError";
  }
}

export class ForbiddenError extends PivotUrlError {
  constructor(message = "Publishable API keys cannot perform this action.") {
    super(message, "FORBIDDEN", 403);
    this.name = "ForbiddenError";
  }
}
