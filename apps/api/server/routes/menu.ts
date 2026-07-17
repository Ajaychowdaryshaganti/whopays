import express from 'express';
import mongoose from 'mongoose';
import Menu from '../models/Menu.js';

const router = express.Router();

const connectDB = async () => {
  if (mongoose.connections[0].readyState === 1) return;
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/coffee-tracker');
};

// Get menu
router.get('/', async (req, res) => {
  try {
    await connectDB();
    let menu = await Menu.findOne();
    if (!menu) {
      // Create default menu if none exists
      menu = await Menu.create({
        basePrices: [
          { name: 'Cappuccino', price: 5.00 },
          { name: 'Latte', price: 5.00 },
          { name: 'Flat White', price: 5.00 },
          { name: 'Long Black', price: 4.50 },
          { name: 'Espresso', price: 4.00 },
          { name: 'Americano', price: 4.50 },
          { name: 'Mocha', price: 5.50 },
          { name: 'Hot Chocolate', price: 5.00 },
          { name: 'Chai Latte', price: 5.50 },
          { name: 'Matcha Latte', price: 6.00 },
          { name: 'Iced Latte', price: 5.50 },
          { name: 'Iced Cappuccino', price: 5.50 },
          { name: 'Iced Long Black', price: 5.00 },
          { name: 'Cold Brew', price: 5.00 },
          { name: 'Iced Mocha', price: 6.00 },
          { name: 'Frappé', price: 6.50 },
          { name: 'Fresh Juice', price: 8.00 },
          { name: 'Smoothie', price: 9.00 },
          { name: 'Milkshake', price: 7.00 },
          { name: 'Soft Drink', price: 4.00 },
          { name: 'Tea', price: 4.00 },
          { name: 'Iced Tea', price: 4.50 },
          { name: 'Pastry', price: 5.00 },
          { name: 'Croissant', price: 4.50 },
          { name: 'Muffin', price: 4.50 },
          { name: 'Toast', price: 5.00 },
          { name: 'Bagel', price: 6.00 },
          { name: 'Breakfast Roll', price: 12.00 },
        ],
        addons: [
          { name: 'Oat Milk', price: 0.50 },
          { name: 'Almond Milk', price: 0.50 },
          { name: 'Soy Milk', price: 0.50 },
          { name: 'Lactose Free Milk', price: 0.50 },
          { name: 'Skim Milk', price: 0 },
          { name: 'Extra Shot', price: 1.00 },
          { name: 'Decaf', price: 0.50 },
          { name: 'Caramel Syrup', price: 0.50 },
          { name: 'Vanilla Syrup', price: 0.50 },
          { name: 'Hazelnut Syrup', price: 0.50 },
          { name: 'Extra Hot', price: 0 },
          { name: 'Half Strength', price: 0 },
        ],
      });
    }
    res.json(menu);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch menu' });
  }
});

// Update menu (admin only)
router.put('/', async (req, res) => {
  try {
    await connectDB();
    const { basePrices, addons } = req.body;
    let menu = await Menu.findOne();
    if (!menu) {
      menu = new Menu();
    }
    if (basePrices) menu.basePrices = basePrices;
    if (addons) menu.addons = addons;
    menu.updatedAt = new Date();
    await menu.save();
    res.json(menu);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update menu' });
  }
});

export default router;
