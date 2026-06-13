import { createPaperBroker, OrderSide, OrderStatus } from '../../src/broker/index.js';
import { createPositionId as portfolioPositionId } from '../../src/portfolio/index.js';

describe('PaperBroker integration', () => {
  const timestamp = new Date('2024-01-15T09:15:00.000Z');

  it('runs an equity round-trip with position and pnl tracking', async () => {
    const broker = createPaperBroker({ initialCapital: 100_000, includeCosts: false });

    await broker.placeOrder({
      instrumentId: 'inst-nifty',
      strategyName: 'equity',
      side: OrderSide.BUY,
      quantity: 50,
      price: 100,
      timestamp,
    });

    broker.markToMarket([
      {
        positionId: portfolioPositionId('equity', 'inst-nifty'),
        markPrice: 105,
      },
    ]);

    let pnl = broker.getPnlSummary();
    expect(pnl.unrealizedPnl).toBe(250);
    expect(pnl.totalPnl).toBe(250);
    expect(pnl.equity).toBe(95_250);

    const positions = await broker.getPositions();
    expect(positions[0]?.unrealizedPnl).toBe(250);

    const sell = await broker.placeOrder({
      instrumentId: 'inst-nifty',
      strategyName: 'equity',
      side: OrderSide.SELL,
      quantity: 50,
      price: 110,
      timestamp: new Date('2024-01-16T09:15:00.000Z'),
    });

    expect(sell.order.status).toBe(OrderStatus.FILLED);
    expect(sell.fill?.realizedPnl).toBe(500);
    expect(broker.getFills()).toHaveLength(2);

    pnl = broker.getPnlSummary();
    expect(pnl.realizedPnl).toBe(500);
    expect(pnl.unrealizedPnl).toBe(0);
    expect(pnl.cash).toBe(100_500);
    expect(await broker.getPositions()).toHaveLength(0);
  });

  it('runs a defined-risk spread lifecycle with margin and pnl tracking', async () => {
    const broker = createPaperBroker({ initialCapital: 100_000, includeCosts: false });

    const open = await broker.placeOrder({
      instrumentId: 'inst-nifty',
      strategyName: 'bull-put-spread',
      side: OrderSide.BUY,
      quantity: 50,
      price: 55,
      timestamp,
      definedRisk: {
        entryCredit: 55,
        maxLoss: 295,
      },
    });

    expect(open.fill?.realizedPnl).toBe(0);
    expect(broker.getPnlSummary().cash).toBe(102_750);

    const spreadPositionId = portfolioPositionId('bull-put-spread', 'inst-nifty');
    broker.markToMarket([{ positionId: spreadPositionId, markPrice: 30 }]);

    let pnl = broker.getPnlSummary();
    expect(pnl.unrealizedPnl).toBe(1_250);
    expect(pnl.totalPnl).toBe(1_250);

    const close = await broker.placeOrder({
      instrumentId: 'inst-nifty',
      strategyName: 'bull-put-spread',
      side: OrderSide.SELL,
      quantity: 50,
      price: 25,
      timestamp: new Date('2024-01-20T09:15:00.000Z'),
      definedRisk: {
        maxLoss: 295,
        closeCost: 25,
      },
    });

    expect(close.fill?.realizedPnl).toBe(1_500);
    pnl = broker.getPnlSummary();
    expect(pnl.realizedPnl).toBe(1_500);
    expect(pnl.unrealizedPnl).toBe(0);
    expect(pnl.cash).toBe(101_500);
    expect(await broker.getPositions()).toHaveLength(0);
    expect(broker.getOrders()).toHaveLength(2);
  });

  it('tracks multiple strategies independently', async () => {
    const broker = createPaperBroker({ initialCapital: 200_000, includeCosts: false });

    await broker.placeOrder({
      instrumentId: 'inst-nifty',
      strategyName: 'bull-put-spread',
      side: OrderSide.BUY,
      quantity: 50,
      price: 55,
      timestamp,
      definedRisk: { entryCredit: 55, maxLoss: 295 },
    });

    await broker.placeOrder({
      instrumentId: 'inst-nifty',
      strategyName: 'iron-condor',
      side: OrderSide.BUY,
      quantity: 50,
      price: 110,
      timestamp,
      legGroupId: 'ic-1',
      definedRisk: { entryCredit: 110, maxLoss: 240 },
    });

    await broker.placeOrder({
      instrumentId: 'inst-reliance',
      strategyName: 'equity',
      side: OrderSide.BUY,
      quantity: 10,
      price: 2_500,
      timestamp,
    });

    const positions = await broker.getPositions();
    expect(positions).toHaveLength(3);
    expect(new Set(positions.map((position) => position.strategyName)).size).toBe(3);
  });
});
