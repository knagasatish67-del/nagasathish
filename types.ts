
export interface TradingSignal {
  signal: 'BUY' | 'SELL' | 'HOLD' | 'WAIT';
  confidence: number; // 0-100
  ticker: string; // e.g., AAPL, BTC
  entryPrice: string;
  targetPrice: string;
  stopLoss: string;
  timeframe: string;
  reasoning: string;
  detectedPattern?: string; // Specific chart pattern (e.g. "Bull Flag")
  technicalIndicators: string[];
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
}

export interface ValidationChecks {
  liquidity: boolean;
  volatility: boolean;
  marketStructure: boolean;
  timingValid: boolean; // New: 9:45 - 2:30 check
  marketAlignment: boolean; // Generalized Market alignment (Global)
}

export interface ProbabilityAssessment {
  technicalScore: number;
  probTarget1: number; // 3% Target Probability
  probTarget2: number; // 5% Target Probability
  probStopLoss: number;
}

export interface TechnicalSetup {
  trend: string;
  breakoutLevel: string;
  rsiValue: number;
  macdCondition: string;
  vwapCondition: string;
}

export interface VolumeAnalysis {
  currentVolume: string;
  vsAverage: string; // e.g. "120% higher"
  trend: 'Increasing' | 'Decreasing';
}

export interface AuraEdgeAnalysis extends TradingSignal {
  auraScore: number; // 0-100 The "Perfect" Indicator
  components: {
    technicalScore: number;
    sentimentScore: number;
    volatilityScore: number;
  };
  marketCondition: 'TRENDING' | 'RANGING' | 'VOLATILE' | 'CORRECTING';
  
  // QUANTUM SENTINEL / GLOBAL MARKET FIELDS
  qualificationStatus: 'APPROVED' | 'REJECTED';
  qualificationScore: number; // 0-100
  validationChecks: ValidationChecks;
  
  // New specific fields for Intraday System
  predictedMovement?: string; // "3-5%"
  targets?: {
    target1: string; // 3%
    target2: string; // 5%
  };
  probabilityAssessment?: ProbabilityAssessment;
  technicalSetup?: TechnicalSetup;
  volumeAnalysis?: VolumeAnalysis;

  // Pattern Engine Specifics
  patternType?: string; // e.g. "Bullish Continuation"
  patternConfidence?: number; // 0-100
}

export interface TradeExecution {
  id: string;
  timestamp: number;
  ticker: string;
  type: 'BUY' | 'SELL';
  amount: number; // Position size
  entry: number;
  pnl?: number; // Simulated PnL
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

// Re-exporting for backward compatibility in state
export type AnalysisResult = AuraEdgeAnalysis & {
  timestamp: Date;
};

// --- NEW TYPES FOR REAL-TIME FEATURES ---

export interface MarketData {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  high: number;
  low: number;
  timestamp: number;
  trend: number[]; // Last 20 price points for sparkline/analysis
}

export interface AlertConfig {
  targetPrice: number;
  condition: 'ABOVE' | 'BELOW';
  isActive: boolean;
}

export interface WatchlistItem {
  symbol: string;
  name: string;
  category: 'CRYPTO' | 'STOCK' | 'FOREX' | 'INDEX' | 'COMMODITY';
  data: MarketData | null;
  analysis: AuraEdgeAnalysis | null;
  lastAnalyzed: number;
  isAnalyzing: boolean;
  alert?: AlertConfig;
}
