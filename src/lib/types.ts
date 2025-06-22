export type Color = 'Red' | 'Green' | 'Violet';

export interface Bet {
  color: Color;
  amount: number;
  payout?: number;
}

export interface RoundResult {
  winningColor: Color;
  bets: Bet[];
  totalPayout: number;
  winningBets: Bet[];
}

export type Totals = {
  [key in Color]: number;
};

export interface User {
  id: string;
  email: string;
  password?: string;
  role: 'admin' | 'user';
  balance: number;
}
