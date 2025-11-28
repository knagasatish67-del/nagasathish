
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Layout, StopCircle, PlayCircle, Activity, MessageSquare, Eye, BrainCircuit, AlertCircle, Loader2, Lock } from 'lucide-react';
import { ScreenViewer } from './components/ScreenViewer';
import { AnalysisSidebar } from './components/AnalysisSidebar';
import { Header } from './components/Header';
import { Login } from './components/Login';
import { SubscriptionModal } from './components/SubscriptionModal';
import { UserProfile } from './components/UserProfile';
import { DataInspector } from './components/DataInspector';
import { analyzeScreenContent, askQuestionAboutScreen } from './services/geminiService';
import { AnalysisResult, ChatMessage, MarketData } from './types';
import { MarketStreamService } from './services/marketStream';
import { MarketTicker } from './components/MarketTicker';
import { auth, onAuthStateChanged, User } from './services/firebase';

const App: React.FC = () => {
  // Auth State
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // App Logic State
  const [isCapturing, setIsCapturing] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [autoAnalyze, setAutoAnalyze] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // UI Modal State
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showInspector, setShowInspector] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const autoAnalyzeIntervalRef = useRef<number | null>(null);
  const marketStreamRef = useRef<MarketStreamService | null>(null);

  // Monitor Auth State
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Initialize Market Stream (Only when logged in)
  useEffect(() => {
    if (!user) return;

    marketStreamRef.current = new MarketStreamService();
    
    const handleStreamUpdate = (data: MarketData[]) => {
       // Dispatch a custom event for components to consume
       window.dispatchEvent(new CustomEvent('market-update', { detail: data }));
    };

    marketStreamRef.current.subscribe(handleStreamUpdate);
    marketStreamRef.current.connect();
    
    return () => {
      marketStreamRef.current?.unsubscribe(handleStreamUpdate);
      marketStreamRef.current?.disconnect();
    };
  }, [user]);

  // Handle Screen Capture Start
  const startCapture = async () => {
    setError(null);
    try {
      const displayStream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          frameRate: { ideal: 30 }
        },
        audio: false
      });

      setStream(displayStream);
      setIsCapturing(true);

      displayStream.getVideoTracks()[0].onended = () => {
        stopCapture();
      };

    } catch (err: any) {
      // Handle user cancellation gracefully
      if (
        err.name === 'NotAllowedError' || 
        err.name === 'AbortError' || 
        err.message?.includes('Permission denied') || 
        err.message?.includes('cancelled')
      ) {
        console.log("Screen capture cancelled by user");
        setError("Screen capture was cancelled. Please select a screen to start.");
        return;
      }

      console.error("Error starting screen capture:", err);
      
      if (err.name === 'NotFoundError') {
        setError("No screen video source found.");
      } else {
         setError("Failed to start screen capture. Please ensure permissions are granted.");
      }
    }
  };

  // Handle Screen Capture Stop
  const stopCapture = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setIsCapturing(false);
    setAutoAnalyze(false);
    if (autoAnalyzeIntervalRef.current) {
      window.clearInterval(autoAnalyzeIntervalRef.current);
    }
  }, [stream]);

  // Capture current frame as Base64
  const captureFrame = useCallback((): string | null => {
    if (!videoRef.current || !canvasRef.current) return null;
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    if (!context || video.videoWidth === 0) return null;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    return canvas.toDataURL('image/jpeg', 0.7).split(',')[1]; 
  }, []);

  // Perform Analysis
  const handleAnalyze = async () => {
    if (!isCapturing) return;
    
    const base64Image = captureFrame();
    if (!base64Image) return;

    setIsAnalyzing(true);
    setError(null);
    try {
      const result = await analyzeScreenContent(base64Image);
      setAnalysisResult(result);
    } catch (error: any) {
      if (error.message === "QUOTA_EXCEEDED") {
        // Friendly user message for rate limits
        const waitTime = new Date(Date.now() + 60000).toLocaleTimeString();
        setError(`⚠️ API Quota Hit. Cooling down until ${waitTime}. Auto-pilot paused.`);
        setAutoAnalyze(false);
        
        // Force stop interval
        if (autoAnalyzeIntervalRef.current) {
          window.clearInterval(autoAnalyzeIntervalRef.current);
          autoAnalyzeIntervalRef.current = null;
        }
      } else {
        console.error("Analysis failed:", error);
        setError("Analysis failed. The AI model might be busy or the API key is invalid.");
      }
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Handle Chat Questions
  const handleSendMessage = async (message: string) => {
    const base64Image = captureFrame();
    if (!base64Image) {
      setChatHistory(prev => [...prev, { role: 'model', text: 'Please start screen capture to ask questions about the screen.' }]);
      return;
    }

    setChatHistory(prev => [...prev, { role: 'user', text: message }]);

    try {
      const responseText = await askQuestionAboutScreen(base64Image, message);
      setChatHistory(prev => [...prev, { role: 'model', text: responseText }]);
    } catch (error) {
      setChatHistory(prev => [...prev, { role: 'model', text: 'Sorry, I encountered an error analyzing the screen.' }]);
    }
  };

  // Toggle Auto-Pilot with Subscription Gate
  const toggleAutoPilot = () => {
    if (user?.subscriptionPlan !== 'PRO') {
      setShowSubscriptionModal(true);
      return;
    }
    setAutoAnalyze(!autoAnalyze);
  };

  // Effect for Auto-Analysis
  useEffect(() => {
    if (autoAnalyze && isCapturing) {
      handleAnalyze();
      
      autoAnalyzeIntervalRef.current = window.setInterval(() => {
        if (!isAnalyzing) {
          handleAnalyze();
        }
      }, 20000); // 20s Interval
    } else {
      if (autoAnalyzeIntervalRef.current) {
        window.clearInterval(autoAnalyzeIntervalRef.current);
      }
    }

    return () => {
      if (autoAnalyzeIntervalRef.current) {
        window.clearInterval(autoAnalyzeIntervalRef.current);
      }
    };
  }, [autoAnalyze, isCapturing]);

  // RENDER: Loading State
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-indigo-500">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  // RENDER: Login Page
  if (!user) {
    return <Login />;
  }

  // RENDER: Main App
  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100 overflow-hidden">
      <Header 
         userEmail={user.email} 
         subscriptionPlan={user.subscriptionPlan} 
         onUpgrade={() => setShowSubscriptionModal(true)} 
         onProfileClick={() => setShowProfileModal(true)}
         onDatabaseClick={() => setShowInspector(true)}
      />
      <MarketTicker />
      
      <SubscriptionModal isOpen={showSubscriptionModal} onClose={() => setShowSubscriptionModal(false)} />
      {showProfileModal && <UserProfile isOpen={showProfileModal} onClose={() => setShowProfileModal(false)} user={user} />}
      {showInspector && <DataInspector isOpen={showInspector} onClose={() => setShowInspector(false)} />}

      <main className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Left: Screen Viewer Area */}
        <div className="flex-1 flex flex-col p-4 gap-4 relative min-h-[400px]">
           <canvas ref={canvasRef} className="hidden" />
           
          <div className="flex-1 bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden relative shadow-2xl flex items-center justify-center">
            {stream ? (
               <ScreenViewer stream={stream} videoRef={videoRef} />
            ) : (
              <div className="text-center p-8">
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-slate-800 mb-4 animate-pulse">
                   <Layout className="w-10 h-10 text-slate-500" />
                </div>
                <h2 className="text-xl font-semibold text-white mb-2">Ready to Analyze</h2>
                <p className="text-slate-400 max-w-md mx-auto mb-8">
                  Share your screen to get deep reasoning insights, code analysis, and summaries.
                </p>
                
                {error && (
                  <div className="mb-6 p-3 bg-red-500/10 border border-red-500/50 rounded-lg flex items-center gap-2 text-red-400 max-w-md mx-auto text-sm text-left animate-in fade-in slide-in-from-top-2">
                    <AlertCircle className="w-5 h-5 shrink-0" />
                    {error}
                  </div>
                )}

                <button
                  onClick={startCapture}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-medium transition-all shadow-lg hover:shadow-indigo-500/20"
                >
                  <PlayCircle className="w-5 h-5" />
                  Start Screen Capture
                </button>
              </div>
            )}

            {/* Overlay Controls when active */}
            {isCapturing && (
              <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-3 bg-slate-950/90 backdrop-blur-sm p-2 rounded-full border border-slate-800 shadow-xl z-20">
                <button 
                   onClick={toggleAutoPilot}
                   className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                     autoAnalyze 
                       ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                       : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                   }`}
                >
                  {user.subscriptionPlan !== 'PRO' ? <Lock className="w-3 h-3 text-yellow-500" /> : <BrainCircuit className="w-4 h-4" />}
                  {autoAnalyze ? 'Auto-Pilot' : 'Pilot Off'}
                </button>

                <button 
                  onClick={handleAnalyze}
                  disabled={isAnalyzing || autoAnalyze}
                  className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-full text-sm font-medium transition-colors"
                >
                  {isAnalyzing ? (
                    <>
                       <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                       Aura Scan...
                    </>
                  ) : (
                    <>
                      <Eye className="w-4 h-4" />
                      Scan Market
                    </>
                  )}
                </button>

                <div className="w-px h-6 bg-slate-700 mx-1" />

                <button 
                  onClick={stopCapture}
                  className="p-2 hover:bg-red-500/20 text-slate-400 hover:text-red-400 rounded-full transition-colors"
                  title="Stop Capture"
                >
                  <StopCircle className="w-5 h-5" />
                </button>
              </div>
            )}
            
            {/* Error Overlay inside container if running */}
            {error && isCapturing && (
               <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-red-500/90 text-white px-4 py-2 rounded-full text-sm shadow-lg backdrop-blur-sm z-30 flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
                 <AlertCircle className="w-4 h-4" />
                 {error}
               </div>
            )}
          </div>
        </div>

        {/* Right: Sidebar */}
        <div className="w-full lg:w-[400px] border-t lg:border-t-0 lg:border-l border-slate-800 bg-slate-900/50 backdrop-blur flex flex-col">
           <AnalysisSidebar 
              isAnalyzing={isAnalyzing}
              analysisResult={analysisResult}
              chatHistory={chatHistory}
              onSendMessage={handleSendMessage}
              isCapturing={isCapturing}
           />
        </div>
      </main>
    </div>
  );
};

export default App;
