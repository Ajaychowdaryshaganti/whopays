# WhoPays

A fair coffee expense tracking system for teams using MongoDB, Express, React, and TypeScript.

## Features

- **PIN Lock**: App protected by PIN (0571)
- **Team Management**: Add/edit team members with coffee preferences, add-ons, and price overrides
- **Daily Tracking**: Record who bought coffee and who was present
- **Fair Rotation**: Intelligent algorithm suggests who should buy next based on balance and purchase history
- **Per-Person Pricing**: Each person's actual coffee price is tracked (not equal split)
- **Add-ons**: Full add-ons menu with Australian cafe pricing
- **Spending Breakdown**: See who spent on whom by week/month/year
- **Balance Tracking**: Automatic calculation of who owes or is owed money
- **Loyalty System**: Every 8th coffee is free (loyalty card logic)
- **Admin Panel**: PIN-protected admin access (110125) to clear transactions, reset balances, and manage data
- **Transaction History**: Complete history with CSV export

## Tech Stack

- **Frontend**: React + TypeScript + Vite + TailwindCSS
- **Backend**: Node.js + Express + TypeScript (Vercel Serverless)
- **Database**: MongoDB with Mongoose

## Prerequisites

- Node.js (v18 or higher)
- MongoDB (local installation or MongoDB Atlas connection)

## Local Development

1. Install dependencies:
```bash
npm install
```

2. Create `.env` file:
```bash
cp .env.example .env
# Edit .env with your MongoDB connection string
```

3. Run the application:
```bash
# Run both frontend and backend together
npm run dev:all

# Or run separately:
npm run server    # Backend on port 5001
npm run dev       # Frontend on port 5173
```

4. Open your browser to `http://localhost:5173`

## Deploy to Vercel

1. Push your code to GitHub

2. Go to [vercel.com](https://vercel.com) and import your repository

3. Add environment variable in Vercel project settings:
   - `MONGODB_URI` = your MongoDB Atlas connection string

4. Deploy — Vercel will automatically:
   - Build the frontend with `npm run build` (outputs to `dist/`)
   - Serve the Express API as a serverless function at `/api/*`
   - Route all `/api/*` requests through `api/index.ts`

## API Endpoints

### Users
- `GET /api/users` - Get all users
- `POST /api/users` - Create user
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user
- `GET /api/users/suggest/next-buyer` - Get suggested next buyer

### Transactions
- `GET /api/transactions` - Get all transactions
- `POST /api/transactions` - Create transaction (with per-participant prices)
- `GET /api/transactions/summary/monthly?month=X&year=Y` - Get monthly summary

### Admin (requires `x-admin-pin` header)
- `POST /api/admin/verify` - Verify admin PIN
- `DELETE /api/admin/transactions/:id` - Delete transaction (reverses balances)
- `DELETE /api/admin/transactions` - Clear all transactions
- `POST /api/admin/reset-balances` - Reset all user balances to 0
- `POST /api/admin/reset-all` - Clear all transactions and reset balances
- `DELETE /api/admin/users/:id` - Delete user

## License

MIT
