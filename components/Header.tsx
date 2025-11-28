
import React from 'react';
import { Wifi, Zap, LogOut, User, Crown, Database } from 'lucide-react';
import { auth, signOut } from '../services/firebase';

interface HeaderProps {
  userEmail?: string | null;
  subscriptionPlan?: 'FREE' | 'PRO';
  onUpgrade?: () => void;
  onProfileClick?: () => void;
  onDatabaseClick?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ userEmail, subscriptionPlan = 'FREE', onUpgrade, onProfileClick, onDatabaseClick }) => {
  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Error signing out", error);
    }
  };

  return (
    <header className="h-16 border-b border-slate-800 bg-slate-950 flex items-center justify-between px-6 shrink-0">
      <div className="flex items-center gap-3">
        <div className="bg-indigo-600 p-2 rounded-lg shadow-lg shadow-indigo-500/20">
           <Zap className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="font-bold text-lg tracking-tight text-white leading-none">QuantumFinance</h1>
          <span className="text-xs text-indigo-400 font-medium flex items-center gap-1">
            Powered by AuraEdge™ Engine
          </span>
        </div>
      </div>
      
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-4">
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900 border border-slate-800">
             <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
             <span className="text-xs text-emerald-400 font-medium">Data Stream Active</span>
          </div>
          <div className="hidden sm:flex items-center gap-2 text-xs text-slate-500">
            <Wifi className="w-3 h-3" />
            <span>Ultra-Low Latency</span>
          </div>
        </div>

        {/* User Section */}
        <div className="pl-6 border-l border-slate-800 flex items-center gap-3">
           
           {/* Plan Badge */}
           {subscriptionPlan === 'PRO' ? (
             <div className="hidden md:flex items-center gap-1 px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/30 text-[10px] font-bold text-amber-500 uppercase tracking-wide">
                <Crown className="w-3 h-3" /> PRO
             </div>
           ) : (
             <button 
                onClick={onUpgrade}
                className="hidden md:block px-3 py-1.5 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white text-xs font-bold rounded-lg transition-all shadow-lg shadow-indigo-500/20"
             >
                Upgrade to PRO
             </button>
           )}

           <div className="flex items-center gap-2">
             <button 
               onClick={onDatabaseClick}
               className="p-2 hover:bg-slate-800 rounded-lg text-slate-500 hover:text-indigo-400 transition-colors"
               title="Open Data Inspector"
             >
               <Database className="w-4 h-4" />
             </button>

             <button 
               onClick={onProfileClick}
               className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center relative hover:border-indigo-500 transition-colors"
               title="View Profile"
             >
                <User className="w-4 h-4 text-slate-400" />
                {subscriptionPlan === 'PRO' && (
                  <div className="absolute -top-1 -right-1 bg-amber-500 rounded-full p-0.5 border-2 border-slate-900">
                    <Crown className="w-2 h-2 text-slate-900" />
                  </div>
                )}
             </button>
             {userEmail && (
               <div className="hidden md:block">
                 <div className="text-xs text-slate-300 font-medium">{userEmail.split('@')[0]}</div>
               </div>
             )}
           </div>
           
           <button 
             onClick={handleLogout}
             className="p-2 hover:bg-rose-500/10 text-slate-500 hover:text-rose-400 rounded-lg transition-colors"
             title="Sign Out"
           >
             <LogOut className="w-4 h-4" />
           </button>
        </div>
      </div>
    </header>
  );
};
