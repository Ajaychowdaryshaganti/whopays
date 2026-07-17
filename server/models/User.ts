import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true
  },
  coffeePreference: {
    type: String,
    required: true,
    default: 'Cappuccino'
  },
  coffeePrice: {
    type: Number,
    required: true,
    default: 4.50
  },
  balance: {
    type: Number,
    default: 0
  },
  timesBought: {
    type: Number,
    default: 0
  },
  coffeesDrank: {
    type: Number,
    default: 0
  },
  loyaltyCount: {
    type: Number,
    default: 0
  },
  freeCoffeesUsed: {
    type: Number,
    default: 0
  },
  addons: {
    type: [String],
    default: []
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

export default mongoose.model('User', userSchema);
