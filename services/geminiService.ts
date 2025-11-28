
import { GoogleGenAI, Type } from "@google/genai";
import { AnalysisResult, AuraEdgeAnalysis, MarketData } from "../types";

// Initialize Gemini Client
const apiKey = process.env.API_KEY || '';
const ai = new GoogleGenAI({ apiKey });

// INTRADAY PATTERN RECOGNITION ENGINE PROMPT
const SENTINEL_PROMPT = `
Role: You are the "Intraday Pattern Recognition Engine", a specialized AI model trained for high-precision financial chart analysis.
OBJECTIVE: Identify significant chart patterns and generate actionable trading signals ONLY when predicted price movement is strictly between 3% and 5% intraday.

**CORE LOGIC & FILTERS:**
1. **Pattern Detection Engine**:
   - Analyze the provided chart/data for specific intraday patterns (e.g., Bull Flag, Bear Flag, Cup & Handle, Head & Shoulders, Double Bottom/Top, Ascending Triangle).
   - Classify pattern type (e.g., Bullish Continuation, Bearish Reversal, Neutral Consolidation).
   - **Confidence Threshold**: Only report patterns with > 87% recognition confidence.

2. **3-5% Significance Filter**:
   - **OPERATIONAL MODE**:
     - **MONITORING (WAIT)**: If predicted move is < 3% (too small) or > 5% (too volatile/risky), or pattern confidence is low. Output signal "WAIT".
     - **SIGNAL GENERATION (BUY/SELL)**: ONLY if a clear pattern exists AND projected move is 3-5% with > 80% precision.

3. **Validation Metrics (Internal Check)**:
   - **Volume Confirmation**: Must align with pattern breakout/breakdown (e.g., high volume on breakout).
   - **Trend Alignment**: Signal must align with broader timeframe trend (Multi-timeframe analysis).
   - **False Positive Check**: Reject if price action is choppy/whipsawing (High Noise).

**OUTPUT REQUIREMENTS**:
- If no clear pattern or criteria not met, Signal = "WAIT".
- Be precise with "Entry", "Stop Loss", and "Target" prices based on the pattern structure (e.g., measured move).
`;

const RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    qualificationStatus: { type: Type.STRING, enum: ["APPROVED", "REJECTED"] },
    qualificationScore: { type: Type.NUMBER, description: "0-100 Score" },
    validationChecks: {
      type: Type.OBJECT,
      properties: {
        liquidity: { type: Type.BOOLEAN },
        volatility: { type: Type.BOOLEAN },
        marketStructure: { type: Type.BOOLEAN },
        timingValid: { type: Type.BOOLEAN, description: "Is trading session open/valid?" },
        marketAlignment: { type: Type.BOOLEAN, description: "Is broad market direction aligned?" }
      },
      required: ["liquidity", "volatility", "marketStructure", "timingValid", "marketAlignment"]
    },
    signal: { type: Type.STRING, enum: ["BUY", "SELL", "HOLD", "WAIT"] },
    predictedMovement: { type: Type.STRING, description: "Strictly '3% to 5%' if signal is active" },
    confidence: { type: Type.NUMBER },
    auraScore: { type: Type.NUMBER },
    targets: {
      type: Type.OBJECT,
      properties: {
        target1: { type: Type.STRING, description: "3% Target Price" },
        target2: { type: Type.STRING, description: "5% Target Price" }
      }
    },
    probabilityAssessment: {
      type: Type.OBJECT,
      properties: {
        technicalScore: { type: Type.NUMBER },
        probTarget1: { type: Type.NUMBER, description: "Probability of hitting 3%" },
        probTarget2: { type: Type.NUMBER, description: "Probability of hitting 5%" },
        probStopLoss: { type: Type.NUMBER }
      },
      required: ["technicalScore", "probTarget1", "probTarget2", "probStopLoss"]
    },
    technicalSetup: {
      type: Type.OBJECT,
      properties: {
        trend: { type: Type.STRING },
        breakoutLevel: { type: Type.STRING },
        rsiValue: { type: Type.NUMBER },
        macdCondition: { type: Type.STRING },
        vwapCondition: { type: Type.STRING }
      }
    },
    volumeAnalysis: {
      type: Type.OBJECT,
      properties: {
        currentVolume: { type: Type.STRING },
        vsAverage: { type: Type.STRING },
        trend: { type: Type.STRING, enum: ["Increasing", "Decreasing"] }
      }
    },
    marketCondition: { type: Type.STRING, enum: ["TRENDING", "RANGING", "VOLATILE", "CORRECTING"] },
    ticker: { type: Type.STRING },
    entryPrice: { type: Type.STRING },
    stopLoss: { type: Type.STRING },
    targetPrice: { type: Type.STRING, description: "Primary Target" },
    timeframe: { type: Type.STRING },
    reasoning: { type: Type.STRING },
    
    // Pattern Recognition Specifics
    detectedPattern: { type: Type.STRING, description: "Name of the pattern (e.g. Bull Flag)" },
    patternType: { type: Type.STRING, description: "Classification (e.g. Bullish Continuation)" },
    patternConfidence: { type: Type.NUMBER, description: "0-100 Confidence in the pattern existence" },

    technicalIndicators: { type: Type.ARRAY, items: { type: Type.STRING } },
    riskLevel: { type: Type.STRING, enum: ["LOW", "MEDIUM", "HIGH"] },
    components: {
       type: Type.OBJECT,
       properties: {
         technicalScore: { type: Type.NUMBER },
         sentimentScore: { type: Type.NUMBER },
         volatilityScore: { type: Type.NUMBER }
       },
       required: ["technicalScore", "sentimentScore", "volatilityScore"]
    }
  },
  required: [
    "qualificationStatus", "qualificationScore", "validationChecks",
    "signal", "predictedMovement", "targets", "probabilityAssessment",
    "technicalSetup", "volumeAnalysis", "ticker", "entryPrice", 
    "stopLoss", "targetPrice", "reasoning", "detectedPattern", "patternType"
  ]
};

/**
 * Analyzes the provided screen frame (base64) using Sentinel Vision.
 */
export const analyzeScreenContent = async (base64Image: string): Promise<AnalysisResult> => {
  if (!apiKey) throw new Error("API Key not found");

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: {
        parts: [
          { inlineData: { mimeType: 'image/jpeg', data: base64Image } },
          { text: "Analyze this chart. Identify Intraday Patterns. Filter for 3-5% moves ONLY." }
        ]
      },
      config: {
        systemInstruction: SENTINEL_PROMPT,
        thinkingConfig: { thinkingBudget: 1024 }, // Reduced budget to save quota
        responseMimeType: "application/json",
        responseSchema: RESPONSE_SCHEMA
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response from Gemini");
    
    // Sanitize JSON if needed (remove markdown code blocks)
    const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
    
    const result = JSON.parse(jsonStr) as AuraEdgeAnalysis;
    return {
      ...result,
      timestamp: new Date()
    };

  } catch (error: any) {
    const errStr = JSON.stringify(error);
    // Robust detection for Quota issues
    if (error.message === "QUOTA_EXCEEDED" || errStr.includes("429") || errStr.includes("RESOURCE_EXHAUSTED") || error.status === 429 || error?.error?.code === 429) {
        console.warn("Gemini Quota Exceeded (429)");
        throw new Error("QUOTA_EXCEEDED");
    }
    
    console.error("Gemini Vision Error:", error);
    return getFallbackResult();
  }
};

/**
 * Analyzes raw market data text using Sentinel Intelligence.
 */
export const analyzeMarketData = async (data: MarketData): Promise<AuraEdgeAnalysis> => {
  if (!apiKey) throw new Error("API Key not found");

  try {
    const promptText = `
      SCAN REQUEST:
      Asset: ${data.symbol}
      Price: ${data.price}
      Change: ${data.changePercent}%
      Volume: ${data.volume}
      Trend History: ${JSON.stringify(data.trend)}
      
      Task: Detect Intraday Patterns. Apply 3-5% Move Filter.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: {
        parts: [{ text: promptText }]
      },
      config: {
        systemInstruction: SENTINEL_PROMPT,
        responseMimeType: "application/json",
        responseSchema: RESPONSE_SCHEMA
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response");
    
    const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(jsonStr) as AuraEdgeAnalysis;

  } catch (error: any) {
    const errStr = JSON.stringify(error);
    if (error.message === "QUOTA_EXCEEDED" || errStr.includes("429") || errStr.includes("RESOURCE_EXHAUSTED") || error.status === 429 || error?.error?.code === 429) {
        console.warn("Gemini Market Data Quota Exceeded (429)");
        throw new Error("QUOTA_EXCEEDED");
    }
    
    console.error("Gemini Data Error:", error);
    return getFallbackResult();
  }
};

export const askQuestionAboutScreen = async (base64Image: string, question: string): Promise<string> => {
  if (!apiKey) throw new Error("API Key not found");
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: {
        parts: [
          { inlineData: { mimeType: 'image/jpeg', data: base64Image } },
          { text: `Pattern Context Question: ${question}` }
        ]
      },
      config: {
        thinkingConfig: { thinkingBudget: 1024 },
        systemInstruction: SENTINEL_PROMPT
      }
    });
    return response.text || "No insight generated.";
  } catch (error: any) {
    const errStr = JSON.stringify(error);
    if (error.message === "QUOTA_EXCEEDED" || errStr.includes("429") || errStr.includes("RESOURCE_EXHAUSTED") || error.status === 429 || error?.error?.code === 429) {
        return "Error: API Quota Exceeded. Please try again in a moment.";
    }
    console.error("Gemini Chat Error:", error);
    return "Connection to Pattern Engine failed.";
  }
};

function getFallbackResult(): AnalysisResult {
  return {
    signal: 'WAIT',
    confidence: 0,
    auraScore: 0,
    predictedMovement: "0%",
    components: { technicalScore: 0, sentimentScore: 0, volatilityScore: 0 },
    marketCondition: 'RANGING',
    qualificationStatus: 'REJECTED',
    qualificationScore: 0,
    validationChecks: { liquidity: false, volatility: false, marketStructure: false, timingValid: false, marketAlignment: false },
    ticker: 'ERR',
    entryPrice: '0.00',
    targetPrice: '0.00',
    stopLoss: '0.00',
    timeframe: '-',
    reasoning: "Sentinel Connection Interrupted.",
    detectedPattern: "None",
    patternType: "None",
    patternConfidence: 0,
    technicalIndicators: [],
    riskLevel: 'HIGH',
    timestamp: new Date()
  };
}
