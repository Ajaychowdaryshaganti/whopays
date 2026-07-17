import { VercelRequest, VercelResponse } from '@vercel/node';
import mongoose from 'mongoose';
import Transaction from '../models/Transaction';
import User from '../models/User';

const connectDB = async () => {
  if (mongoose.connections[0].readyState === 1) return;
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/coffee-tracker');
};

export default async (req: VercelRequest, res: VercelResponse) => {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token,X-Requested-With,Accept,Accept-Version,Content-Length,Content-MD5,Content-Type,Date,X-Api-Version');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    await connectDB();

    const slug = req.query.slug as string[];
    const path = slug ? slug.join('/') : '';
    const id = slug?.[0];
    const { month, year } = req.query;

    if (req.method === 'GET') {
      if (path === 'summary/monthly') {
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
        return res.json({
          month,
          year,
          totalTransactions: transactions.length,
          totalSpent: transactions.reduce((sum: number, t: any) => sum + t.totalCost, 0),
          transactions
        });
      }

      if (id && path !== 'summary/monthly') {
        const transaction = await Transaction.findById(id)
          .populate('buyer', 'name coffeePreference coffeePrice')
          .populate('participants', 'name coffeePreference coffeePrice');
        if (!transaction) return res.status(404).json({ error: 'Transaction not found' });
        return res.json(transaction);
      }

      const transactions = await Transaction.find()
        .populate('buyer', 'name coffeePreference coffeePrice')
        .populate('participants', 'name coffeePreference coffeePrice')
        .sort({ date: -1 });
      return res.json(transactions);
    }

    if (req.method === 'POST') {
      const { buyer, participants, description, priceOverrides } = req.body;
      const buyerUser = await User.findById(buyer);
      const participantUsers = await User.find({ _id: { $in: participants } });

      if (!buyerUser || participantUsers.length === 0) {
        return res.status(400).json({ error: 'Invalid buyer or participants' });
      }

      let totalCost = 0;
      const participantPrices: { user: string; price: number }[] = [];
      participantUsers.forEach(user => {
        const override = priceOverrides?.[user._id.toString()];
        const price = override !== undefined ? override : user.coffeePrice;
        totalCost += price;
        participantPrices.push({ user: user._id.toString(), price });
      });

      const costPerPerson = totalCost / participantUsers.length;

      const transaction = new Transaction({
        buyer,
        participants,
        participantPrices,
        totalCost,
        costPerPerson,
        description: description || 'Coffee run'
      });

      await transaction.save();

      buyerUser.balance += totalCost;
      buyerUser.timesBought += 1;
      await buyerUser.save();

      for (const user of participantUsers) {
        const pp = participantPrices.find(p => p.user === user._id.toString());
        const individualPrice = pp ? pp.price : costPerPerson;
        user.balance -= individualPrice;
        user.coffeesDrank += 1;
        user.loyaltyCount += 1;
        if (user.loyaltyCount === 8) {
          user.balance += user.coffeePrice;
          user.loyaltyCount = 0;
        }
        await user.save();
      }

      const savedTransaction = await Transaction.findById(transaction._id)
        .populate('buyer', 'name coffeePreference coffeePrice')
        .populate('participants', 'name coffeePreference coffeePrice');

      return res.status(201).json(savedTransaction);
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (error: any) {
    console.error('Transactions API error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
};
