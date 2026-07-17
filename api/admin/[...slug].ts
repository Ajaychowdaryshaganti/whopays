import { VercelRequest, VercelResponse } from '@vercel/node';
import mongoose from 'mongoose';
import Transaction from '../../server/models/Transaction';
import User from '../../server/models/User';

const ADMIN_PIN = '110125';

const connectDB = async () => {
  if (mongoose.connections[0].readyState === 1) return;
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/coffee-tracker');
};

const verifyPin = (req: VercelRequest): boolean => {
  const pin = req.headers['x-admin-pin'] as string;
  return pin === ADMIN_PIN;
};

export default async (req: VercelRequest, res: VercelResponse) => {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token,X-Requested-With,Accept,Accept-Version,Content-Length,Content-MD5,Content-Type,Date,X-Api-Version,X-Admin-Pin');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    await connectDB();

    const slug = req.query.slug as string[];
    const path = slug ? slug.join('/') : '';
    const id = slug?.[1];

    // Verify endpoint doesn't need PIN
    if (path === 'verify') {
      if (req.method === 'POST') {
        const { pin } = req.body;
        if (pin === ADMIN_PIN) {
          return res.json({ authorized: true });
        } else {
          return res.status(403).json({ authorized: false, error: 'Invalid PIN' });
        }
      }
    }

    // All other endpoints need PIN verification
    if (!verifyPin(req)) {
      return res.status(403).json({ error: 'Invalid admin PIN' });
    }

    if (req.method === 'GET' && path === 'transactions') {
      const transactions = await Transaction.find()
        .populate('buyer', 'name coffeePreference coffeePrice')
        .populate('participants', 'name coffeePreference coffeePrice')
        .sort({ date: -1 });
      return res.json(transactions);
    }

    if (req.method === 'DELETE' && path.startsWith('transactions')) {
      if (!id) {
        await Transaction.deleteMany({});
        return res.json({ message: 'All transactions cleared' });
      }

      const transaction = await Transaction.findById(id);
      if (!transaction) return res.status(404).json({ error: 'Transaction not found' });

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

      await Transaction.findByIdAndDelete(id);
      return res.json({ message: 'Transaction deleted and balances reversed' });
    }

    if (req.method === 'POST' && path === 'reset-balances') {
      await User.updateMany({}, {
        balance: 0,
        timesBought: 0,
        coffeesDrank: 0,
        loyaltyCount: 0
      });
      return res.json({ message: 'All user balances reset' });
    }

    if (req.method === 'POST' && path === 'reset-all') {
      await Transaction.deleteMany({});
      await User.updateMany({}, {
        balance: 0,
        timesBought: 0,
        coffeesDrank: 0,
        loyaltyCount: 0
      });
      return res.json({ message: 'All transactions cleared and balances reset' });
    }

    if (req.method === 'DELETE' && path.startsWith('users')) {
      const user = await User.findByIdAndDelete(id);
      if (!user) return res.status(404).json({ error: 'User not found' });
      return res.json({ message: 'User deleted successfully' });
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (error: any) {
    console.error('Admin API error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
};
