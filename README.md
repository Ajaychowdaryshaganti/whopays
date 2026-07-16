# Coffee Payment & Rotation Tracker

A fair coffee expense tracking system for teams using MongoDB, Express, React, and TypeScript.

## Features

- **Team Management**: Add team members with their coffee preferences and prices
- **Daily Tracking**: Record who bought coffee and who was present
- **Fair Rotation**: Intelligent algorithm suggests who should buy next based on balance and purchase history
- **Balance Tracking**: Automatic calculation of who owes or is owed money
- **Loyalty System**: Every 8th coffee is free (loyalty card logic)
- **Transaction History**: Complete history of all coffee runs
- **Cost Preview**: See total cost before recording transactions

## Tech Stack

- **Frontend**: React + TypeScript + Vite + TailwindCSS
- **Backend**: Node.js + Express + TypeScript
- **Database**: MongoDB with Mongoose

## Prerequisites

- Node.js (v18 or higher)
- MongoDB (local installation or MongoDB Atlas connection)

## Setup

1. Install dependencies:
```bash
npm install
```

2. Configure MongoDB connection:
   - Copy `.env` file and update `MONGODB_URI` if needed
   - Default: `mongodb://localhost:27017/coffee-tracker`

3. Start MongoDB:
```bash
# If using local MongoDB
mongod
```

4. Run the application:
```bash
# Run both frontend and backend together
npm run dev:all

# Or run separately:
npm run server    # Backend on port 5000
npm run dev       # Frontend on port 5173
```

5. Open your browser to `http://localhost:5173`

## Usage

1. **Add Team Members**: Go to the "Users" tab and add your team members with their coffee preferences
2. **Record Coffee Runs**: Go to the "Transactions" tab to record daily coffee purchases
3. **View Dashboard**: See suggested next buyer, team balances, and recent transactions
4. **Check History**: View complete transaction history in the "History" tab

## API Endpoints

### Users
- `GET /api/users` - Get all users
- `POST /api/users` - Create user
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user
- `GET /api/users/suggest/next-buyer` - Get suggested next buyer

### Transactions
- `GET /api/transactions` - Get all transactions
- `POST /api/transactions` - Create transaction
- `GET /api/transactions/summary/monthly?month=X&year=Y` - Get monthly summary

## License

MIT
