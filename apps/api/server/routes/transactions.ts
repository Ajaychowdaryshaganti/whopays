import express from 'express';
import Transaction from '../models/Transaction.js';
import User from '../models/User.js';

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
    const { buyer, participants, description, priceOverrides, freeCoffees } = req.body;

    // Get buyer and participants with their coffee prices
    const buyerUser = await User.findById(buyer);
    const participantUsers = await User.find({ _id: { $in: participants } });

    if (!buyerUser || participantUsers.length === 0) {
      return res.status(400).json({ error: 'Invalid buyer or participants' });
    }

    const freeCoffeeList: string[] = freeCoffees || [];

    // Calculate total cost and per-participant prices based on coffee price or override
    let totalCost = 0;
    let totalFreeValue = 0;
    const participantPrices: { user: string; price: number; isFreeCoffee: boolean; freeCoffeeValue: number }[] = [];
    participantUsers.forEach(user => {
      const isFree = freeCoffeeList.includes(user._id.toString());
      if (isFree) {
        // Free coffee: buyer doesn't pay, but we record the value
        participantPrices.push({
          user: user._id.toString(),
          price: 0,
          isFreeCoffee: true,
          freeCoffeeValue: user.coffeePrice
        });
        totalFreeValue += user.coffeePrice;
      } else {
        const override = priceOverrides?.[user._id.toString()];
        const price = override !== undefined ? override : user.coffeePrice;
        totalCost += price;
        participantPrices.push({
          user: user._id.toString(),
          price,
          isFreeCoffee: false,
          freeCoffeeValue: 0
        });
      }
    });

    const costPerPerson = totalCost / participantUsers.length;

    // totalValue includes both paid and free coffees (consumption value)
    const totalValue = totalCost + totalFreeValue;

    // Create transaction
    const transaction = new Transaction({
      buyer,
      participants,
      participantPrices,
      totalCost,
      costPerPerson,
      totalValue,
      description: description || 'Coffee run'
    });

    await transaction.save();

    // Update buyer's balance and times bought (only for what they actually paid)
    buyerUser.balance += totalCost;
    buyerUser.timesBought += 1;
    await buyerUser.save();

    // Update each participant's balance and coffees drank
    for (const user of participantUsers) {
      const pp = participantPrices.find(p => p.user === user._id.toString());
      const individualPrice = pp ? pp.price : costPerPerson;
      const isFree = pp?.isFreeCoffee ?? false;

      // Skip balance deduction for the buyer (they already got credited for totalCost)
      if (user._id.toString() === buyer) {
        if (isFree) {
          // Buyer used their own free coffee:
          // - Count it as consumption
          // - Track that they used a free coffee
          // - Reset loyaltyCount (they consumed a free coffee)
          user.coffeesDrank += 1;
          user.freeCoffeesUsed += 1;
          user.loyaltyCount = 0;
        } else {
          user.coffeesDrank += 1;
          // Loyalty card logic still applies to buyer
          user.loyaltyCount += 1;
          if (user.loyaltyCount === 8) {
            user.balance += user.coffeePrice; // Credit for free coffee
            user.earnedFreeCoffees += 1; // Track earned free coffee
            user.loyaltyCount = 0;
          }
        }
        await user.save();
      } else if (isFree) {
        // Free coffee for a non-buyer participant:
        // - Do NOT deduct balance (they didn't spend)
        // - Count as consumption
        // - Track free usage and reset loyalty
        user.freeCoffeesUsed += 1;
        user.coffeesDrank += 1;
        user.loyaltyCount = 0;
        await user.save();
      } else {
        // Normal paid participant
        user.balance -= individualPrice;
        user.coffeesDrank += 1;
        // Loyalty card logic - every 8th coffee is free
        user.loyaltyCount += 1;
        if (user.loyaltyCount === 8) {
          user.balance += user.coffeePrice; // Credit for free coffee
          user.earnedFreeCoffees += 1; // Track earned free coffee
          user.loyaltyCount = 0;
        }
        await user.save();
      }
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
      totalPaid: transactions.reduce((sum, t) => sum + t.totalCost, 0),
      totalValue: transactions.reduce((sum, t) => sum + (t.totalValue || t.totalCost), 0), // fallback
      transactions
    };

    res.json(summary);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch monthly summary' });
  }
});

export default router;
