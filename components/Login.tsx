
import React, { useState } from 'react';
import { auth, signInWithEmailAndPassword, createUserWithEmailAndPassword } from '../services/firebase';
import { Zap, Lock, Mail, Loader2, AlertCircle, ArrowRight, Smartphone } from 'lucide-react';

export const Login: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        if (!phone) {
           setError("Mobile number is required for account security.");
           setLoading(false);
           return;
        }
        await createUserWithEmailAndPassword(auth, email, password, phone);
      }
    } catch (err: any) {
      // Clean up firebase error messages for UI
      let msg = err.message;
      if (msg.includes('auth/invalid-email')) msg = 'Invalid email address.';
      if (msg.includes('auth/user-not-found')) msg = 'No account found with this email.';
      if (msg.includes('auth/wrong-password')) msg = 'Incorrect password.';
      if (msg.includes('auth/email-already-in-use')) msg = 'Email is already in use.';
      if (msg.includes('auth/weak-password')) msg = 'Password should be at least 6 characters.';
      setError(msg.replace('Firebase: ', ''));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 relative overflow-hidden font-sans">
      {/* Background Effects */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-indigo-500/10 rounded-full blur-[100px] pointer-events-none animate-pulse" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-emerald-500/10 rounded-full blur-[100px] pointer-events-none" />

      {/* Main Card */}
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-8 relative z-10 backdrop-blur-xl">
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20 mb-4 ring-1 ring-white/20">
            <Zap className="w-7 h-7 text-white fill-current" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">QuantumFinance</h1>
          <p className="text-slate-400 text-sm mt-2">Professional Trading Intelligence</p>
        </div>

        {error && (
          <div className="mb-6 p-3 bg-red-500/10 border border-red-500/50 rounded-lg flex items-center gap-2 text-red-400 text-xs font-medium animate-in fade-in slide-in-from-top-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">Email Address</label>
            <div className="relative group">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-indigo-400 transition-colors" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 pl-10 pr-4 text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all text-sm"
                placeholder="trader@example.com"
              />
            </div>
          </div>

          {!isLogin && (
             <div className="animate-in fade-in slide-in-from-top-2">
               <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">Mobile Number</label>
               <div className="relative group">
                 <Smartphone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-indigo-400 transition-colors" />
                 <input
                   type="tel"
                   value={phone}
                   onChange={(e) => setPhone(e.target.value)}
                   required={!isLogin}
                   className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 pl-10 pr-4 text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all text-sm"
                   placeholder="+91 98765 43210"
                 />
               </div>
               <p className="text-[10px] text-slate-600 mt-1 flex items-center gap-1">
                 <ShieldCheck className="w-3 h-3 text-emerald-500" />
                 One account per mobile number policy.
               </p>
             </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">Password</label>
            <div className="relative group">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-indigo-400 transition-colors" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 pl-10 pr-4 text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all text-sm"
                placeholder="••••••••"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-3 rounded-xl transition-all shadow-lg shadow-indigo-500/20 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed mt-4 group"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                {isLogin ? "Sign In" : "Create Account"}
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </>
            )}
          </button>
        </form>

        <div className="mt-6 pt-6 border-t border-slate-800/50 text-center">
          <button
            onClick={() => { setIsLogin(!isLogin); setError(null); }}
            className="text-xs text-slate-400 hover:text-white transition-colors flex items-center justify-center mx-auto gap-1"
          >
            {isLogin ? "New to QuantumFinance?" : "Already have an account?"}
            <span className="text-indigo-400 font-medium hover:underline">{isLogin ? "Create account" : "Sign in"}</span>
          </button>
        </div>
      </div>
      
      <div className="mt-8 text-center text-[10px] text-slate-600 uppercase tracking-widest opacity-60">
        &copy; 2024 QuantumFinance. Secure Access.
      </div>
    </div>
  );
};
import { ShieldCheck } from 'lucide-react';
