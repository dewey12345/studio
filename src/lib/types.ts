
export type Color = 'Red' | 'Green' | 'Violet';
export type BigSmall = 'Big' | 'Small';
export type BetType = 'Color' | 'Number' | 'BigSmall';
export type Difficulty = 'easy' | 'moderate' | 'hard';

export interface Bet {
  type: BetType;
  value: Color | BigSmall | number;
  amount: number;
  payout?: number;
  userId: string;
  timestamp: number;
  userAgent?: string;
}

export interface RoundResult {
  id: string;
  winningNumber: number;
  bets: Bet[];
  totalPayout: number;
}

export type Totals = {
  [key in Color]: number;
};

export interface User {
  id:string;
  email: string;
  phone?: string;
  password?: string;
  role: 'admin' | 'user';
  balance: number;
}

export interface SupportTicket {
    id: string;
    userId: string;
    userEmail: string;
    category: 'Deposit/Withdraw' | 'Betting Related' | 'Other';
    description: string;
    status: 'pending' | 'resolved';
    timestamp: string;
}

export interface WithdrawalRequest {
    id: string;
    userId: string;
    userEmail: string;
    amount: number;
    status: 'pending' | 'sent';
    timestamp: string;
}

export interface GameSettings {
    difficulty: Difficulty;
    manualWinner?: number;
    manualWinnerColor?: Color;
    manualWinnerSize?: BigSmall;
}

export interface LeaderboardEntry {
    userId: string;
    userName: string;
    totalWinnings: number;
}

export interface PaymentSettings {
    qrCodeUrl: string;
    telegramUrl: string;
}
