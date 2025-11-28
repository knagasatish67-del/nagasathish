
// ==============================
//  SERVICE ADAPTER (MOCK vs API)
// ==============================

// ------------------------------------------------------------------
// CONFIGURATION
// ------------------------------------------------------------------
// Set this to TRUE to connect to your local Node.js + MongoDB backend
// Set this to FALSE to use the in-browser Mock Database (LocalStorage)
const USE_BACKEND = true; 

const API_BASE_URL = "http://localhost:5000/api";
const MOCK_DELAY = 600;

// ==============================
//  TYPES
// ==============================

export interface User {
  uid: string;
  email: string | null;
  subscriptionPlan: 'FREE' | 'PRO';
  phoneNumber?: string;
  createdAt?: number;
}

export interface Transaction {
  id: string;
  amount: number;
  currency: string;
  method: string;
  timestamp: number;
  metadata?: any;
}

// Interface that both implementations must satisfy
interface AuthService {
  signIn(email: string, pass: string): Promise<User>;
  signUp(email: string, pass: string, phone: string): Promise<User>;
  signOut(): Promise<void>;
  updateUserPlan(uid: string, plan: 'FREE' | 'PRO'): Promise<void>;
  addTransaction(uid: string, tx: any): Promise<string>;
  getUserTransactions(uid: string): Promise<Transaction[]>;
}

// ==============================
//  MOCK DB IMPLEMENTATION
// ==============================

const DB_KEY_USERS = "aura_db_users";
const DB_KEY_TXS = "aura_db_transactions";
const SESSION_KEY = "aura_session_user";

class MockDB implements AuthService {
  constructor() {}

  private getUsers() { return JSON.parse(localStorage.getItem(DB_KEY_USERS) || "[]"); }
  private saveUsers(u: any[]) { localStorage.setItem(DB_KEY_USERS, JSON.stringify(u)); }
  private getTxs() { return JSON.parse(localStorage.getItem(DB_KEY_TXS) || "[]"); }
  private saveTxs(t: any[]) { localStorage.setItem(DB_KEY_TXS, JSON.stringify(t)); }

  async signIn(email: string, pass: string): Promise<User> {
    await new Promise(r => setTimeout(r, MOCK_DELAY));
    const users = this.getUsers();
    const u = users.find((x: any) => x.email === email && x.password === pass);
    if (!u) throw new Error("Firebase: Error (auth/invalid-credential).");
    const user = this.mapUser(u);
    this.saveSession(user);
    return user;
  }

  async signUp(email: string, pass: string, phone: string): Promise<User> {
    await new Promise(r => setTimeout(r, MOCK_DELAY));
    const users = this.getUsers();
    if (users.find((x: any) => x.email === email)) throw new Error("Firebase: Error (auth/email-already-in-use).");
    if (users.find((x: any) => x.phoneNumber === phone)) throw new Error("Firebase: Error (auth/phone-already-in-use).");

    const newUser = {
      uid: "user_" + Math.random().toString(36).slice(2),
      email, password: pass, phoneNumber: phone, subscriptionPlan: "FREE", createdAt: Date.now(),
    };
    users.push(newUser);
    this.saveUsers(users);
    const user = this.mapUser(newUser);
    this.saveSession(user);
    return user;
  }

  async signOut() {
    await new Promise(r => setTimeout(r, MOCK_DELAY / 2));
    localStorage.removeItem(SESSION_KEY);
  }

  async updateUserPlan(uid: string, plan: 'FREE' | 'PRO') {
    const users = this.getUsers();
    const i = users.findIndex((u: any) => u.uid === uid);
    if (i !== -1) {
      users[i].subscriptionPlan = plan;
      this.saveUsers(users);
      // Update session if it matches
      const session = this.getSession();
      if (session && session.uid === uid) {
        session.subscriptionPlan = plan;
        this.saveSession(session);
      }
    }
  }

  async addTransaction(uid: string, tx: any) {
    const txs = this.getTxs();
    const newTx = { ...tx, id: Math.random().toString(36).substring(2, 10).toUpperCase(), timestamp: Date.now() };
    txs.push({ uid, ...newTx });
    this.saveTxs(txs);
    return newTx.id;
  }

  async getUserTransactions(uid: string) {
    const txs = this.getTxs();
    return txs.filter((t: any) => t.uid === uid).map((t: any) => {
        const { uid, ...rest } = t; 
        return rest; 
    }).sort((a: any, b: any) => b.timestamp - a.timestamp);
  }

  private mapUser(u: any): User {
    return { uid: u.uid, email: u.email, subscriptionPlan: u.subscriptionPlan, phoneNumber: u.phoneNumber, createdAt: u.createdAt };
  }
  public getSession(): User | null { return JSON.parse(localStorage.getItem(SESSION_KEY) || "null"); }
  private saveSession(u: User) { localStorage.setItem(SESSION_KEY, JSON.stringify(u)); }
}

// ==============================
//  API (BACKEND) IMPLEMENTATION
// ==============================

class ApiDB implements AuthService {
  private async handleFetch(url: string, options: RequestInit) {
    try {
      const res = await fetch(url, options);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(`Firebase: Error (${err.message || 'auth/failed'})`);
      }
      return await res.json();
    } catch (e: any) {
      if (e.message && e.message.includes('Failed to fetch')) {
        throw new Error("Connection Failed: Ensure backend server is running on localhost:5000");
      }
      throw e;
    }
  }

  async checkHealth(): Promise<boolean> {
    try {
      const res = await fetch(`${API_BASE_URL}/health`);
      return res.ok;
    } catch {
      return false;
    }
  }

  async signIn(email: string, pass: string): Promise<User> {
    const user = await this.handleFetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: pass })
    });
    this.saveSession(user);
    return user;
  }

  async signUp(email: string, pass: string, phone: string): Promise<User> {
    const user = await this.handleFetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: pass, phoneNumber: phone })
    });
    this.saveSession(user);
    return user;
  }

  async signOut() {
    localStorage.removeItem(SESSION_KEY);
  }

  async updateUserPlan(uid: string, plan: 'FREE' | 'PRO') {
    await this.handleFetch(`${API_BASE_URL}/user/subscription`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uid, plan })
    });
    // Update local session to reflect change immediately
    const session = this.getSession();
    if (session) {
        session.subscriptionPlan = plan;
        this.saveSession(session);
    }
  }

  async addTransaction(uid: string, tx: any) {
    const data = await this.handleFetch(`${API_BASE_URL}/transactions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uid, ...tx })
    });
    return data.id;
  }

  async getUserTransactions(uid: string) {
    return await this.handleFetch(`${API_BASE_URL}/transactions/${uid}`, {
      method: 'GET'
    });
  }

  public getSession(): User | null { return JSON.parse(localStorage.getItem(SESSION_KEY) || "null"); }
  private saveSession(u: User) { localStorage.setItem(SESSION_KEY, JSON.stringify(u)); }
}

// ==============================
//  MAIN EXPORT LOGIC
// ==============================

// Initialize the appropriate provider
const mockDB = new MockDB();
const apiDB = new ApiDB();

const provider = USE_BACKEND ? apiDB : mockDB;
console.log(`🚀 Service Mode: ${USE_BACKEND ? 'BACKEND API (MongoDB)' : 'MOCK DB (LocalStorage)'}`);

// Auth object for listeners (Simulated)
export const auth = { 
    currentUser: provider instanceof MockDB ? mockDB.getSession() : apiDB.getSession()
};

// Listeners array
let authListeners: ((user: User | null) => void)[] = [];

const notifyListeners = (user: User | null) => {
    auth.currentUser = user;
    authListeners.forEach(l => l(user));
};

// --- EXPORTED FUNCTIONS ---

export const checkBackendHealth = async () => {
    if (USE_BACKEND) return await apiDB.checkHealth();
    return true; // Mock DB is always healthy
};

export const signInWithEmailAndPassword = async (authObj: any, email: string, pass: string) => {
  const user = await provider.signIn(email, pass);
  notifyListeners(user);
  return user;
};

export const createUserWithEmailAndPassword = async (authObj: any, email: string, pass: string, phone: string) => {
  const user = await provider.signUp(email, pass, phone);
  notifyListeners(user);
  return user;
};

export const signOut = async (authObj: any) => {
  await provider.signOut();
  notifyListeners(null);
};

export const onAuthStateChanged = (authObj: any, callback: (u: User | null) => void) => {
  authListeners.push(callback);
  // Immediate check
  const user = provider instanceof MockDB ? mockDB.getSession() : apiDB.getSession();
  callback(user);
  return () => {
    authListeners = authListeners.filter(l => l !== callback);
  };
};

export const updateUserSubscription = async (plan: 'FREE' | 'PRO') => {
  if (auth.currentUser) {
    await provider.updateUserPlan(auth.currentUser.uid, plan);
    // Refresh session to update UI
    const updatedUser = { ...auth.currentUser, subscriptionPlan: plan };
    notifyListeners(updatedUser);
  }
};

export const recordTransaction = async (details: Omit<Transaction, "id" | "timestamp">): Promise<string> => {
  if (auth.currentUser) {
    return await provider.addTransaction(auth.currentUser.uid, details);
  }
  throw new Error("User not authenticated");
};

export const getUserTransactions = async (uid: string): Promise<Transaction[]> => {
  return await provider.getUserTransactions(uid);
};
