
import { Bet } from './types';

export const NUMBER_CONFIG: Record<number, { color: 'Red' | 'Green' | 'Violet', size: 'Big' | 'Small', className: string }> = {
    0: { color: 'Violet', size: 'Small', className: 'number-ball-violet' },
    1: { color: 'Green', size: 'Small', className: 'number-ball-green' },
    2: { color: 'Red', size: 'Small', className: 'number-ball-red' },
    3: { color: 'Green', size: 'Small', className: 'number-ball-green' },
    4: { color: 'Red', size: 'Small', className: 'number-ball-red' },
    5: { color: 'Violet', size: 'Big', className: 'number-ball-violet' },
    6: { color: 'Red', size: 'Big', className: 'number-ball-red' },
    7: { color: 'Green', size: 'Big', className: 'number-ball-green' },
    8: { color: 'Red', size: 'Big', className: 'number-ball-red' },
    9: { color: 'Green', size: 'Big', className: 'number-ball-green' },
};

export const ODDS = {
    Color: { Red: 2, Green: 2, Violet: 5 }, // Violet pays less if it's a 0 or 5
    Number: 9,
    BigSmall: 2,
};

export function getNumberDetails(num: number) {
    return NUMBER_CONFIG[num];
}

export function getPayout(bet: Bet, winningNumber: number): number {
    const details = getNumberDetails(winningNumber);
    let payout = 0;

    switch(bet.type) {
        case 'Color':
            if (bet.value === details.color) {
                payout = bet.amount * ODDS.Color[bet.value as 'Red' | 'Green' | 'Violet'];
            }
            break;
        case 'Number':
            if (bet.value === winningNumber) {
                payout = bet.amount * ODDS.Number;
            }
            break;
        case 'BigSmall':
            if (bet.value === details.size) {
                payout = bet.amount * ODDS.BigSmall;
            }
            break;
    }
    return payout;
}

export function getPayoutsByNumber(bets: Bet[]): Map<number, number> {
    const payouts = new Map<number, number>();
    for (let i = 0; i <= 9; i++) {
        let totalPayout = 0;
        bets.forEach(bet => {
            totalPayout += getPayout(bet, i);
        });
        payouts.set(i, totalPayout);
    }
    return payouts;
}
