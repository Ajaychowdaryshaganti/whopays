import express from 'express';
import Transaction from '../models/Transaction.ts';
import User from '../models/User.ts';

const router = express.Router();

// Get all transactions
router.get('/', async (req, res) => {
  try {
    const transactions = await Transaction.find()
      .populate('buyer', 'name coffeePreference coffeePrice')
      .populate('participants', 'name coffeePreference coffeePrice')
      .sort({ date: -1 });
    res.json(transactions);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
});

// Get single transaction
router.get('/:id', async (req, res) => {
  try {
    const transaction = await Transaction.findById(req.params.id)
      .populate('buyer', 'name coffeePreference coffeePrice')
      .populate('participants', 'name coffeePreference coffeePrice');
    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }
    res.json(transaction);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch transaction' });
  }
});

// Create transaction
router.post('/', async (req, res) => {
  try {
    const { buyer, participants, description, priceOverrides } = req.body;

    // Get buyer and participants with their coffee prices
    const buyerUser = await User.findById(buyer);
    const participantUsers = await User.find({ _id: { $in: participants } });

    if (!buyerUser || participantUsers.length === 0) {
      return res.status(400).json({ error: 'Invalid buyer or participants' });
    }

    // Calculate total cost and per-participant prices based on coffee price or override
    let totalCost = 0;
    const participantPrices: { user: string; price: number }[] = [];
    participantUsers.forEach(user => {
      const override = priceOverrides?.[user._id.toString()];
      const price = override !== undefined ? override : user.coffeePrice;
      totalCost += price;
      participantPrices.push({ user: user._id.toString(), price });
    });

    const costPerPerson = totalCost / participantUsers.length;

    // Create transaction
    const transaction = new Transaction({
      buyer,
      participants,
      participantPrices,
      totalCost,
      costPerPerson,
      description: description || 'Coffee run'
    });

    await transaction.save();

    // Update buyer's balance and times bought
    buyerUser.balance += totalCost;
    buyerUser.timesBought += 1;
    await buyerUser.save();

    // Update each participant's balance and coffees drank
    for (const user of participantUsers) {
      const pp = participantPrices.find(p => p.user === user._id.toString());
      const individualPrice = pp ? pp.price : costPerPerson;
      user.balance -= individualPrice;
      user.coffeesDrank += 1;
      
      // Loyalty card logic - every 8th coffee is free
      user.loyaltyCount += 1;
      if (user.loyaltyCount === 8) {
        user.balance += user.coffeePrice; // Credit for free coffee
        user.loyaltyCount = 0;
      }
      
      await user.save();
    }

    const savedTransaction = await Transaction.findById(transaction._id)
      .populate('buyer', 'name coffeePreference coffeePrice')
      .populate('participants', 'name coffeePreference coffeePrice');

    res.status(201).json(savedTransaction);
  } catch (error) {
    console.error('Transaction error:', error);
    res.status(400).json({ error: 'Failed to create transaction' });
  }
});

// Get monthly summary
router.get('/summary/monthly', async (req, res) => {
  try {
    const { month, year } = req.query;
    
    if (!month || !year) {
      return res.status(400).json({ error: 'Month and year are required' });
    }
    
    const startDate = new Date(parseInt(year as string), parseInt(month as string) - 1, 1);
    const endDate = new Date(parseInt(year as string), parseInt(month as string), 0);

    const transactions = await Transaction.find({
      date: { $gte: startDate, $lte: endDate }
    })
      .populate('buyer', 'name')
      .populate('participants', 'name')
      .sort({ date: -1 });

    const summary = {
      month,
      year,
      totalTransactions: transactions.length,
      totalSpent: transactions.reduce((sum, t) => sum + t.totalCost, 0),
      transactions
    };

    res.json(summary);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch monthly summary' });
  }
});

export default router;
