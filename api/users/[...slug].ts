import { VercelRequest, VercelResponse } from '@vercel/node';
import mongoose from 'mongoose';
import User from '../models/User';

const connectDB = async () => {
  if (mongoose.connections[0].readyState === 1) return;
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/coffee-tracker');
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
    const id = slug?.[0];

    if (req.method === 'GET') {
      if (path === 'suggest/next-buyer') {
        const users = await User.find();
        if (users.length === 0) {
          return res.status(400).json({ error: 'No users found' });
        }
        const userScores = users.map(user => ({
          user,
          fairnessScore: user.balance - (user.timesBought * 10)
        }));
        userScores.sort((a, b) => a.fairnessScore - b.fairnessScore);
        return res.json({
          suggestedBuyer: userScores[0].user,
          reason: `Based on balance ($${userScores[0].user.balance.toFixed(2)}) and purchase history (${userScores[0].user.timesBought} times)`
        });
      }

      if (id && path !== 'suggest/next-buyer') {
        const user = await User.findById(id);
        if (!user) return res.status(404).json({ error: 'User not found' });
        return res.json(user);
      }

      const users = await User.find().sort({ name: 1 });
      return res.json(users);
    }

    if (req.method === 'POST') {
      const user = new User(req.body);
      await user.save();
      return res.status(201).json(user);
    }

    if (req.method === 'PUT') {
      const user = await User.findByIdAndUpdate(id, req.body, { new: true, runValidators: true });
      if (!user) return res.status(404).json({ error: 'User not found' });
      return res.json(user);
    }

    if (req.method === 'DELETE') {
      const user = await User.findByIdAndDelete(id);
      if (!user) return res.status(404).json({ error: 'User not found' });
      return res.json({ message: 'User deleted successfully' });
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (error: any) {
    console.error('Users API error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
};
