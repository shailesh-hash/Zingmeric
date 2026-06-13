export class InvalidAnalyticsRequestError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidAnalyticsRequestError';
  }
}
