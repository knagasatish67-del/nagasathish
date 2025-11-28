
import React, { useState } from 'react';
import { WatchlistItem } from '../types';
import { analyzeMarketData } from '../services/geminiService';
import { RefreshCw, Zap, CheckCircle2, XCircle, Bell, BellRing } from 'lucide-react';

interface WatchlistPanelProps {
  watchlist: WatchlistItem[];
  setWatchlist: React.Dispatch<React.SetStateAction<WatchlistItem[]>>;
}

export const WatchlistPanel: React.FC<WatchlistPanelProps> = ({ watchlist, setWatchlist }) => {
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  // Alert Editing State
  const [editingAlertId, setEditingAlertId] = useState<string | null>(null);
  const [alertInput, setAlertInput] = useState<string>('');

  const handleAnalyzeItem = async (symbol: string) => {
    const itemIndex = watchlist.findIndex(i => i.symbol === symbol);
    if (itemIndex === -1) return;
    
    const item = watchlist[itemIndex];
    if (!item.data) return;

    // Set loading state
    setErrorMsg(null);
    setWatchlist(prev => {
      const next = [...prev];
      next[itemIndex] = { ...next[itemIndex], isAnalyzing: true };
      return next;
    });

    try {
      const result = await analyzeMarketData(item.data);
      
      setWatchlist(prev => {
        const next = [...prev];
        next[itemIndex] = { 
          ...next[itemIndex], 
          isAnalyzing: false,
          analysis: result,
          lastAnalyzed: Date.now()
        };
        return next;
      });
    } catch (e: any) {
      console.error("Failed to analyze " + symbol);
      
      if (e.message === "QUOTA_EXCEEDED") {
        setErrorMsg("Limit Reached. Wait 60s.");
        setTimeout(() => setErrorMsg(null), 5000);
      }

      setWatchlist(prev => {
        const next = [...prev];
        next[itemIndex] = { ...next[itemIndex], isAnalyzing: false };
        return next;
      });
    }
  };

  const startEditingAlert = (symbol: string, currentPrice: number) => {
    if (editingAlertId === symbol) {
      setEditingAlertId(null);
    } else {
      setEditingAlertId(symbol);
      setAlertInput(currentPrice.toString());
    }
  };

  const saveAlert = (symbol: string, currentPrice: number) => {
    const target = parseFloat(alertInput);
    if (isNaN(target)) return;

    const condition = target > currentPrice ? 'ABOVE' : 'BELOW';

    setWatchlist(prev => prev.map(item => 
      item.symbol === symbol 
        ? { ...item, alert: { targetPrice: target, condition, isActive: true } } 
        : item
    ));
    setEditingAlertId(null);
  };

  const removeAlert = (symbol: string) => {
    setWatchlist(prev => prev.map(item => 
      item.symbol === symbol 
        ? { ...item, alert: undefined } 
        : item
    ));
  };

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300 relative">
       
       <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase text-slate-500 tracking-wider flex items-center gap-2">
            <span className="text-lg">🌍</span> Global Watchlist
          </h3>
          
          {errorMsg ? (
             <span className="text-[10px] px-2 py-1 bg-rose-950 text-rose-400 rounded border border-rose-900 font-bold animate-pulse">
               {errorMsg}
             </span>
          ) : (
             <span className="text-[10px] px-2 py-1 bg-emerald-900/30 text-emerald-400 rounded border border-emerald-500/20 flex items-center gap-1">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Live
             </span>
          )}
       </div>

       <div className="space-y-3">
          {watchlist.map(item => (
             <div key={item.symbol} className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden hover:border-slate-700 transition-all">
                {/* Header: Price & Change */}
                <div className="p-3 flex items-center justify-between bg-slate-900/50 border-b border-slate-800/50">
                   <div>
                      <div className="font-bold text-sm text-slate-200 flex items-center gap-2">
                        {item.symbol}
                        {item.analysis && (
                          item.analysis.qualificationStatus === 'APPROVED' 
                            ? <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                            : <XCircle className="w-3 h-3 text-rose-500" />
                        )}
                      </div>
                      <div className="text-[10px] text-slate-500">{item.category}</div>
                   </div>
                   
                   {item.data ? (
                      <div className="text-right">
                         <div className="font-mono text-sm font-medium text-white">
                            {item.symbol.includes('USD') ? '$' : ''}
                            {item.symbol.includes('EUR') ? '€' : ''}
                            {item.data.price.toFixed(2)}
                         </div>
                         <div className={`text-[10px] font-bold flex items-center justify-end ${item.data.change >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {item.data.changePercent > 0 ? '+' : ''}{item.data.changePercent}%
                         </div>
                      </div>
                   ) : (
                      <div className="h-8 w-20 bg-slate-800/50 rounded animate-pulse" />
                   )}
                </div>

                {/* Alert Section */}
                <div className="px-3 py-2 border-b border-slate-800/30 bg-slate-900/30">
                   {editingAlertId === item.symbol ? (
                     <div className="flex items-center gap-2 animate-in fade-in slide-in-from-top-1">
                       <input 
                         type="number" 
                         value={alertInput}
                         onChange={(e) => setAlertInput(e.target.value)}
                         className="w-20 bg-slate-950 border border-indigo-500 text-white text-xs rounded px-1 py-1 focus:outline-none"
                         autoFocus
                         placeholder="Target"
                       />
                       <button 
                         onClick={() => item.data && saveAlert(item.symbol, item.data.price)}
                         className="text-xs bg-indigo-600 text-white px-2 py-1 rounded hover:bg-indigo-500"
                       >
                         Set
                       </button>
                       <button 
                         onClick={() => setEditingAlertId(null)}
                         className="text-slate-500 hover:text-white"
                       >
                         <XCircle className="w-4 h-4" />
                       </button>
                     </div>
                   ) : (
                     <div className="flex items-center justify-between">
                       {item.alert && item.alert.isActive ? (
                         <div className="flex items-center gap-2 text-xs text-indigo-300 bg-indigo-500/10 px-2 py-0.5 rounded-full border border-indigo-500/20">
                           <BellRing className="w-3 h-3 animate-pulse" />
                           <span>{item.alert.condition === 'ABOVE' ? '>' : '<'} {item.alert.targetPrice}</span>
                           <button onClick={() => removeAlert(item.symbol)} className="hover:text-white ml-1">
                             <XCircle className="w-3 h-3" />
                           </button>
                         </div>
                       ) : (
                         <button 
                           onClick={() => item.data && startEditingAlert(item.symbol, item.data.price)}
                           className="flex items-center gap-1 text-[10px] text-slate-500 hover:text-indigo-400 transition-colors"
                         >
                           <Bell className="w-3 h-3" /> Set Alert
                         </button>
                       )}
                     </div>
                   )}
                </div>

                {/* Action / Analysis Area */}
                <div className="px-3 pb-3 pt-2">
                   {item.analysis ? (
                      <div className="mt-1">
                         <div className="flex items-center justify-between mb-2">
                            <div className={`text-xs font-bold px-2 py-0.5 rounded flex items-center gap-1 ${
                               item.analysis.qualificationStatus === 'REJECTED' 
                                 ? 'bg-slate-800 text-slate-400 border border-slate-700' 
                                 : item.analysis.signal === 'BUY' ? 'bg-emerald-950 text-emerald-400 border border-emerald-900' 
                                 : item.analysis.signal === 'SELL' ? 'bg-rose-950 text-rose-400 border border-rose-900' 
                                 : 'bg-yellow-950 text-yellow-400 border border-yellow-900'
                            }`}>
                               {item.analysis.qualificationStatus === 'REJECTED' ? 'REJECTED' : item.analysis.signal} 
                               {item.analysis.qualificationStatus === 'APPROVED' && (
                                 <span className="opacity-50 ml-1">| {item.analysis.predictedMovement}</span>
                               )}
                            </div>
                            <button 
                               onClick={() => handleAnalyzeItem(item.symbol)}
                               disabled={item.isAnalyzing}
                               className="text-slate-500 hover:text-indigo-400 transition-colors"
                            >
                               <RefreshCw className={`w-3 h-3 ${item.isAnalyzing ? 'animate-spin' : ''}`} />
                            </button>
                         </div>
                         
                         {/* Validation Checks Mini View */}
                         {item.analysis.validationChecks && (
                            <div className="flex gap-2 mb-2 justify-between px-1">
                              <div className={`flex items-center gap-1 text-[9px] ${item.analysis.validationChecks.liquidity ? 'text-emerald-500' : 'text-rose-500'}`}>Liq</div>
                              <div className={`flex items-center gap-1 text-[9px] ${item.analysis.validationChecks.timingValid ? 'text-emerald-500' : 'text-rose-500'}`}>Time</div>
                              <div className={`flex items-center gap-1 text-[9px] ${item.analysis.validationChecks.marketAlignment ? 'text-emerald-500' : 'text-rose-500'}`}>Market</div>
                            </div>
                         )}

                         <p className="text-[10px] text-slate-400 leading-tight line-clamp-2">
                            {item.analysis.reasoning}
                         </p>
                      </div>
                   ) : (
                      <button
                         onClick={() => handleAnalyzeItem(item.symbol)}
                         disabled={!item.data || item.isAnalyzing}
                         className="w-full py-1.5 flex items-center justify-center gap-2 text-xs font-medium text-indigo-400 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 rounded-lg transition-colors disabled:opacity-50"
                      >
                         {item.isAnalyzing ? (
                            <>
                               <div className="w-3 h-3 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
                               Scan
                            </>
                         ) : (
                            <>
                               <Zap className="w-3 h-3" /> Astra Scan
                            </>
                         )}
                      </button>
                   )}
                </div>
             </div>
          ))}
       </div>
    </div>
  );
};
