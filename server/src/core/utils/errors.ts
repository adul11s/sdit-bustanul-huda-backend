/**
 * Domain-level error carrying an HTTP status code.
 * Thrown by services/routes when a business rule or lookup fails.
 */
export class DomainError extends Error {
  public readonly statusCode: number;

  constructor(message: string, statusCode = 400) {
    super(message);
    this.name = 'DomainError';
    this.statusCode = statusCode;
  }
}
