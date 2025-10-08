import type { Chat } from "@google/genai";

export interface User {
    id: number;
    name: string;
    email: string;
    password?: string;
    type: 'owner' | 'operator';
    market_id: number;
}

export type View = 'login' | 'pdv' | 'admin' | 'kitchen';

export interface ToastMessage {
    id?: number;
    message: string;
    type: 'success' | 'error' | 'info' | 'warning';
    duration?: number;
}

export interface Product {
    id: string;
    market_id: number;
    name: string;
    code: string;
    price: number;
    cost: number;
    stock: number;
}

export interface CartItem extends Product {
    qty: number;
}

export type PaymentMethod = 'money' | 'credit' | 'debit' | 'pix' | 'credit_account';

export type SaleStatus = 'open' | 'pending' | 'preparing' | 'ready' | 'completed';

export interface Sale {
    id: string;
    market_id: number;
    order_number: number;
    items: { id: string; name: string; price: number; qty: number; }[];
    total: number;
    payment_method: PaymentMethod;
    received: number;
    change: number;
    status: SaleStatus;
    operator_name: string;
    customer_id?: number | null;
    customer_name?: string; // Also used for Comanda name
    created_at: string; // ISO string
    discount?: {
        type: 'points' | 'manual';
        amount: number;
        description?: string;
    };
}

export interface Customer {
    id: number;
    market_id: number;
    name: string;
    email: string;
    phone: string;
    cpf: string;
    points: number;
    credit_limit: number;
    credit_balance: number;
}

export interface CustomerTransaction {
    id: string;
    customer_id: number;
    type: 'payment' | 'purchase';
    amount: number;
    timestamp: string; // ISO string
    related_sale_id?: string;
    notes?: string;
}


export interface ChatMessage {
    role: 'user' | 'model';
    text: string;
}

export interface ChatSession {
    chat: Chat;
    marketData: {
        products: Product[];
        sales: Sale[];
    };
}

export interface CashierTransaction {
    id: string;
    type: 'suprimento' | 'sangria' | 'sale';
    amount: number;
    payment_method?: PaymentMethod;
    timestamp: string; // ISO string
    notes?: string;
}

export interface CashierSession {
    id: string;
    market_id: number;
    operator_id: number;
    operator_name: string;
    start_time: string; // ISO string
    end_time?: string; // ISO string
    opening_balance: number;
    closing_balance?: number;
    calculated_sales_total: number;
    calculated_closing_balance?: number;
    difference?: number;
    status: 'open' | 'closed';
    transactions: CashierTransaction[];
}