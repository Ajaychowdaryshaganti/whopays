export interface User {
  _id: string;
  name: string;
  coffeePreference: string;
  coffeePrice: number;
  balance: number;
  timesBought: number;
  coffeesDrank: number;
  loyaltyCount: number;
  addons: string[];
  createdAt: string;
}

export interface Transaction {
  _id: string;
  date: string;
  buyer: User;
  participants: User[];
  totalCost: number;
  costPerPerson: number;
  description: string;
}

export interface SuggestedBuyer {
  suggestedBuyer: User;
  reason: string;
}
