import express from 'express';
import Transaction from '../models/Transaction.ts';
import User from '../models/User.ts';
import Log from '../models/Log.ts';

const router = express.Router();

const ADMIN_PIN = '110125';

// PIN verification middleware
const verifyPin = (req: any, res: any, next: any) => {
  const pin = req.headers['x-admin-pin'] as string;
  if (pin !== ADMIN_PIN) {
    return res.status(403).json({ error: 'Invalid admin PIN' });
  }
  next();
};

// Helper to create a log entry
const createLog = (action: string, description: string, targetId?: string, targetName?: string, details?: any) => {
  return Log.create({ action, description, targetId: targetId || null, targetName: targetName || null, details: details || {} });
};

// Verify PIN
router.post('/verify', (req, res) => {
  const { pin } = req.body;
  if (pin === ADMIN_PIN) {
    res.json({ authorized: true });
  } else {
    res.status(403).json({ authorized: false, error: 'Invalid PIN' });
  }
});

// Get all transactions (admin)
router.get('/transactions', verifyPin, async (req, res) => {
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

// Delete a single transaction (reverses balance changes)
router.delete('/transactions/:id', verifyPin, async (req, res) => {
  try {
    const transaction = await Transaction.findById(req.params.id);
    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    const buyerUser = await User.findById(transaction.buyer);
    if (buyerUser) {
      buyerUser.balance -= transaction.totalCost;
      buyerUser.timesBought = Math.max(0, buyerUser.timesBought - 1);
      await buyerUser.save();
    }

    for (const participantId of transaction.participants) {
      const user = await User.findById(participantId);
      if (user) {
        const pp = transaction.participantPrices.find(p => p.user.toString() === participantId.toString());
        const individualPrice = pp ? pp.price : transaction.costPerPerson;
        const isFree = pp?.isFreeCoffee ?? false;
        user.balance += individualPrice;
        user.coffeesDrank = Math.max(0, user.coffeesDrank - 1);
        if (isFree) {
          user.freeCoffeesUsed = Math.max(0, (user.freeCoffeesUsed || 0) - 1);
        } else {
          user.loyaltyCount = Math.max(0, user.loyaltyCount - 1);
        }
        await user.save();
      }
    }

    const buyerName = buyerUser?.name || 'Unknown';
    await Transaction.findByIdAndDelete(req.params.id);
    await createLog(
      'DELETE_TRANSACTION',
      `Deleted transaction: ${buyerName} bought for $${transaction.totalCost.toFixed(2)} on ${new Date(transaction.date).toLocaleDateString()}`,
      req.params.id,
      buyerName,
      { totalCost: transaction.totalCost, date: transaction.date }
    );
    res.json({ message: 'Transaction deleted and balances reversed' });
  } catch (error) {
    console.error('Admin delete transaction error:', error);
    res.status(500).json({ error: 'Failed to delete transaction' });
  }
});

// Clear all transactions
router.delete('/transactions', verifyPin, async (req, res) => {
  try {
    const count = await Transaction.countDocuments();
    await Transaction.deleteMany({});
    await createLog('CLEAR_ALL_TRANSACTIONS', `Cleared all transactions (${count} removed)`);
    res.json({ message: 'All transactions cleared' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to clear transactions' });
  }
});

// Reset all user balances to 0
router.post('/reset-balances', verifyPin, async (req, res) => {
  try {
    const userCount = await User.countDocuments();
    await User.updateMany({}, {
      balance: 0,
      timesBought: 0,
      coffeesDrank: 0,
      loyaltyCount: 0,
      freeCoffeesUsed: 0
    });
    await createLog('RESET_BALANCES', `Reset all balances to 0 (${userCount} users affected)`);
    res.json({ message: 'All user balances reset' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to reset balances' });
  }
});

// Nuclear option: clear all transactions AND reset balances
router.post('/reset-all', verifyPin, async (req, res) => {
  try {
    const txCount = await Transaction.countDocuments();
    const userCount = await User.countDocuments();
    await Transaction.deleteMany({});
    await User.updateMany({}, {
      balance: 0,
      timesBought: 0,
      coffeesDrank: 0,
      loyaltyCount: 0,
      freeCoffeesUsed: 0
    });
    await createLog('RESET_ALL', `Nuclear reset: cleared ${txCount} transactions and reset ${userCount} users`);
    res.json({ message: 'All transactions cleared and balances reset' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to reset all' });
  }
});

// Delete a user (admin)
router.delete('/users/:id', verifyPin, async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    await createLog(
      'DELETE_USER',
      `Deleted user: ${user.name}`,
      req.params.id,
      user.name,
      { balance: user.balance, coffeesDrank: user.coffeesDrank, timesBought: user.timesBought }
    );
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

// Edit a user (admin) - full edit including balance, timesBought, etc.
router.put('/users/:id', verifyPin, async (req, res) => {
  try {
    const { name, coffeePreference, coffeePrice, addons, balance, timesBought, coffeesDrank, loyaltyCount, freeCoffeesUsed } = req.body;
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const before = {
      name: user.name, coffeePreference: user.coffeePreference, coffeePrice: user.coffeePrice,
      balance: user.balance, timesBought: user.timesBought, coffeesDrank: user.coffeesDrank,
      loyaltyCount: user.loyaltyCount, freeCoffeesUsed: user.freeCoffeesUsed, addons: [...user.addons]
    };

    if (name !== undefined) user.name = name;
    if (coffeePreference !== undefined) user.coffeePreference = coffeePreference;
    if (coffeePrice !== undefined) user.coffeePrice = coffeePrice;
    if (addons !== undefined) user.addons = addons;
    if (balance !== undefined) user.balance = balance;
    if (timesBought !== undefined) user.timesBought = timesBought;
    if (coffeesDrank !== undefined) user.coffeesDrank = coffeesDrank;
    if (loyaltyCount !== undefined) user.loyaltyCount = loyaltyCount;
    if (freeCoffeesUsed !== undefined) user.freeCoffeesUsed = freeCoffeesUsed;

    await user.save();

    await createLog(
      'EDIT_USER',
      `Edited user: ${user.name}`,
      req.params.id,
      user.name,
      { before, after: { name: user.name, coffeePreference: user.coffeePreference, coffeePrice: user.coffeePrice, balance: user.balance, timesBought: user.timesBought, coffeesDrank: user.coffeesDrank, loyaltyCount: user.loyaltyCount, freeCoffeesUsed: user.freeCoffeesUsed, addons: user.addons } }
    );
    res.json(user);
  } catch (error) {
    console.error('Admin edit user error:', error);
    res.status(500).json({ error: 'Failed to edit user' });
  }
});

// Edit a transaction (admin)
router.put('/transactions/:id', verifyPin, async (req, res) => {
  try {
    const { description, participantPrices, totalCost } = req.body;
    const transaction = await Transaction.findById(req.params.id);
    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    const before = { description: transaction.description, totalCost: transaction.totalCost };

    if (participantPrices !== undefined || totalCost !== undefined) {
      // Reverse old balances
      const buyerUser = await User.findById(transaction.buyer);
      if (buyerUser) {
        buyerUser.balance -= transaction.totalCost;
        await buyerUser.save();
      }
      for (const participantId of transaction.participants) {
        const user = await User.findById(participantId);
        if (user) {
          const pp = transaction.participantPrices.find(p => p.user.toString() === participantId.toString());
          const oldPrice = pp ? pp.price : transaction.costPerPerson;
          const isFree = pp?.isFreeCoffee ?? false;
          user.balance += oldPrice;
          if (isFree) {
            user.freeCoffeesUsed = Math.max(0, (user.freeCoffeesUsed || 0) - 1);
          }
          await user.save();
        }
      }

      if (participantPrices !== undefined) transaction.participantPrices = participantPrices;
      if (totalCost !== undefined) transaction.totalCost = totalCost;
      transaction.costPerPerson = transaction.participants.length > 0 ? transaction.totalCost / transaction.participants.length : 0;

      // Apply new balances
      if (buyerUser) {
        buyerUser.balance += transaction.totalCost;
        await buyerUser.save();
      }
      for (const pp of transaction.participantPrices) {
        const user = await User.findById(pp.user);
        if (user) {
          user.balance -= pp.price;
          if (pp.isFreeCoffee) {
            user.freeCoffeesUsed = (user.freeCoffeesUsed || 0) + 1;
          }
          await user.save();
        }
      }
    }

    if (description !== undefined) transaction.description = description;
    await transaction.save();

    const saved = await Transaction.findById(transaction._id)
      .populate('buyer', 'name coffeePreference coffeePrice')
      .populate('participants', 'name coffeePreference coffeePrice');

    await createLog(
      'EDIT_TRANSACTION',
      `Edited transaction: ${saved?.buyer?.name || 'Unknown'} - $${transaction.totalCost.toFixed(2)}`,
      req.params.id,
      saved?.buyer?.name,
      { before, after: { description: transaction.description, totalCost: transaction.totalCost } }
    );
    res.json(saved);
  } catch (error) {
    console.error('Admin edit transaction error:', error);
    res.status(500).json({ error: 'Failed to edit transaction' });
  }
});

// Get all logs
router.get('/logs', verifyPin, async (req, res) => {
  try {
    const logs = await Log.find().sort({ timestamp: -1 }).limit(100);
    res.json(logs);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch logs' });
  }
});

export default router;
