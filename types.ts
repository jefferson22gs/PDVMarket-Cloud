import type { Chat } from "@google/genai";

export interface User {
    id: string; // Changed from number to string for Supabase auth UUID
    name: string;
    email: string;
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
    id: number; // Changed from string to number for serial primary key
    market_id: number;
    name: string;
    code: string;
    price: number;
    cost: number;
    stock: number;
    expiry_date?: string | null; // YYYY-MM-DD format
}

export interface CartItem extends Product {
    qty: number;
}

export type PaymentMethod = 'money' | 'credit' | 'debit' | 'pix' | 'credit_account';

export type SaleStatus = 'open' | 'pending' | 'preparing' | 'ready' | 'completed';

export interface Sale {
    id: number; // Changed from string to number
    market_id: number;
    order_number: number;
    items: { id: number; name: string; price: number; qty: number; }[]; // item id is number
    total: number;
    payment_method: PaymentMethod;
    received: number;
    change: number;
    status: SaleStatus;
    operator_id: string; // references user UUID
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
    id: number; // Changed from string to number
    customer_id: number;
    type: 'payment' | 'purchase';
    amount: number;
    timestamp: string; // ISO string
    related_sale_id?: number | null; // Changed from string to number
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
    id: number; // Changed from string to number
    session_id: number; // Foreign key to CashierSession
    type: 'suprimento' | 'sangria' | 'sale';
    amount: number;
    payment_method?: PaymentMethod;
    timestamp: string; // ISO string
    notes?: string;
}

export interface CashierSession {
    id: number; // Changed from string to number
    market_id: number;
    operator_id: string; // references user UUID
    operator_name: string;
    start_time: string; // ISO string
    end_time?: string | null; // ISO string
    opening_balance: number;
    closing_balance?: number | null;
    calculated_sales_total: number;
    calculated_closing_balance?: number | null;
    difference?: number | null;
    status: 'open' | 'closed';
    transactions?: CashierTransaction[]; // Made optional as we might not always load them
}

export interface Expense {
    id: number; // Changed from string to number
    market_id: number;
    description: string;
    amount: number;
    category: string;
    date: string; // YYYY-MM-DD format
}

export interface OperatorPerformance {
    operatorName: string;
    totalRevenue: number;
    totalProfit: number;
    saleCount: number;
    averageTicket: number;
    itemsSold: number;
}