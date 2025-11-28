
import { MarketData } from '../types';

// Simulated initial prices (Indian Market in INR)
const INITIAL_PRICES: Record<string, number> = {
  'NIFTY 50': 22450.00,
  'INDIA VIX': 12.50,
  'RELIANCE': 2980.50,
  'HDFCBANK': 1450.20,
  'TATASTEEL': 155.80,
  'INFY': 1485.35,
  'SBIN': 760.00,
  'ADANIENT': 3120.50,
  'ICICIBANK': 1090.15,
  'BAJFINANCE': 6850.00
};

type MarketUpdateCallback = (data: MarketData[]) => void;

export class MarketStreamService {
  private subscribers: MarketUpdateCallback[] = [];
  private intervalId: number | null = null;
  private marketState: Record<string, MarketData> = {};

  constructor() {
    // Initialize state
    Object.entries(INITIAL_PRICES).forEach(([symbol, price]) => {
      this.marketState[symbol] = {
        symbol,
        price,
        change: 0,
        changePercent: 0,
        volume: symbol === 'INDIA VIX' ? 0 : Math.floor(Math.random() * 5000000), // Higher volume for Indian stocks
        high: price,
        low: price,
        timestamp: Date.now(),
        trend: Array(20).fill(price) // Fill history with initial price
      };
    });
  }

  public connect() {
    if (this.intervalId) return;
    
    console.log("🔌 Indian Market Stream Connected");
    
    // Simulate tick updates every 1 second
    this.intervalId = window.setInterval(() => {
      this.updateMarket();
    }, 1000);
  }

  public disconnect() {
    if (this.intervalId) {
      window.clearInterval(this.intervalId);
      this.intervalId = null;
    }
    console.log("🔌 Market Stream Disconnected");
  }

  public subscribe(callback: MarketUpdateCallback) {
    this.subscribers.push(callback);
    // Send immediate initial data
    callback(Object.values(this.marketState));
  }

  public unsubscribe(callback: MarketUpdateCallback) {
    this.subscribers = this.subscribers.filter(cb => cb !== callback);
  }

  private updateMarket() {
    const updates: MarketData[] = [];

    Object.keys(this.marketState).forEach(symbol => {
      const current = this.marketState[symbol];
      
      // Random walk volatility simulation
      let volatility = 0.001; 
      if (symbol === 'INDIA VIX') volatility = 0.02; // VIX moves more percentage wise
      
      const change = current.price * (Math.random() * volatility * 2 - volatility);
      
      let newPrice = current.price + change;
      newPrice = Math.max(0.01, newPrice); // Prevent negative prices

      // Update High/Low
      const newHigh = Math.max(current.high, newPrice);
      const newLow = Math.min(current.low, newPrice);
      
      // Update Trend History
      const newTrend = [...current.trend.slice(1), newPrice];

      const updatedData: MarketData = {
        ...current,
        price: parseFloat(newPrice.toFixed(2)),
        change: parseFloat((newPrice - INITIAL_PRICES[symbol]).toFixed(2)),
        changePercent: parseFloat((((newPrice - INITIAL_PRICES[symbol]) / INITIAL_PRICES[symbol]) * 100).toFixed(2)),
        high: parseFloat(newHigh.toFixed(2)),
        low: parseFloat(newLow.toFixed(2)),
        volume: current.volume + (symbol === 'INDIA VIX' ? 0 : Math.floor(Math.random() * 1500)), 
        timestamp: Date.now(),
        trend: newTrend
      };

      this.marketState[symbol] = updatedData;
      updates.push(updatedData);
    });

    this.notifySubscribers(updates);
  }

  private notifySubscribers(data: MarketData[]) {
    this.subscribers.forEach(callback => callback(data));
  }

  public getLatest(symbol: string): MarketData | null {
    return this.marketState[symbol] || null;
  }
}
