export interface InstrumentSummary {
  id: string;
  symbol: string;
}

export interface InstrumentRepository {
  findById(id: string): Promise<InstrumentSummary | null>;
  findBySymbol(symbol: string): Promise<InstrumentSummary | null>;
}
