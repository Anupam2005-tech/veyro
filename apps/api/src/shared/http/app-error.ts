import type { ApiFieldError } from '@veyro/contracts';

/** Only pass messages and field details suitable for returning to API clients. */
export class AppError extends Error {
  constructor(
    readonly statusCode: number,
    readonly code: string,
    message: string,
    readonly details: ApiFieldError[] = [],
  ) {
    super(message);
    this.name = new.target.name;
  }
}

export class RouteNotFoundError extends AppError {
  constructor() {
    super(404, 'ROUTE_NOT_FOUND', 'Route not found.');
  }
}
