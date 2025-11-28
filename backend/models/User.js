const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  email: { 
    type: String, 
    required: true, 
    unique: true,
    trim: true,
    lowercase: true
  },
  password: { 
    type: String, 
    required: true 
  },
  phoneNumber: {
    type: String,
    required: true,
    unique: true
  },
  subscriptionPlan: { 
    type: String, 
    enum: ['FREE', 'PRO'], 
    default: 'FREE' 
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  }
});

module.exports = mongoose.model('User', UserSchema);