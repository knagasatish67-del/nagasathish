
import React, { useState, useEffect, useRef } from 'react';
import { AnalysisResult, ChatMessage, TradeExecution, WatchlistItem, MarketData } from '../types';
import { MessageSquare, Send, TrendingUp, TrendingDown, Terminal, Calculator, History, Zap, List, ShieldCheck, ShieldAlert, CheckCircle2, XCircle, Activity, Globe, Scan, BellRing, X } from 'lucide-react';
import { WatchlistPanel } from './WatchlistPanel';

interface AnalysisSidebarProps {
  isAnalyzing: boolean;
  analysisResult: AnalysisResult | null;
  chatHistory: ChatMessage[];
  onSendMessage: (msg: string) => void;
  isCapturing: boolean;
}

interface Notification {
  id: string;
  title: string;
  message: string;
  timestamp: number;
}

const DEFAULT_WATCHLIST_SYMBOLS = ['NVDA', 'TSLA', 'BTC-USD', 'ETH-USD', 'EUR-USD', 'XAU-USD'];

export const AnalysisSidebar: React.FC<AnalysisSidebarProps> = ({
  isAnalyzing,
  analysisResult,
  chatHistory,
  onSendMessage,
  isCapturing
}) => {
  const [activeTab, setActiveTab] = useState<'aura' | 'terminal' | 'watchlist' | 'chat'>('aura');
  const [inputValue, setInputValue] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Watchlist & Notification State (Lifted from WatchlistPanel)
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  // Terminal State
  const [accountBalance, setAccountBalance] = useState<number>(10000); 
  const [riskPercent, setRiskPercent] = useState<number>(2);
  const [positionSize, setPositionSize] = useState<number>(0);
  const [tradeLog, setTradeLog] = useState<TradeExecution[]>([]);

  // Initialize Watchlist
  useEffect(() => {
    const initialList: WatchlistItem[] = DEFAULT_WATCHLIST_SYMBOLS.map(sym => ({
      symbol: sym,
      name: sym,
      category: sym.includes('USD') ? (sym.includes('BTC') || sym.includes('ETH') ? 'CRYPTO' : sym.includes('XAU') ? 'COMMODITY' : 'FOREX') : 'STOCK',
      data: null,
      analysis: null,
      lastAnalyzed: 0,
      isAnalyzing: false
    }));
    setWatchlist(initialList);
  }, []);

  // Handle Market Stream & Check Alerts
  useEffect(() => {
    const handleUpdate = (event: CustomEvent<MarketData[]>) => {
      const dataMap = new Map(event.detail.map(d => [d.symbol, d]));
      
      setWatchlist(prev => {
         const newNotifications: Notification[] = [];
         let hasTriggered = false;

         const nextList = prev.map(item => {
             const newData = dataMap.get(item.symbol);
             // If no new data and no existing data, skip
             if (!newData && !item.data) return item;
             
             const updatedItem = { ...item, data: newData || item.data };
             
             // Check Alert
             if (updatedItem.alert && updatedItem.alert.isActive && updatedItem.data) {
                 const { targetPrice, condition } = updatedItem.alert;
                 const price = updatedItem.data.price;
                 const triggered = (condition === 'ABOVE' && price >= targetPrice) || 
                                   (condition === 'BELOW' && price <= targetPrice);
                 
                 if (triggered) {
                     hasTriggered = true;
                     updatedItem.alert = { ...updatedItem.alert, isActive: false };
                     newNotifications.push({
                         id: Math.random().toString(36).substr(2, 9),
                         title: `Price Alert: ${item.symbol}`,
                         message: `${item.symbol} crossed ${condition} ${targetPrice}`,
                         timestamp: Date.now()
                     });
                 }
             }
             return updatedItem;
         });

         if (hasTriggered) {
             // Schedule state update and sound
             setTimeout(() => {
                 setNotifications(curr => [...newNotifications, ...curr]);
                 const audio = new Audio('https://assets.mixkit.co/sfx/preview/mixkit-positive-notification-951.mp3');
                 audio.volume = 0.5;
                 audio.play().catch(() => {});
             }, 0);
         }
         
         return nextList;
      });
    };

    window.addEventListener('market-update' as any, handleUpdate as any);
    return () => window.removeEventListener('market-update' as any, handleUpdate as any);
  }, []);

  // Auto-scroll chat
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatHistory, activeTab]);

  // Auto-Calculate Position Size
  useEffect(() => {
    if (analysisResult && analysisResult.entryPrice && analysisResult.stopLoss && analysisResult.qualificationStatus === 'APPROVED') {
      const entry = parseFloat(analysisResult.entryPrice.replace(/[^0-9.]/g, ''));
      const stop = parseFloat(analysisResult.stopLoss.replace(/[^0-9.]/g, ''));
      
      if (!isNaN(entry) && !isNaN(stop) && entry !== stop) {
        const riskAmount = accountBalance * (riskPercent / 100);
        const riskPerShare = Math.abs(entry - stop);
        const size = riskAmount / riskPerShare;
        setPositionSize(Math.floor(size));
      }
    } else {
      setPositionSize(0);
    }
  }, [analysisResult, accountBalance, riskPercent]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || !isCapturing) return;
    onSendMessage(inputValue);
    setInputValue('');
  };

  const executeTrade = (type: 'BUY' | 'SELL') => {
    if (!analysisResult || analysisResult.qualificationStatus !== 'APPROVED') return;
    const entry = parseFloat(analysisResult.entryPrice.replace(/[^0-9.]/g, '')) || 0;
    const newTrade: TradeExecution = {
      id: Math.random().toString(36).substring(7),
      timestamp: Date.now(),
      ticker: analysisResult.ticker,
      type,
      amount: positionSize,
      entry: entry
    };
    setTradeLog(prev => [newTrade, ...prev]);
  };

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const isQualified = analysisResult?.qualificationStatus === 'APPROVED';

  return (
    <div className="flex flex-col h-full w-full bg-slate-950 border-l border-slate-800 relative">
      
      {/* Notifications Overlay */}
      {notifications.length > 0 && (
         <div className="absolute top-16 left-4 right-4 z-50 space-y-2 pointer-events-none">
           {notifications.map(n => (
             <div key={n.id} className="pointer-events-auto bg-indigo-500/10 border border-indigo-500/50 backdrop-blur-md text-indigo-100 p-3 rounded-xl text-xs flex justify-between items-start animate-in slide-in-from-top-2 fade-in duration-300 shadow-xl shadow-indigo-900/20">
               <div>
                 <div className="font-bold flex items-center gap-2 text-indigo-400">
                    <BellRing className="w-3 h-3" />
                    {n.title}
                 </div>
                 <div className="mt-1 opacity-90">{n.message}</div>
               </div>
               <button onClick={() => removeNotification(n.id)} className="text-indigo-400 hover:text-white p-1">
                 <X className="w-4 h-4" />
               </button>
             </div>
           ))}
         </div>
       )}

      {/* Tabs */}
      <div className="flex items-center border-b border-slate-800 overflow-x-auto scrollbar-hide shrink-0 z-10 bg-slate-950">
        <button
          onClick={() => setActiveTab('aura')}
          className={`flex-1 min-w-[80px] py-4 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors ${
            activeTab === 'aura'
              ? 'text-indigo-400 border-b-2 border-indigo-500 bg-slate-900'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
          }`}
        >
          <Zap className="w-3.5 h-3.5" />
          Signal
        </button>
        <button
          onClick={() => setActiveTab('terminal')}
          disabled={!isQualified}
          className={`flex-1 min-w-[80px] py-4 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors ${
            activeTab === 'terminal'
              ? 'text-indigo-400 border-b-2 border-indigo-500 bg-slate-900'
              : !isQualified 
                ? 'text-slate-600 cursor-not-allowed' 
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
          }`}
        >
          <Terminal className="w-3.5 h-3.5" />
          Trade
        </button>
        <button
          onClick={() => setActiveTab('watchlist')}
          className={`flex-1 min-w-[80px] py-4 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors ${
            activeTab === 'watchlist'
              ? 'text-indigo-400 border-b-2 border-indigo-500 bg-slate-900'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
          }`}
        >
          <List className="w-3.5 h-3.5" />
          Watchlist
        </button>
        <button
          onClick={() => setActiveTab('chat')}
          className={`flex-1 min-w-[80px] py-4 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors ${
            activeTab === 'chat'
              ? 'text-indigo-400 border-b-2 border-indigo-500 bg-slate-900'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
          }`}
        >
          <MessageSquare className="w-3.5 h-3.5" />
          Chat
        </button>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-4">
        
        {/* --- AURA EDGE (SENTINEL) TAB --- */}
        {activeTab === 'aura' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            {isAnalyzing && !analysisResult && (
               <div className="flex flex-col items-center justify-center py-12 text-slate-500 gap-3">
                 <div className="relative">
                    <div className="w-16 h-16 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
                    <div className="absolute inset-0 flex items-center justify-center">
                        <ShieldCheck className="w-6 h-6 text-indigo-500 animate-pulse" />
                    </div>
                 </div>
                 <p className="text-sm font-mono text-indigo-400 animate-pulse">PATTERN ENGINE SCANNING...</p>
               </div>
            )}

            {!isAnalyzing && !analysisResult && (
               <div className="flex flex-col items-center justify-center py-12 text-slate-500 gap-3 text-center">
                 <div className="text-4xl grayscale opacity-30">🌍</div>
                 <p className="text-sm">Ready for Global Intraday Signals.</p>
               </div>
            )}

            {analysisResult && (
              <>
                {/* SENTINEL QUALIFICATION CARD */}
                <div className="bg-slate-900 rounded-xl border border-slate-800 p-4">
                   <div className="flex justify-between items-center mb-3">
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                         <Globe className="w-3 h-3" /> Market Validation
                      </span>
                      <span className={`text-xs font-bold px-2 py-1 rounded-full border ${
                         isQualified 
                           ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                           : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                      }`}>
                         {analysisResult.qualificationStatus}
                      </span>
                   </div>

                   {/* Validation Checklist */}
                   <div className="grid grid-cols-3 gap-2 mb-4">
                      <div className={`flex flex-col items-center p-2 rounded border ${analysisResult.validationChecks.timingValid ? 'bg-emerald-950/30 border-emerald-900/50' : 'bg-rose-950/30 border-rose-900/50'}`}>
                         {analysisResult.validationChecks.timingValid ? <CheckCircle2 className="w-4 h-4 text-emerald-500 mb-1"/> : <XCircle className="w-4 h-4 text-rose-500 mb-1"/>}
                         <span className="text-[10px] text-slate-400">Timing</span>
                      </div>
                      <div className={`flex flex-col items-center p-2 rounded border ${analysisResult.validationChecks.marketAlignment ? 'bg-emerald-950/30 border-emerald-900/50' : 'bg-rose-950/30 border-rose-900/50'}`}>
                         {analysisResult.validationChecks.marketAlignment ? <CheckCircle2 className="w-4 h-4 text-emerald-500 mb-1"/> : <XCircle className="w-4 h-4 text-rose-500 mb-1"/>}
                         <span className="text-[10px] text-slate-400">Market Align</span>
                      </div>
                      <div className={`flex flex-col items-center p-2 rounded border ${analysisResult.validationChecks.liquidity ? 'bg-emerald-950/30 border-emerald-900/50' : 'bg-rose-950/30 border-rose-900/50'}`}>
                         {analysisResult.validationChecks.liquidity ? <CheckCircle2 className="w-4 h-4 text-emerald-500 mb-1"/> : <XCircle className="w-4 h-4 text-rose-500 mb-1"/>}
                         <span className="text-[10px] text-slate-400">Liquid</span>
                      </div>
                   </div>
                </div>

                {/* If APPROVED, show Signal. If REJECTED, show Notice */}
                {isQualified ? (
                   <div className={`relative overflow-hidden rounded-2xl border p-6 flex flex-col items-center justify-center text-center transition-all ${
                      analysisResult.signal === 'BUY' ? 'bg-emerald-950/30 border-emerald-500/50' :
                      analysisResult.signal === 'SELL' ? 'bg-rose-950/30 border-rose-500/50' :
                      'bg-slate-900 border-slate-700'
                   }`}>
                      
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                         {analysisResult.signal === 'BUY' && <TrendingUp className="w-4 h-4 text-emerald-400" />}
                         {analysisResult.signal === 'SELL' && <TrendingDown className="w-4 h-4 text-rose-400" />}
                         PREDICTED MOVE: {analysisResult.predictedMovement}
                      </span>
                      
                      {analysisResult.signal === 'WAIT' || analysisResult.signal === 'HOLD' ? (
                         <div className="flex flex-col items-center justify-center py-2">
                            <div className="w-12 h-12 border-2 border-slate-700 border-t-indigo-500 rounded-full animate-spin mb-3" />
                            <h2 className="text-xl font-bold text-indigo-300">Monitoring...</h2>
                            <p className="text-xs text-slate-500 mt-1">Waiting for 95% Confidence Setup</p>
                         </div>
                      ) : (
                         <>
                           <h2 className={`text-5xl font-black tracking-tighter mb-1 ${
                              analysisResult.signal === 'BUY' ? 'text-emerald-400 drop-shadow-[0_0_15px_rgba(52,211,153,0.3)]' :
                              analysisResult.signal === 'SELL' ? 'text-rose-400 drop-shadow-[0_0_15px_rgba(251,113,133,0.3)]' :
                              'text-yellow-400'
                           }`}>
                              {analysisResult.signal}
                           </h2>
                           
                           <div className="mt-3 flex gap-2">
                              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-950/50 border border-slate-800 text-xs text-indigo-300 font-mono">
                                 Target 1: {analysisResult.targets?.target1}
                              </div>
                              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-950/30 border border-indigo-500/30 text-xs text-indigo-200 font-mono">
                                 Target 2: {analysisResult.targets?.target2}
                              </div>
                           </div>
                         </>
                      )}
                   </div>
                ) : (
                   <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6 text-center flex flex-col items-center">
                      <ShieldAlert className="w-10 h-10 text-rose-500 mb-3 opacity-80" />
                      <h3 className="text-lg font-bold text-white mb-1">Signal Rejected</h3>
                      <p className="text-sm text-slate-400">
                         Does not meet Sentinel Qualification Criteria. <br/> (Check Volume, Time, or Broad Market)
                      </p>
                   </div>
                )}

                {/* --- NEW PATTERN INTELLIGENCE SECTION --- */}
                {isQualified && analysisResult.detectedPattern && (
                  <div className="bg-slate-900/70 rounded-xl p-4 border border-slate-800">
                     <div className="flex justify-between items-center mb-3">
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                           <Scan className="w-3 h-3" /> Pattern Intelligence
                        </h3>
                        {analysisResult.patternConfidence && (
                           <span className="text-xs font-mono text-indigo-300">
                              Conf: {analysisResult.patternConfidence}%
                           </span>
                        )}
                     </div>
                     <div className="flex items-start gap-4">
                        <div className="flex-1">
                           <div className="text-sm font-bold text-white mb-1">{analysisResult.detectedPattern}</div>
                           <div className="text-xs text-slate-400">{analysisResult.patternType}</div>
                        </div>
                        {analysisResult.patternConfidence && (
                           <div className="w-12 h-12 relative flex items-center justify-center">
                              <svg className="w-full h-full transform -rotate-90">
                                 <circle cx="24" cy="24" r="20" stroke="currentColor" strokeWidth="4" fill="transparent" className="text-slate-800" />
                                 <circle cx="24" cy="24" r="20" stroke="currentColor" strokeWidth="4" fill="transparent" className="text-indigo-500" strokeDasharray={125} strokeDashoffset={125 - (125 * analysisResult.patternConfidence) / 100} />
                              </svg>
                              <span className="absolute text-[10px] font-bold">{analysisResult.patternConfidence}</span>
                           </div>
                        )}
                     </div>
                  </div>
                )}

                {/* Probability Assessment (Only if Qualified & Active Signal) */}
                {isQualified && analysisResult.signal !== 'WAIT' && analysisResult.probabilityAssessment && (
                  <div className="grid grid-cols-1 gap-3">
                     <div className="bg-slate-900 rounded-xl p-4 border border-slate-800">
                        <h3 className="text-xs font-bold text-slate-500 uppercase mb-3">Probability Assessment</h3>
                        <div className="space-y-3">
                           <div className="flex items-center justify-between text-xs">
                              <span className="text-slate-400">Target 1 (3%)</span>
                              <span className="font-bold text-emerald-400">{analysisResult.probabilityAssessment.probTarget1}%</span>
                           </div>
                           <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                              <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${analysisResult.probabilityAssessment.probTarget1}%` }} />
                           </div>
                           
                           <div className="flex items-center justify-between text-xs">
                              <span className="text-slate-400">Target 2 (5%)</span>
                              <span className="font-bold text-indigo-400">{analysisResult.probabilityAssessment.probTarget2}%</span>
                           </div>
                           <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                              <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${analysisResult.probabilityAssessment.probTarget2}%` }} />
                           </div>

                           <div className="flex items-center justify-between text-xs">
                              <span className="text-slate-400">Stop Loss Risk</span>
                              <span className="font-bold text-rose-400">{analysisResult.probabilityAssessment.probStopLoss}%</span>
                           </div>
                           <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                              <div className="h-full bg-rose-500 rounded-full" style={{ width: `${analysisResult.probabilityAssessment.probStopLoss}%` }} />
                           </div>
                        </div>
                     </div>
                  </div>
                )}

                {/* Technical Setup Details (Only if Qualified) */}
                {isQualified && analysisResult.technicalSetup && (
                  <div className="bg-slate-900/50 rounded-xl p-4 border border-slate-800">
                     <div className="flex justify-between items-center mb-4">
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                           <Activity className="w-3 h-3" /> Technical Setup
                        </h3>
                     </div>
                     <div className="space-y-2 text-xs text-slate-300">
                        <div className="flex justify-between p-1.5 hover:bg-slate-800/50 rounded">
                          <span className="text-slate-500">Trend</span>
                          <span className="font-medium">{analysisResult.technicalSetup.trend}</span>
                        </div>
                        <div className="flex justify-between p-1.5 hover:bg-slate-800/50 rounded">
                          <span className="text-slate-500">RSI (14)</span>
                          <span className="font-medium">{analysisResult.technicalSetup.rsiValue}</span>
                        </div>
                        <div className="flex justify-between p-1.5 hover:bg-slate-800/50 rounded">
                          <span className="text-slate-500">MACD</span>
                          <span className="font-medium">{analysisResult.technicalSetup.macdCondition}</span>
                        </div>
                        <div className="flex justify-between p-1.5 hover:bg-slate-800/50 rounded">
                          <span className="text-slate-500">VWAP</span>
                          <span className="font-medium">{analysisResult.technicalSetup.vwapCondition}</span>
                        </div>
                     </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* --- TERMINAL TAB (Only if Qualified) --- */}
        {activeTab === 'terminal' && isQualified && (
          <div className="space-y-6 animate-in fade-in duration-300">
             <div className="bg-slate-900 rounded-xl p-4 border border-slate-800">
                <div className="flex items-center gap-2 mb-4 text-indigo-400">
                   <Calculator className="w-4 h-4" />
                   <h3 className="text-sm font-bold uppercase">Risk Calculator</h3>
                </div>
                <div className="space-y-3">
                   <div>
                     <label className="text-xs text-slate-500 block mb-1">Capital</label>
                     <input 
                       type="number" 
                       value={accountBalance}
                       onChange={(e) => setAccountBalance(parseFloat(e.target.value))}
                       className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-sm text-white font-mono"
                     />
                   </div>
                   <div>
                     <label className="text-xs text-slate-500 block mb-1">Risk Per Trade (%)</label>
                     <div className="flex items-center gap-2">
                        <input 
                          type="range" 
                          min="0.5" 
                          max="5" 
                          step="0.5"
                          value={riskPercent}
                          onChange={(e) => setRiskPercent(parseFloat(e.target.value))}
                          className="flex-1 h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                        />
                        <span className="text-sm font-mono w-12 text-right">{riskPercent}%</span>
                     </div>
                   </div>
                   <div className="pt-2 mt-2 border-t border-slate-800">
                      <div className="flex justify-between items-center">
                         <span className="text-xs text-slate-400">Position Size</span>
                         <span className="text-lg font-bold text-white font-mono">{positionSize > 0 ? positionSize : '--'} <span className="text-xs font-normal text-slate-500">units</span></span>
                      </div>
                   </div>
                </div>
             </div>

             <div className="grid grid-cols-2 gap-3">
                <button 
                  onClick={() => executeTrade('BUY')}
                  disabled={!analysisResult || analysisResult.signal !== 'BUY'}
                  className="py-4 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/50 text-emerald-400 rounded-xl font-bold flex flex-col items-center gap-1 transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                   <TrendingUp className="w-6 h-6" />
                   BUY
                </button>
                <button 
                  onClick={() => executeTrade('SELL')}
                  disabled={!analysisResult || analysisResult.signal !== 'SELL'}
                  className="py-4 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/50 text-rose-400 rounded-xl font-bold flex flex-col items-center gap-1 transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                   <TrendingDown className="w-6 h-6" />
                   SELL
                </button>
             </div>

             <div className="bg-slate-900/50 rounded-xl border border-slate-800 overflow-hidden">
                <div className="p-3 border-b border-slate-800 flex items-center gap-2 text-slate-400">
                   <History className="w-3 h-3" />
                   <span className="text-xs font-bold uppercase">Recent Executions</span>
                </div>
                <div className="max-h-40 overflow-y-auto custom-scrollbar">
                   {tradeLog.length === 0 ? (
                      <div className="p-4 text-center text-xs text-slate-600">No trades executed.</div>
                   ) : (
                      <div className="divide-y divide-slate-800">
                         {tradeLog.map((trade) => (
                            <div key={trade.id} className="p-3 flex justify-between items-center text-xs">
                               <div>
                                  <span className={`font-bold ${trade.type === 'BUY' ? 'text-emerald-400' : 'text-rose-400'}`}>{trade.type}</span>
                                  <span className="ml-2 text-slate-300">{trade.ticker}</span>
                               </div>
                               <div className="text-right">
                                  <div className="text-slate-400">{trade.amount} units @ {trade.entry}</div>
                               </div>
                            </div>
                         ))}
                      </div>
                   )}
                </div>
             </div>
          </div>
        )}

        {/* --- WATCHLIST TAB --- */}
        {activeTab === 'watchlist' && (
           <WatchlistPanel watchlist={watchlist} setWatchlist={setWatchlist} />
        )}

        {/* --- CHAT TAB --- */}
        {activeTab === 'chat' && (
          <div className="flex flex-col h-full">
             <div className="flex-1 space-y-4 pb-4">
               {chatHistory.map((msg, idx) => (
                 <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                   <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm ${
                     msg.role === 'user' 
                       ? 'bg-indigo-600 text-white rounded-br-sm' 
                       : 'bg-slate-800 text-slate-200 rounded-bl-sm border border-slate-700'
                   }`}>
                     {msg.text}
                   </div>
                 </div>
               ))}
               <div ref={chatEndRef} />
             </div>
             
             <form onSubmit={handleSend} className="relative mt-2">
               <input
                 type="text"
                 value={inputValue}
                 onChange={(e) => setInputValue(e.target.value)}
                 disabled={!isCapturing}
                 placeholder={isCapturing ? "Ask Sentinel..." : "Start capture to chat"}
                 className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-4 pr-12 py-3 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed placeholder-slate-600 transition-all"
               />
               <button 
                 type="submit"
                 disabled={!inputValue.trim() || !isCapturing}
                 className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-indigo-500/10 hover:bg-indigo-500 text-indigo-500 hover:text-white rounded-lg transition-all disabled:opacity-0"
               >
                 <Send className="w-4 h-4" />
               </button>
             </form>
          </div>
        )}
      </div>
    </div>
  );
};
