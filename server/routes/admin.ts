import express from 'express';
import Transaction from '../models/Transaction.ts';
import User from '../models/User.ts';

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
        user.balance += individualPrice;
        user.coffeesDrank = Math.max(0, user.coffeesDrank - 1);
        user.loyaltyCount = Math.max(0, user.loyaltyCount - 1);
        await user.save();
      }
    }

    await Transaction.findByIdAndDelete(req.params.id);
    res.json({ message: 'Transaction deleted and balances reversed' });
  } catch (error) {
    console.error('Admin delete transaction error:', error);
    res.status(500).json({ error: 'Failed to delete transaction' });
  }
});

// Clear all transactions
router.delete('/transactions', verifyPin, async (req, res) => {
  try {
    await Transaction.deleteMany({});
    res.json({ message: 'All transactions cleared' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to clear transactions' });
  }
});

// Reset all user balances to 0
router.post('/reset-balances', verifyPin, async (req, res) => {
  try {
    await User.updateMany({}, {
      balance: 0,
      timesBought: 0,
      coffeesDrank: 0,
      loyaltyCount: 0
    });
    res.json({ message: 'All user balances reset' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to reset balances' });
  }
});

// Nuclear option: clear all transactions AND reset balances
router.post('/reset-all', verifyPin, async (req, res) => {
  try {
    await Transaction.deleteMany({});
    await User.updateMany({}, {
      balance: 0,
      timesBought: 0,
      coffeesDrank: 0,
      loyaltyCount: 0
    });
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
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

export default router;
