export interface UpstoxInstrumentReference {
  instrumentId: string;
  instrumentToken: string;
  exchange: string;
  tradingsymbol: string;
  product?: 'D' | 'I';
}

export interface UpstoxBrokerConfig {
  defaultProduct?: 'D' | 'I';
  tagPrefix?: string;
}

export interface UpstoxPlaceOrderRequest {
  quantity: number;
  product: 'D' | 'I';
  validity: 'DAY' | 'IOC';
  price: number;
  tag?: string;
  instrument_token: string;
  order_type: 'MARKET' | 'LIMIT';
  transaction_type: 'BUY' | 'SELL';
  is_amo?: boolean;
}

export interface UpstoxCancelOrderRequest {
  orderId: string;
}

export interface UpstoxOrderResponse {
  orderId: string;
}

export interface UpstoxPosition {
  instrument_token: string;
  exchange: string;
  tradingsymbol: string;
  product: string;
  quantity: number;
  average_price: number;
  last_price: number;
  pnl: number;
  unrealised: number;
  realised: number;
}

export interface UpstoxPositionsResponse {
  data: UpstoxPosition[];
}

export interface UpstoxApiSuccessResponse<T> {
  status: 'success';
  data: T;
}

export interface UpstoxApiErrorResponse {
  status: 'error';
  errors: { errorCode: string; message: string }[];
}

export type UpstoxApiResponse<T> = UpstoxApiSuccessResponse<T> | UpstoxApiErrorResponse;

export interface UpstoxApiClientConfig {
  accessToken: string;
  baseUrl?: string;
}
