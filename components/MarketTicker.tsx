
import React, { useEffect, useState } from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { MarketData } from '../types';

export const MarketTicker: React.FC = () => {
  // Mock data for visual placeholder until stream connects
  const [items, setItems] = useState<MarketData[]>([]);

  useEffect(() => {
    const handleMarketUpdate = (event: CustomEvent<MarketData[]>) => {
      if (event.detail) {
        setItems(event.detail);
      }
    };

    // Listen to window event from App.tsx (simple bus)
    window.addEventListener('market-update' as any, handleMarketUpdate as any);
    return () => window.removeEventListener('market-update' as any, handleMarketUpdate as any);
  }, []);

  return (
    <div className="w-full bg-slate-950 border-b border-slate-800 overflow-hidden h-10 flex items-center relative">
       <div className="absolute left-0 top-0 bottom-0 w-16 bg-gradient-to-r from-slate-950 to-transparent z-10" />
       <div className="absolute right-0 top-0 bottom-0 w-16 bg-gradient-to-l from-slate-950 to-transparent z-10" />
       
       {/* Simple CSS animation for marquee */}
       <style>{`
         @keyframes ticker {
           0% { transform: translateX(0); }
           100% { transform: translateX(-100%); }
         }
         .animate-ticker {
           animation: ticker 30s linear infinite;
         }
         .animate-ticker:hover {
           animation-play-state: paused;
         }
       `}</style>

       <div className="flex whitespace-nowrap animate-ticker px-4">
          {[...items, ...items].map((item, idx) => (
             <div key={`${item.symbol}-${idx}`} className="flex items-center gap-2 px-6 border-r border-slate-800/50">
                <span className="font-bold text-sm text-slate-300">{item.symbol}</span>
                <span className="font-mono text-xs text-slate-400">{item.price.toFixed(2)}</span>
                <span className={`flex items-center text-xs font-bold ${item.change >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                   {item.change >= 0 ? <TrendingUp className="w-3 h-3 mr-1" /> : <TrendingDown className="w-3 h-3 mr-1" />}
                   {item.changePercent > 0 ? '+' : ''}{item.changePercent}%
                </span>
             </div>
          ))}
          {items.length === 0 && (
            <div className="px-4 text-xs text-slate-500 italic">Initializing Astra Market Data Stream...</div>
          )}
       </div>
    </div>
  );
};
