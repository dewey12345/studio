
'use client';
import { v4 as uuidv4 } from 'uuid';
import type { SupportTicket } from './types';
import { SUPPORT_TICKETS_KEY } from './constants';

const getStoredTickets = (): SupportTicket[] => {
    if(typeof window === 'undefined') return [];
    const ticketsJson = localStorage.getItem(SUPPORT_TICKETS_KEY);
    return ticketsJson ? JSON.parse(ticketsJson) : [];
};

const storeTickets = (tickets: SupportTicket[]) => {
    if(typeof window === 'undefined') return;
    localStorage.setItem(SUPPORT_TICKETS_KEY, JSON.stringify(tickets));
    window.dispatchEvent(new CustomEvent('storage'));
};

export const supportService = {
    createTicket: (data: Omit<SupportTicket, 'id' | 'timestamp' | 'status'>) => {
        const tickets = getStoredTickets();
        const newTicket: SupportTicket = {
            ...data,
            id: uuidv4(),
            timestamp: new Date().toISOString(),
            status: 'pending',
        };
        tickets.unshift(newTicket);
        storeTickets(tickets);
        return newTicket;
    },

    getAllTickets: (): SupportTicket[] => {
        return getStoredTickets();
    },

    getTicketsForUser: (userId: string): SupportTicket[] => {
        const tickets = getStoredTickets();
        return tickets.filter(ticket => ticket.userId === userId);
    },

    updateTicketStatus: (ticketId: string, status: 'pending' | 'resolved') => {
        const tickets = getStoredTickets();
        const ticketIndex = tickets.findIndex(t => t.id === ticketId);
        if (ticketIndex === -1) {
            throw new Error("Ticket not found.");
        }
        tickets[ticketIndex].status = status;
        storeTickets(tickets);
        return tickets[ticketIndex];
    }
};
