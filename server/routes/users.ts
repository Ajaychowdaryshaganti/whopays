import express from 'express';
import User from '../models/User.ts';

const router = express.Router();

// Get all users
router.get('/', async (req, res) => {
  try {
    const users = await User.find().sort({ name: 1 });
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Get suggested next buyer (must be before /:id to avoid route conflict)
router.get('/suggest/next-buyer', async (req, res) => {
  try {
    const users = await User.find();
    
    if (users.length === 0) {
      return res.status(400).json({ error: 'No users found' });
    }

    // Calculate fairness score for each user
    const userScores = users.map(user => {
      const fairnessScore = user.balance - (user.timesBought * 10);
      return {
        user,
        fairnessScore
      };
    });

    // Sort by fairness score (lowest score should buy next)
    userScores.sort((a, b) => a.fairnessScore - b.fairnessScore);

    const suggestedBuyer = userScores[0].user;
    res.json({
      suggestedBuyer,
      reason: `Based on balance ($${suggestedBuyer.balance.toFixed(2)}) and purchase history (${suggestedBuyer.timesBought} times)`
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to suggest next buyer' });
  }
});

// Get single user
router.get('/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// Create user
router.post('/', async (req, res) => {
  try {
    const user = new User(req.body);
    await user.save();
    res.status(201).json(user);
  } catch (error) {
    res.status(400).json({ error: 'Failed to create user' });
  }
});

// Update user
router.put('/:id', async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    res.status(400).json({ error: 'Failed to update user' });
  }
});

// Delete user
router.delete('/:id', async (req, res) => {
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
