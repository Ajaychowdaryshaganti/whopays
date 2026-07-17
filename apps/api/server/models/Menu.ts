import mongoose from 'mongoose';

const menuItemSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true
  },
  price: {
    type: Number,
    required: true
  }
});

const addonSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true
  },
  price: {
    type: Number,
    required: true
  }
});

const menuSchema = new mongoose.Schema({
  basePrices: [menuItemSchema],
  addons: [addonSchema],
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

export default mongoose.model('Menu', menuSchema);
