
// ==============================
//  FIREBASE & MOCK INTEGRATION
// ==============================

// NOTE: Switched to full MockDB implementation to resolve environment module errors.
// All real firebase imports have been removed.

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


// ==============================
//  INITIALIZATION
// ==============================

console.log("⚠️ Firebase MOCK mode active (Environment Fallback)");

export const auth = { mock: true, currentUser: null };


// ==============================
//  MOCK DB IMPLEMENTATION
// ==============================

const MOCK_DELAY = 600;
const DB_KEY_USERS = "aura_db_users";
const DB_KEY_TXS = "aura_db_transactions";
const SESSION_KEY = "aura_session_user";

class MockDB {
  private listeners: ((user: User | null) => void)[] = [];

  constructor() {
    const session = localStorage.getItem(SESSION_KEY);
    // Async notify to simulate auth check delay
    setTimeout(() => {
      this.notify(session ? JSON.parse(session) : null);
    }, 100);
  }

  private getUsers() {
    return JSON.parse(localStorage.getItem(DB_KEY_USERS) || "[]");
  }
  private saveUsers(u: any[]) {
    localStorage.setItem(DB_KEY_USERS, JSON.stringify(u));
  }

  private getTxs() {
    return JSON.parse(localStorage.getItem(DB_KEY_TXS) || "[]");
  }
  private saveTxs(t: any[]) {
    localStorage.setItem(DB_KEY_TXS, JSON.stringify(t));
  }

  private notify(user: User | null) {
    this.listeners.forEach(l => l(user));
  }

  async signIn(email: string, pass: string): Promise<User> {
    await new Promise(r => setTimeout(r, MOCK_DELAY));

    const users = this.getUsers();
    const u = users.find((x: any) => x.email === email && x.password === pass);
    if (!u) throw new Error("Firebase: Error (auth/invalid-credential).");

    const sessionUser: User = {
      uid: u.uid,
      email: u.email,
      subscriptionPlan: u.subscriptionPlan,
      phoneNumber: u.phoneNumber,
      createdAt: u.createdAt,
    };

    localStorage.setItem(SESSION_KEY, JSON.stringify(sessionUser));
    this.notify(sessionUser);

    return sessionUser;
  }

  async signUp(email: string, pass: string, phone: string): Promise<User> {
    await new Promise(r => setTimeout(r, MOCK_DELAY));

    const users = this.getUsers();

    if (users.find((x: any) => x.email === email))
      throw new Error("Firebase: Error (auth/email-already-in-use).");

    if (users.find((x: any) => x.phoneNumber === phone))
      throw new Error("Firebase: Error (auth/phone-already-in-use).");

    const newUser = {
      uid: "user_" + Math.random().toString(36).slice(2),
      email,
      password: pass,
      phoneNumber: phone,
      subscriptionPlan: "FREE",
      createdAt: Date.now(),
    };

    users.push(newUser);
    this.saveUsers(users);

    const sessionUser: User = {
      uid: newUser.uid,
      email: newUser.email,
      subscriptionPlan: "FREE",
      phoneNumber: newUser.phoneNumber,
      createdAt: newUser.createdAt,
    };

    localStorage.setItem(SESSION_KEY, JSON.stringify(sessionUser));
    this.notify(sessionUser);

    return sessionUser;
  }

  async signOut() {
    await new Promise(r => setTimeout(r, MOCK_DELAY / 2));
    localStorage.removeItem(SESSION_KEY);
    this.notify(null);
  }

  onAuthStateChanged(cb: (user: User | null) => void) {
    this.listeners.push(cb);
    const session = localStorage.getItem(SESSION_KEY);
    if (session) {
      cb(JSON.parse(session));
    }
    // Note: If no session, we wait for the constructor timeout or user action to notify.

    return () => {
      this.listeners = this.listeners.filter(l => l !== cb);
    };
  }

  async updateUserPlan(uid: string, plan: 'FREE' | 'PRO') {
    const users = this.getUsers();
    const i = users.findIndex((u: any) => u.uid === uid);
    if (i !== -1) {
      users[i].subscriptionPlan = plan;
      this.saveUsers(users);
    }

    const session = localStorage.getItem(SESSION_KEY);
    if (session) {
      const s = JSON.parse(session);
      if (s.uid === uid) {
        s.subscriptionPlan = plan;
        localStorage.setItem(SESSION_KEY, JSON.stringify(s));
        this.notify(s);
      }
    }
  }

  async addTransaction(tx: any) {
    const txs = this.getTxs();
    txs.push(tx);
    this.saveTxs(txs);
  }

  async getUserTransactions(uid: string) {
    const txs = this.getTxs();
    return txs
      .filter((t: any) => t.uid === uid)
      .sort((a: any, b: any) => b.timestamp - a.timestamp);
  }
}

const mockDB = new MockDB();


// ==============================
//  EXPORTED FUNCTIONS
// ==============================

export const signInWithEmailAndPassword = async (authObj: any, email: string, pass: string) => {
  return mockDB.signIn(email, pass);
};

export const createUserWithEmailAndPassword = async (authObj: any, email: string, pass: string, phone: string) => {
  return mockDB.signUp(email, pass, phone);
};

export const signOut = async (authObj: any) => {
  return mockDB.signOut();
};

export const onAuthStateChanged = (authObj: any, callback: (u: User | null) => void) => {
  return mockDB.onAuthStateChanged(callback);
};

export const updateUserSubscription = async (plan: 'FREE' | 'PRO') => {
  const session = JSON.parse(localStorage.getItem(SESSION_KEY) || '{}');
  if (session.uid) {
    await mockDB.updateUserPlan(session.uid, plan);
  }
};

export const recordTransaction = async (details: Omit<Transaction, "id" | "timestamp">): Promise<string> => {
  const tx = {
    ...details,
    id: Math.random().toString(36).substring(2, 10).toUpperCase(),
    timestamp: Date.now()
  };

  const session = JSON.parse(localStorage.getItem(SESSION_KEY) || "{}");
  if (session.uid) {
    await mockDB.addTransaction({ uid: session.uid, ...tx });
  }

  return tx.id;
};

export const getUserTransactions = async (uid: string): Promise<Transaction[]> => {
  return mockDB.getUserTransactions(uid);
};
