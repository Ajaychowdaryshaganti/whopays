import mongoose from 'mongoose';

const transactionSchema = new mongoose.Schema({
  date: {
    type: Date,
    required: true,
    default: Date.now
  },
  buyer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  participants: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }],
  participantPrices: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    price: {
      type: Number,
      required: true
    }
  }],
  totalCost: {
    type: Number,
    required: true
  },
  costPerPerson: {
    type: Number,
    required: true
  },
  description: {
    type: String,
    default: 'Coffee run'
  }
});

export default mongoose.model('Transaction', transactionSchema);
