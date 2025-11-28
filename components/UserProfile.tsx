import React, { useEffect, useState } from 'react';
import { User, Transaction, getUserTransactions } from '../services/firebase';
import { X, User as UserIcon, Calendar, Smartphone, ShieldCheck, History, CreditCard, Landmark, Loader2 } from 'lucide-react';

interface UserProfileProps {
  isOpen: boolean;
  onClose: () => void;
  user: User;
}

export const UserProfile: React.FC<UserProfileProps> = ({ isOpen, onClose, user }) => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen && user.uid) {
      setLoading(true);
      getUserTransactions(user.uid)
        .then(data => setTransactions(data))
        .catch(err => console.error("Failed to fetch transactions", err))
        .finally(() => setLoading(false));
    }
  }, [isOpen, user.uid]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-2xl bg-slate-900 rounded-2xl border border-slate-800 shadow-2xl overflow-hidden flex flex-col relative">
        <button 
          onClick={onClose} 
          className="absolute top-4 right-4 text-slate-500 hover:text-white z-10 p-1 bg-slate-800/50 rounded-full transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="p-6 border-b border-slate-800 bg-slate-950/50">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <UserIcon className="w-5 h-5 text-indigo-400" />
            My Profile
          </h2>
        </div>

        <div className="p-6 overflow-y-auto max-h-[80vh] custom-scrollbar">
          
          {/* User Details Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
             <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
                <div className="text-xs text-slate-400 uppercase tracking-wider mb-1">Account</div>
                <div className="font-bold text-white text-lg truncate">{user.email}</div>
                <div className="text-xs text-slate-500 mt-2 flex items-center gap-1">
                   <Calendar className="w-3 h-3" /> Member since {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
                </div>
             </div>

             <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
                <div className="text-xs text-slate-400 uppercase tracking-wider mb-1">Plan Status</div>
                <div className="flex items-center justify-between">
                   <div className={`font-bold text-lg ${user.subscriptionPlan === 'PRO' ? 'text-amber-400' : 'text-slate-200'}`}>
                      {user.subscriptionPlan === 'PRO' ? 'Professional' : 'Starter Free'}
                   </div>
                   {user.subscriptionPlan === 'PRO' && <ShieldCheck className="w-5 h-5 text-amber-500" />}
                </div>
                <div className="text-xs text-slate-500 mt-2 flex items-center gap-1">
                   {user.phoneNumber ? (
                      <>
                        <Smartphone className="w-3 h-3 text-emerald-500" /> 
                        {user.phoneNumber}
                      </>
                   ) : (
                      'No mobile number linked'
                   )}
                </div>
             </div>
          </div>

          {/* Transaction History */}
          <div>
             <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                <History className="w-4 h-4" /> Transaction History
             </h3>
             
             <div className="bg-slate-950 rounded-xl border border-slate-800 overflow-hidden">
                {loading ? (
                   <div className="p-8 flex justify-center">
                      <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
                   </div>
                ) : transactions.length === 0 ? (
                   <div className="p-8 text-center text-slate-500 text-sm">
                      No transactions found.
                   </div>
                ) : (
                   <div className="divide-y divide-slate-800">
                      {transactions.map(tx => (
                         <div key={tx.id} className="p-4 flex items-center justify-between hover:bg-slate-900 transition-colors">
                            <div className="flex items-center gap-3">
                               <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center border border-slate-700">
                                  {tx.method === 'BANK' ? <Landmark className="w-4 h-4 text-emerald-400" /> : <CreditCard className="w-4 h-4 text-indigo-400" />}
                               </div>
                               <div>
                                  <div className="text-sm font-bold text-white">
                                     {tx.method === 'BANK' && tx.metadata?.bankRegion === 'UPI' ? 'UPI Transfer' : 'Subscription Payment'}
                                  </div>
                                  <div className="text-xs text-slate-500 font-mono">
                                     ID: #QNTM-{tx.id}
                                  </div>
                               </div>
                            </div>
                            <div className="text-right">
                               <div className="text-sm font-bold text-white">
                                  {tx.currency === 'INR' ? '₹' : tx.currency === 'EUR' ? '€' : '$'}
                                  {tx.amount.toLocaleString()}
                               </div>
                               <div className="text-xs text-slate-500">
                                  {new Date(tx.timestamp).toLocaleDateString()}
                               </div>
                            </div>
                         </div>
                      ))}
                   </div>
                )}
             </div>
          </div>

        </div>
      </div>
    </div>
  );
};