export interface HealthStatus {
  status: 'ok' | 'degraded';
  timestamp: string;
  services: {
    database: 'up' | 'down';
    redis: 'up' | 'down';
  };
}

export interface ReadinessResponse {
  ready: boolean;
}

export interface LivenessResponse {
  alive: boolean;
}
