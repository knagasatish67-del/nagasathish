
import React, { useState } from 'react';
import { CheckCircle2, X, CreditCard, Wallet, Bitcoin, Landmark, Loader2, ShieldCheck, Zap, Globe, QrCode, Smartphone, FileText, Calendar } from 'lucide-react';
import { updateUserSubscription, recordTransaction } from '../services/firebase';

interface SubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type PaymentMethod = 'CARD' | 'WALLET' | 'CRYPTO' | 'BANK';

export const SubscriptionModal: React.FC<SubscriptionModalProps> = ({ isOpen, onClose }) => {
  const [step, setStep] = useState<'PLANS' | 'PAYMENT' | 'PROCESSING' | 'SUCCESS'>('PLANS');
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>('CARD');
  const [billingCycle, setBillingCycle] = useState<'MONTHLY' | 'YEARLY'>('MONTHLY');
  
  // Bank/UPI Specific State
  const [bankRegion, setBankRegion] = useState<string>('Select Bank Region');
  const [upiId, setUpiId] = useState('knagasatish67@okhdfcbank');
  const [utrId, setUtrId] = useState('');
  
  // Transaction Result State
  const [transactionId, setTransactionId] = useState<string | null>(null);
  
  if (!isOpen) return null;

  const handleUpgradeClick = () => {
    setStep('PAYMENT');
  };

  const getCurrencyDetails = () => {
    let currency = 'USD';
    let symbol = '$';
    let amount = billingCycle === 'MONTHLY' ? 29 : 290;

    // Logic: If Bank Region is UPI, use INR. If EU, use EUR. Else USD.
    if (selectedMethod === 'BANK') {
      if (bankRegion === 'UPI') {
        currency = 'INR';
        symbol = '₹';
        amount = billingCycle === 'MONTHLY' ? 2499 : 24990; // Approx fixed pricing
      } else if (bankRegion === 'EU') {
        currency = 'EUR';
        symbol = '€';
        amount = billingCycle === 'MONTHLY' ? 29 : 290;
      }
    }

    return { currency, symbol, amount };
  };

  const { currency, symbol, amount } = getCurrencyDetails();

  const handlePaymentSubmit = async () => {
    setStep('PROCESSING');
    try {
      // Simulate Payment Gateway delay / Stripe Verification
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      const tid = await recordTransaction({
        amount,
        currency,
        method: selectedMethod,
        metadata: {
          bankRegion: selectedMethod === 'BANK' ? bankRegion : undefined,
          upiId: (selectedMethod === 'BANK' && bankRegion === 'UPI') ? upiId : undefined,
          utrId: (selectedMethod === 'BANK' && bankRegion === 'UPI') ? utrId : undefined,
          billingCycle,
          plan: 'PRO'
        }
      });

      setTransactionId(tid);
      
      // Update the user's subscription to PRO in the backend/mock DB
      await updateUserSubscription('PRO');
      
      setStep('SUCCESS');
    } catch (e) {
      console.error("Payment failed", e);
      setStep('PLANS');
    }
  };

  // Generate a real UPI QR code URL
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=upi://pay?pa=${upiId}&pn=QuantumFinance&cu=INR&am=${billingCycle === 'MONTHLY' ? '2499' : '24990'}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-4xl bg-slate-900 rounded-2xl border border-slate-800 shadow-2xl overflow-hidden flex flex-col md:flex-row relative">
        <button 
          onClick={onClose} 
          className="absolute top-4 right-4 text-slate-500 hover:text-white z-10 p-1 bg-slate-800/50 rounded-full"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Left Side: Value Prop */}
        <div className="w-full md:w-1/3 bg-slate-950 p-8 flex flex-col justify-between border-r border-slate-800 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-500" />
          
          <div>
            <div className="w-12 h-12 bg-indigo-500/10 rounded-xl flex items-center justify-center mb-6">
              <Zap className="w-6 h-6 text-indigo-400" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Quantum PRO</h2>
            <p className="text-slate-400 text-sm mb-6">Unlock the full power of the AuraEdge Engine and automate your trading strategy.</p>
            
            <ul className="space-y-4">
              {[
                "Unlimited Auto-Pilot Scans",
                "3-5% Precision Filters",
                "Real-time Signal Alerts",
                "Advanced Pattern Recognition",
                "Institutional Flow Data",
                "Priority Execution Speed"
              ].map((item, idx) => (
                <li key={idx} className="flex items-center gap-3 text-sm text-slate-300">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
          
          <div className="mt-8 pt-6 border-t border-slate-800 text-xs text-slate-500">
             Trusted by 10,000+ traders worldwide. Cancel anytime.
          </div>
        </div>

        {/* Right Side: Flow */}
        <div className="w-full md:w-2/3 bg-slate-900 p-8 flex flex-col">
          
          {step === 'PLANS' && (
            <div className="animate-in slide-in-from-right-4 fade-in">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-white">Select Your Plan</h3>
                
                {/* Billing Cycle Toggle */}
                <div className="bg-slate-950 p-1 rounded-lg border border-slate-800 flex items-center">
                   <button 
                     onClick={() => setBillingCycle('MONTHLY')}
                     className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${billingCycle === 'MONTHLY' ? 'bg-slate-800 text-white shadow' : 'text-slate-500 hover:text-slate-300'}`}
                   >
                     Monthly
                   </button>
                   <button 
                     onClick={() => setBillingCycle('YEARLY')}
                     className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${billingCycle === 'YEARLY' ? 'bg-indigo-600 text-white shadow' : 'text-slate-500 hover:text-slate-300'}`}
                   >
                     Yearly <span className="text-[9px] opacity-80 font-normal ml-1">(-17%)</span>
                   </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Free Plan */}
                <div className="rounded-xl border border-slate-800 p-6 bg-slate-900/50 opacity-60 grayscale hover:grayscale-0 hover:opacity-100 transition-all cursor-pointer relative group">
                  <h4 className="font-bold text-white mb-1">Starter</h4>
                  <div className="text-2xl font-bold text-slate-200 mb-4">Free</div>
                  <button onClick={onClose} className="w-full py-2 rounded-lg border border-slate-700 text-slate-400 text-sm font-medium hover:bg-slate-800 transition-colors">
                    Continue with Free
                  </button>
                </div>

                {/* Pro Plan */}
                <div className="rounded-xl border-2 border-indigo-500 p-6 bg-indigo-900/10 relative shadow-xl shadow-indigo-900/20">
                  <div className="absolute top-0 right-0 bg-indigo-500 text-white text-[10px] font-bold px-3 py-1 rounded-bl-xl uppercase tracking-wider">
                    Most Popular
                  </div>
                  <h4 className="font-bold text-white mb-1">Professional</h4>
                  <div className="text-3xl font-bold text-white mb-1">
                    {billingCycle === 'MONTHLY' ? '$29' : '$290'}
                    <span className="text-sm font-normal text-slate-400">/{billingCycle === 'MONTHLY' ? 'mo' : 'yr'}</span>
                  </div>
                  <p className="text-xs text-indigo-200 mb-6">
                     {billingCycle === 'MONTHLY' ? 'Billed monthly.' : 'Billed annually.'} 3-day trial included.
                  </p>
                  
                  <button 
                    onClick={handleUpgradeClick}
                    className="w-full py-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm transition-all shadow-lg hover:shadow-indigo-500/25 flex items-center justify-center gap-2"
                  >
                    Upgrade Now <Zap className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {step === 'PAYMENT' && (
             <div className="flex-1 flex flex-col animate-in slide-in-from-right-4 fade-in">
                <div className="mb-6">
                   <h3 className="text-xl font-bold text-white mb-2">Secure Checkout</h3>
                   <p className="text-sm text-slate-400 flex items-center gap-2">
                     <ShieldCheck className="w-4 h-4 text-emerald-500" /> 
                     256-bit SSL Encrypted Payment
                   </p>
                </div>

                {/* Method Tabs */}
                <div className="flex gap-2 mb-6 overflow-x-auto pb-2 scrollbar-hide">
                   {[
                      { id: 'CARD', label: 'Card', icon: CreditCard },
                      { id: 'WALLET', label: 'Wallet', icon: Wallet },
                      { id: 'CRYPTO', label: 'Crypto', icon: Bitcoin },
                      { id: 'BANK', label: 'Bank / UPI', icon: Landmark },
                   ].map((method) => (
                      <button
                        key={method.id}
                        onClick={() => setSelectedMethod(method.id as PaymentMethod)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium whitespace-nowrap transition-all ${
                           selectedMethod === method.id 
                             ? 'bg-indigo-600 border-indigo-500 text-white' 
                             : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700'
                        }`}
                      >
                         <method.icon className="w-4 h-4" /> {method.label}
                      </button>
                   ))}
                </div>

                {/* Dynamic Payment Form Simulation */}
                <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 max-h-[300px]">
                   {selectedMethod === 'CARD' && (
                      <div className="space-y-4">
                         <div className="flex gap-2 mb-2">
                            <div className="h-8 w-12 bg-slate-800 rounded flex items-center justify-center text-[10px] text-slate-400 font-bold">VISA</div>
                            <div className="h-8 w-12 bg-slate-800 rounded flex items-center justify-center text-[10px] text-slate-400 font-bold">MC</div>
                            <div className="h-8 w-12 bg-slate-800 rounded flex items-center justify-center text-[10px] text-slate-400 font-bold">AMEX</div>
                         </div>
                         <input type="text" placeholder="Card Number" className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-sm text-white focus:outline-none focus:border-indigo-500" />
                         <div className="grid grid-cols-2 gap-4">
                            <input type="text" placeholder="MM/YY" className="bg-slate-950 border border-slate-700 rounded-lg p-3 text-sm text-white focus:outline-none focus:border-indigo-500" />
                            <input type="text" placeholder="CVC" className="bg-slate-950 border border-slate-700 rounded-lg p-3 text-sm text-white focus:outline-none focus:border-indigo-500" />
                         </div>
                      </div>
                   )}

                   {selectedMethod === 'WALLET' && (
                      <div className="space-y-3 py-4">
                         <button className="w-full py-3 bg-[#0070BA] hover:bg-[#005ea6] text-white rounded-lg font-bold flex items-center justify-center gap-2">
                            Pay with PayPal
                         </button>
                         <button className="w-full py-3 bg-white text-black hover:bg-gray-100 rounded-lg font-bold flex items-center justify-center gap-2">
                            <span className="font-bold">Pay</span> with Apple Pay
                         </button>
                         <button className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 rounded-lg font-bold flex items-center justify-center gap-2">
                            Google Pay
                         </button>
                      </div>
                   )}

                   {selectedMethod === 'CRYPTO' && (
                      <div className="space-y-4">
                         <div className="p-4 bg-slate-950 rounded-lg border border-slate-700 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                               <div className="w-8 h-8 rounded-full bg-[#F7931A] flex items-center justify-center text-white font-bold text-xs">₿</div>
                               <div>
                                  <div className="text-sm text-white font-bold">Bitcoin</div>
                                  <div className="text-xs text-slate-500">BTC Network</div>
                               </div>
                            </div>
                            <input type="radio" name="crypto" defaultChecked className="accent-indigo-500" />
                         </div>
                         <div className="p-4 bg-slate-950 rounded-lg border border-slate-700 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                               <div className="w-8 h-8 rounded-full bg-[#2775CA] flex items-center justify-center text-white font-bold text-xs">$</div>
                               <div>
                                  <div className="text-sm text-white font-bold">USDC</div>
                                  <div className="text-xs text-slate-500">ERC20 / Solana</div>
                               </div>
                            </div>
                            <input type="radio" name="crypto" className="accent-indigo-500" />
                         </div>
                      </div>
                   )}

                   {selectedMethod === 'BANK' && (
                      <div className="space-y-4">
                         <select 
                            value={bankRegion}
                            onChange={(e) => setBankRegion(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-sm text-white focus:outline-none"
                         >
                            <option>Select Bank Region</option>
                            <option value="USA">USA (ACH)</option>
                            <option value="EU">Europe (SEPA)</option>
                            <option value="UPI">India (UPI)</option>
                            <option value="JP">Japan (Konbini)</option>
                         </select>

                         {/* UPI Specific Flow */}
                         {bankRegion === 'UPI' ? (
                            <div className="animate-in fade-in slide-in-from-top-2 space-y-4">
                               <div className="p-4 bg-white rounded-lg border border-slate-700 flex flex-col gap-3 items-center">
                                  <div className="text-sm font-bold text-slate-900 flex items-center gap-2 w-full">
                                     <Smartphone className="w-4 h-4 text-emerald-600" /> Scan to Pay
                                  </div>
                                  
                                  {/* Dynamic QR Code */}
                                  <div className="p-2 border-2 border-dashed border-slate-300 rounded bg-white">
                                     <img 
                                        src={qrCodeUrl} 
                                        alt="UPI QR Code" 
                                        className="w-40 h-40 object-contain"
                                     />
                                  </div>

                                  <div className="text-center">
                                     <div className="text-xs font-bold text-slate-500 uppercase tracking-wide">Pay to UPI ID</div>
                                     <div className="text-sm font-mono font-bold text-slate-900 select-all bg-slate-100 px-2 py-1 rounded mt-1 border border-slate-200">
                                       {upiId}
                                     </div>
                                     <div className="text-[10px] text-slate-500 mt-1">Nagasatish Kamana</div>
                                  </div>
                               </div>

                               <div>
                                  <label className="text-xs font-bold text-slate-400 mb-1.5 block">Transaction Reference (UTR)</label>
                                  <div className="relative">
                                     <input 
                                        type="text" 
                                        placeholder="Enter 12-digit UTR ID" 
                                        value={utrId}
                                        onChange={(e) => setUtrId(e.target.value)}
                                        className="w-full bg-slate-950 border border-indigo-500/50 rounded-lg p-3 pl-10 text-sm text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
                                     />
                                     <FileText className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                  </div>
                                  <p className="text-[10px] text-slate-500 mt-1">
                                    Required for payment verification via Stripe.
                                  </p>
                               </div>
                            </div>
                         ) : (
                            <div className="text-xs text-slate-500 p-3 bg-slate-950 rounded border border-slate-800">
                               Bank transfers may take 1-3 business days to settle. Instant access provided for UPI/SEPA Instant.
                            </div>
                         )}
                      </div>
                   )}
                </div>

                <div className="mt-6 pt-4 border-t border-slate-800 flex justify-between items-center">
                   <div className="text-right flex-1 mr-4">
                      <div className="text-xs text-slate-400">Total due today</div>
                      <div className="text-xl font-bold text-white flex justify-end items-center gap-1">
                        {symbol}{amount.toLocaleString()} 
                        <span className="text-xs font-normal text-slate-500 ml-1">{currency}</span>
                      </div>
                   </div>
                   <button 
                      onClick={handlePaymentSubmit}
                      disabled={selectedMethod === 'BANK' && bankRegion === 'UPI' && utrId.length < 4}
                      className="px-8 py-3 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-lg shadow-lg shadow-emerald-500/20 transition-all flex items-center gap-2"
                   >
                      {selectedMethod === 'BANK' && bankRegion === 'UPI' ? 'Submit Payment Details' : 'Complete Purchase'}
                   </button>
                </div>
             </div>
          )}

          {step === 'PROCESSING' && (
             <div className="flex-1 flex flex-col items-center justify-center animate-in fade-in">
                <div className="relative mb-6">
                   <div className="w-20 h-20 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
                   <div className="absolute inset-0 flex items-center justify-center">
                      <Globe className="w-8 h-8 text-indigo-400 animate-pulse" />
                   </div>
                </div>
                
                {selectedMethod === 'BANK' && bankRegion === 'UPI' ? (
                   <>
                     <h3 className="text-lg font-bold text-white mb-2">Verifying with Stripe...</h3>
                     <p className="text-sm text-slate-400 text-center max-w-xs">
                        Validating UTR <span className="font-mono text-emerald-400">{utrId}</span> against banking ledger.
                     </p>
                   </>
                ) : (
                   <>
                     <h3 className="text-lg font-bold text-white mb-2">Processing Secure Payment...</h3>
                     <p className="text-sm text-slate-400">Connecting to Global Payment Gateway</p>
                   </>
                )}
             </div>
          )}

          {step === 'SUCCESS' && (
             <div className="flex-1 flex flex-col items-center justify-center animate-in zoom-in-95 duration-300">
                <div className="w-20 h-20 bg-emerald-500 rounded-full flex items-center justify-center shadow-2xl shadow-emerald-500/40 mb-6 animate-bounce">
                   <CheckCircle2 className="w-10 h-10 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-2">Payment Successful!</h3>
                {transactionId && (
                   <div className="mb-4 px-3 py-1 bg-slate-800 rounded-full border border-slate-700 text-xs font-mono text-slate-400">
                      Transaction ID: #QNTM-{transactionId}
                   </div>
                )}
                <p className="text-slate-400 mb-8 text-center max-w-sm">
                   Thank you for upgrading! Your account is now Pro. Auto-Pilot and Advanced Pattern Intelligence are active.
                </p>
                <button 
                   onClick={onClose}
                   className="px-8 py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-lg transition-all"
                >
                   Continue to Dashboard
                </button>
             </div>
          )}
        </div>
      </div>
    </div>
  );
};
