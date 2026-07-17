import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import userRoutes from './routes/users.js';
import transactionRoutes from './routes/transactions.js';
import adminRoutes from './routes/admin.js';

dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB Connection
let cachedConn: typeof mongoose | null = null;
async function connectDB() {
  if (cachedConn) return cachedConn;
  cachedConn = await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/coffee-tracker');
  console.log('Connected to MongoDB');
  return cachedConn;
}
connectDB().catch((err) => console.error('MongoDB connection error:', err));

// Routes
app.use('/api/users', userRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/admin', adminRoutes);

app.get('/api/health', (_req: any, res: any) => {
  res.json({ status: 'ok', message: 'WhoPays API is running' });
});

// Only listen on port for local dev (not serverless)
if (process.env.VERCEL !== '1') {
  const PORT = process.env.PORT || 5001;
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

export default app;
