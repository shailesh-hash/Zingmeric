export class InvalidEquitySnapshotError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidEquitySnapshotError';
  }
}

export class EquitySnapshotNotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'EquitySnapshotNotFoundError';
  }
}
