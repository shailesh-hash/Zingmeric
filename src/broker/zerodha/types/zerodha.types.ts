export interface ZerodhaInstrumentReference {
  instrumentId: string;
  exchange: string;
  tradingsymbol: string;
  product?: 'CNC' | 'MIS' | 'NRML';
}

export interface ZerodhaBrokerConfig {
  defaultProduct?: 'CNC' | 'MIS' | 'NRML';
  orderVariety?: 'regular' | 'amo' | 'co' | 'iceberg';
}

export interface KitePlaceOrderRequest {
  variety: string;
  exchange: string;
  tradingsymbol: string;
  transaction_type: 'BUY' | 'SELL';
  quantity: number;
  order_type: 'MARKET' | 'LIMIT';
  product: 'CNC' | 'MIS' | 'NRML';
  price?: number;
  validity?: 'DAY' | 'IOC' | 'TTL';
}

export interface KiteCancelOrderRequest {
  variety: string;
  orderId: string;
}

export interface KiteRawOrderResponse {
  order_id: string;
}

export interface KiteOrderResponse {
  orderId: string;
}

export interface KiteNetPosition {
  tradingsymbol: string;
  exchange: string;
  product: string;
  quantity: number;
  average_price: number;
  last_price: number;
  pnl: number;
  unrealised: number;
  realised: number;
}

export interface KitePositionsResponse {
  net: KiteNetPosition[];
}

export interface KiteApiSuccessResponse<T> {
  status: 'success';
  data: T;
}

export interface KiteApiErrorResponse {
  status: 'error';
  message: string;
  error_type: string;
}

export type KiteApiResponse<T> = KiteApiSuccessResponse<T> | KiteApiErrorResponse;

export interface KiteApiClientConfig {
  apiKey: string;
  accessToken: string;
  baseUrl?: string;
}
