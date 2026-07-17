export interface User {
  _id: string;
  name: string;
  coffeePreference: string;
  coffeePrice: number;
  balance: number;
  timesBought: number;
  coffeesDrank: number;
  loyaltyCount: number;
  freeCoffeesUsed: number;
  addons: string[];
  createdAt: string;
}

export interface ParticipantPrice {
  user: string;
  price: number;
  isFreeCoffee?: boolean;
  freeCoffeeValue?: number;
}

export interface Transaction {
  _id: string;
  date: string;
  buyer: User;
  participants: User[];
  participantPrices?: ParticipantPrice[];
  totalCost: number;
  costPerPerson: number;
  description: string;
}

export interface SuggestedBuyer {
  suggestedBuyer: User;
  reason: string;
}
