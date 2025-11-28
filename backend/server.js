
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

// Import Models
const User = require('./models/User');
const Transaction = require('./models/Transaction');

const app = express();
const PORT = process.env.PORT || 5000;

// ============================================================================
// 🟢 MONGODB ATLAS CONNECTION SETUP
// ============================================================================
const ATLAS_CONNECTION_STRING = "mongodb+srv://charantejreddykondreddy_db_user:volvo162636@cluster0.ttsgjoq.mongodb.net/quantum_finance?appName=Cluster0"; 

// Logic to choose connection: Environment Variable -> Hardcoded Atlas String -> Localhost Fallback
const MONGO_URI = process.env.MONGO_URI || 
                  (ATLAS_CONNECTION_STRING.length > 5 ? ATLAS_CONNECTION_STRING : 'mongodb://localhost:27017/quantum_finance');

// Middleware
app.use(cors()); // Allow requests from frontend
app.use(express.json());

// --- Database Connection ---
console.log(`\n🔄 Initializing Database Connection...`);

mongoose.connect(MONGO_URI)
  .then(() => {
    console.log(`✅ SUCCESS: Connected to MongoDB`);
    console.log(`   Target: ${MONGO_URI.includes('localhost') ? 'Local Database (localhost)' : 'MongoDB Atlas (Cloud)'}`);
  })
  .catch(err => {
    console.error('❌ ERROR: Could not connect to MongoDB');
    console.error('   Reason:', err.message);
  });

// --- Health Check Route ---
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'online', 
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    timestamp: Date.now()
  });
});

// --- Auth Routes ---

// Login
app.post('/api/auth/login', async (req, res) => {
  console.log(`📥 Login Request: ${req.body.email}`);
  try {
    const { email, password } = req.body;
    
    // Simple password check (In production, use bcrypt)
    const user = await User.findOne({ email, password });
    
    if (!user) {
      console.log(`   ❌ Login failed: Invalid credentials`);
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    console.log(`   ✅ Login successful: ${user._id}`);
    res.json({
      uid: user._id,
      email: user.email,
      subscriptionPlan: user.subscriptionPlan,
      phoneNumber: user.phoneNumber,
      createdAt: user.createdAt
    });
  } catch (error) {
    console.error('   ❌ Server error:', error.message);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Register
app.post('/api/auth/register', async (req, res) => {
  console.log(`📥 Register Request: ${req.body.email}`);
  try {
    const { email, password, phoneNumber } = req.body;

    const existingUser = await User.findOne({ $or: [{ email }, { phoneNumber }] });
    if (existingUser) {
        console.log(`   ❌ Registration failed: User exists`);
      return res.status(400).json({ message: 'User with this email or phone already exists' });
    }

    const newUser = new User({
      email,
      password, // Note: In a real app, hash this password before saving!
      phoneNumber,
      subscriptionPlan: 'FREE'
    });

    await newUser.save();
    console.log(`   ✅ User saved to Database: ${newUser._id}`);

    res.status(201).json({
      uid: newUser._id,
      email: newUser.email,
      subscriptionPlan: newUser.subscriptionPlan,
      phoneNumber: newUser.phoneNumber,
      createdAt: newUser.createdAt
    });
  } catch (error) {
    console.error('   ❌ Registration error:', error.message);
    res.status(500).json({ message: 'Error creating user', error: error.message });
  }
});

// --- User Routes ---

// Update Plan
app.post('/api/user/subscription', async (req, res) => {
  try {
    const { uid, plan } = req.body;
    await User.findByIdAndUpdate(uid, { subscriptionPlan: plan });
    console.log(`🔄 Updated Subscription for ${uid} to ${plan}`);
    res.json({ success: true, plan });
  } catch (error) {
    res.status(500).json({ message: 'Update failed' });
  }
});

// Record Transaction
app.post('/api/transactions', async (req, res) => {
  try {
    const { uid, amount, currency, method, metadata } = req.body;
    
    const tx = new Transaction({
      userId: uid,
      amount,
      currency,
      method,
      metadata
    });

    await tx.save();
    console.log(`💰 Transaction Recorded: ${amount} ${currency}`);
    res.status(201).json({ id: tx._id });
  } catch (error) {
    res.status(500).json({ message: 'Transaction failed' });
  }
});

// Get User Transactions
app.get('/api/transactions/:uid', async (req, res) => {
  try {
    const txs = await Transaction.find({ userId: req.params.uid }).sort({ timestamp: -1 });
    
    // Map to frontend format
    const formattedTxs = txs.map(t => ({
      id: t._id,
      amount: t.amount,
      currency: t.currency,
      method: t.method,
      timestamp: t.timestamp,
      metadata: t.metadata
    }));

    res.json(formattedTxs);
  } catch (error) {
    res.status(500).json({ message: 'Fetch failed' });
  }
});

// Start Server
app.listen(PORT, () => {
  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`🚀 QUANTUM FINANCE BACKEND RESTARTED`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`   📡 Port: ${PORT}`);
  console.log(`   📂 Database: ${MONGO_URI.includes('localhost') ? 'Local' : 'Atlas Cloud'}`);
  console.log(`   🔗 Health: http://localhost:${PORT}/api/health`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
});
