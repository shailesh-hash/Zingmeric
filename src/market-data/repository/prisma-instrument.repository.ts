import type { PrismaClient } from '@prisma/client';
import type { InstrumentRepository, InstrumentSummary } from './instrument.repository.js';

export class PrismaInstrumentRepository implements InstrumentRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findById(id: string): Promise<InstrumentSummary | null> {
    const instrument = await this.prisma.instrument.findUnique({
      where: { id },
      select: { id: true, symbol: true },
    });

    return instrument;
  }
}
