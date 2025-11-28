
import React, { useState, useEffect } from 'react';
import { X, Database, RefreshCw, Trash2, AlertTriangle } from 'lucide-react';

interface DataInspectorProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DataInspector: React.FC<DataInspectorProps> = ({ isOpen, onClose }) => {
  const [users, setUsers] = useState<any[]>([]);
  const [txs, setTxs] = useState<any[]>([]);

  const loadData = () => {
    try {
      setUsers(JSON.parse(localStorage.getItem('aura_db_users') || '[]'));
      setTxs(JSON.parse(localStorage.getItem('aura_db_transactions') || '[]'));
    } catch (e) {
      console.error("Failed to parse DB", e);
    }
  };

  const clearData = () => {
    if (window.confirm("Are you sure? This will delete all local user and transaction data.")) {
        localStorage.removeItem('aura_db_users');
        localStorage.removeItem('aura_db_transactions');
        localStorage.removeItem('aura_session_user');
        loadData();
        window.location.reload();
    }
  };

  useEffect(() => {
    if (isOpen) loadData();
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md animate-in fade-in duration-200">
       <div className="w-full max-w-4xl max-h-[85vh] bg-slate-900 border border-slate-800 rounded-2xl flex flex-col shadow-2xl overflow-hidden relative">
          
          {/* Header */}
          <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950 shrink-0">
             <div className="flex items-center gap-2 text-indigo-400 font-bold">
                <Database className="w-5 h-5" /> 
                <span>Local Data Inspector</span>
                <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-500 text-[10px] uppercase tracking-wider">Mock DB</span>
             </div>
             <div className="flex items-center gap-2">
                <button 
                    onClick={clearData} 
                    className="p-2 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 rounded-lg text-slate-500 hover:text-red-400 transition-colors mr-2"
                    title="Clear All Data"
                >
                   <Trash2 className="w-4 h-4" />
                </button>
                <div className="w-px h-6 bg-slate-800 mx-1" />
                <button onClick={loadData} className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors">
                   <RefreshCw className="w-4 h-4" />
                </button>
                <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors">
                   <X className="w-5 h-5" />
                </button>
             </div>
          </div>
          
          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
             
             <div className="p-4 bg-amber-500/5 border border-amber-500/20 rounded-xl flex gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />
                <div className="text-xs text-amber-200/80">
                   <strong className="text-amber-400 block mb-1">Developer Mode</strong>
                   You are viewing the raw data stored in your browser's Local Storage. In a production environment, this data would be hosted on Firebase Firestore.
                </div>
             </div>

             {/* Users Section */}
             <div>
                <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4 border-b border-slate-800 pb-2 flex justify-between">
                   <span>Users Table</span>
                   <span className="text-indigo-400">{users.length} Records</span>
                </h3>
                <div className="bg-slate-950 rounded-xl border border-slate-800 overflow-hidden shadow-sm">
                   <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs text-slate-400">
                        <thead className="bg-slate-900 text-slate-200 font-medium">
                            <tr>
                                <th className="p-3">UID</th>
                                <th className="p-3">Email</th>
                                <th className="p-3">Mobile</th>
                                <th className="p-3">Plan</th>
                                <th className="p-3">Created</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800">
                            {users.map((u: any, i: number) => (
                                <tr key={i} className="hover:bg-slate-900/50 transition-colors">
                                <td className="p-3 font-mono text-slate-500 truncate max-w-[100px]" title={u.uid}>{u.uid}</td>
                                <td className="p-3 text-white">{u.email}</td>
                                <td className="p-3">{u.phoneNumber || '-'}</td>
                                <td className="p-3">
                                    <span className={`px-2 py-0.5 rounded font-bold ${u.subscriptionPlan === 'PRO' ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' : 'bg-slate-800 text-slate-400'}`}>
                                        {u.subscriptionPlan}
                                    </span>
                                </td>
                                <td className="p-3 text-slate-500">{new Date(u.createdAt).toLocaleString()}</td>
                                </tr>
                            ))}
                            {users.length === 0 && (
                                <tr><td colSpan={5} className="p-8 text-center italic opacity-50">No users found in database.</td></tr>
                            )}
                        </tbody>
                    </table>
                   </div>
                </div>
             </div>

             {/* Transactions Section */}
             <div>
                <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4 border-b border-slate-800 pb-2 flex justify-between">
                   <span>Transactions Log</span>
                   <span className="text-emerald-400">{txs.length} Records</span>
                </h3>
                {txs.length > 0 ? (
                    <div className="grid grid-cols-1 gap-2">
                        {txs.map((tx: any, i: number) => (
                            <div key={i} className="bg-slate-950 p-3 rounded-lg border border-slate-800 font-mono text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:border-slate-700 transition-colors">
                                <div className="flex items-center gap-3">
                                    <span className="text-slate-500">#{tx.id}</span>
                                    <span className="text-white font-bold">{tx.currency === 'INR' ? '₹' : tx.currency === 'EUR' ? '€' : '$'}{tx.amount}</span>
                                    <span className={`px-1.5 py-0.5 rounded bg-slate-800 text-[10px] ${tx.method === 'BANK' ? 'text-emerald-400' : 'text-indigo-400'}`}>
                                        {tx.method} {tx.metadata?.bankRegion === 'UPI' ? '(UPI)' : ''}
                                    </span>
                                </div>
                                <div className="text-slate-500">
                                    {new Date(tx.timestamp).toLocaleString()}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="bg-slate-950 p-8 rounded-xl border border-slate-800 text-center text-xs text-slate-600 italic">
                        No transaction records found.
                    </div>
                )}
                
                {/* Raw JSON View */}
                {txs.length > 0 && (
                    <div className="mt-4">
                        <div className="text-[10px] text-slate-600 mb-1 uppercase font-bold">Raw JSON Payload</div>
                        <pre className="bg-black/50 p-4 rounded-xl border border-slate-800 text-[10px] text-emerald-400/80 font-mono overflow-auto max-h-40 custom-scrollbar">
                            {JSON.stringify(txs, null, 2)}
                        </pre>
                    </div>
                )}
             </div>
          </div>
       </div>
    </div>
  );
};
