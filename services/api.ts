import { GoogleGenAI, Chat } from "@google/genai";
// FIX: Import ChatSession type.
import type { User, Product, Sale, Customer, CustomerTransaction, Expense, CashierSession, CashierTransaction, ChatSession } from '../types';
import { supabase } from './supabaseClient';
import { env } from '../env';

// --- API Implementation with Supabase ---

export const api = {
    async login(email: string, pass: string): Promise<User | null> {
        // FIX: Changed password shorthand to explicit property 'password: pass' to match the function parameter.
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ email, password: pass });
        if (authError || !authData.user) {
            console.error('Login error:', authError?.message);
            return null;
        }

        const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('name, type, market_id')
            .eq('id', authData.user.id)
            .single();

        if (profileError || !profileData) {
            console.error('Profile fetch error:', profileError?.message);
            await supabase.auth.signOut(); // Log out if profile is missing
            return null;
        }

        return {
            id: authData.user.id,
            email: authData.user.email!,
            name: profileData.name,
            type: profileData.type,
            market_id: profileData.market_id,
        };
    },

    async logout() {
        await supabase.auth.signOut();
    },

    // Products
    async getProducts(market_id: number): Promise<Product[]> {
        const { data, error } = await supabase.from('products').select('*').eq('market_id', market_id).order('name');
        if (error) throw new Error(error.message);
        return data || [];
    },
    async addProduct(productData: Omit<Product, 'id'>): Promise<Product> {
        const { data, error } = await supabase.from('products').insert(productData).select().single();
        if (error) throw new Error(error.message);
        return data;
    },
    async updateProduct(id: number, productData: Partial<Product>): Promise<Product> {
        const { data, error } = await supabase.from('products').update(productData).eq('id', id).select().single();
        if (error) throw new Error(error.message);
        return data;
    },
    async deleteProduct(id: number): Promise<void> {
        const { error } = await supabase.from('products').delete().eq('id', id);
        if (error) throw new Error(error.message);
    },

    // Sales
    async getSales(market_id: number): Promise<Sale[]> {
        const { data, error } = await supabase.from('sales').select('*').eq('market_id', market_id).order('created_at', { ascending: false });
        if (error) throw new Error(error.message);
        return data || [];
    },
    async getOpenSales(market_id: number): Promise<Sale[]> {
         const { data, error } = await supabase.from('sales').select('*').eq('market_id', market_id).neq('status', 'completed').order('created_at');
        if (error) throw new Error(error.message);
        return data || [];
    },
    async createOpenSale(saleData: Pick<Sale, 'market_id' | 'operator_id' | 'operator_name' | 'customer_name'>): Promise<Sale> {
        const { data, error } = await supabase.from('sales').insert({ ...saleData, status: 'open', total: 0 }).select().single();
        if (error) throw new Error(error.message);
        return data;
    },
    async addSale(saleData: Omit<Sale, 'id' | 'created_at' | 'order_number'>): Promise<Sale> {
        // Supabase function will handle stock update and credit balance
        const { data, error } = await supabase.rpc('create_sale', {
            p_market_id: saleData.market_id,
            p_operator_id: saleData.operator_id,
            p_operator_name: saleData.operator_name,
            p_customer_id: saleData.customer_id,
            p_customer_name: saleData.customer_name,
            p_items: saleData.items,
            p_total: saleData.total,
            p_payment_method: saleData.payment_method,
            p_received: saleData.received,
            p_change: saleData.change,
            p_status: saleData.status,
            p_discount: saleData.discount
        });
        if (error) throw new Error(error.message);
        return data;
    },
    async updateSale(id: number, saleData: Partial<Sale>): Promise<Sale> {
        const { data, error } = await supabase.from('sales').update(saleData).eq('id', id).select().single();
        if (error) throw new Error(error.message);
        
        // If completing, we need to update stock (ideally in a transaction/function)
        if (saleData.status === 'completed') {
             const { error: stockError } = await supabase.rpc('update_stock_from_sale', { sale_id_arg: id });
             if (stockError) console.error("Stock update failed:", stockError);
        }
        return data;
    },
     async deleteSale(id: number): Promise<void> {
        const { error } = await supabase.from('sales').delete().eq('id', id);
        if (error) throw new Error(error.message);
    },

    // Customers
    async getCustomers(market_id: number): Promise<Customer[]> {
        const { data, error } = await supabase.from('customers').select('*').eq('market_id', market_id).order('name');
        if (error) throw new Error(error.message);
        return data || [];
    },
    async addCustomer(customerData: Omit<Customer, 'id' | 'points' | 'credit_balance'>): Promise<Customer> {
        const { data, error } = await supabase.from('customers').insert({ ...customerData, points: 0, credit_balance: 0 }).select().single();
        if (error) throw new Error(error.message);
        return data;
    },
    async updateCustomer(id: number, customerData: Partial<Customer>): Promise<Customer> {
       const { data, error } = await supabase.rpc('update_customer_points', {
            p_customer_id: id,
            p_points_change: customerData.points || 0,
            p_customer_data: {
                name: customerData.name,
                email: customerData.email,
                phone: customerData.phone,
                cpf: customerData.cpf,
                credit_limit: customerData.credit_limit
            }
       });

        if (error) throw new Error(error.message);
        return data;
    },
    async deleteCustomer(id: number): Promise<void> {
        const { error } = await supabase.from('customers').delete().eq('id', id);
        if (error) throw new Error(error.message);
    },
    async addCustomerPayment(customerId: number, amount: number): Promise<Customer> {
        const { data, error } = await supabase.rpc('add_customer_payment', { p_customer_id: customerId, p_amount: amount });
        if (error) throw new Error(error.message);
        return data;
    },
    async getCustomerTransactions(customerId: number): Promise<CustomerTransaction[]> {
         const { data, error } = await supabase.from('customer_transactions').select('*').eq('customer_id', customerId).order('timestamp', { ascending: false });
        if (error) throw new Error(error.message);
        return data || [];
    },

    // Operators (This is a simplified version, real user management should be in Supabase UI)
    async getOperators(market_id: number): Promise<User[]> {
         const { data, error } = await supabase.from('profiles').select('*').eq('market_id', market_id);
         if (error) throw new Error(error.message);
         // This is incomplete as it doesn't fetch email from auth.users, but good enough for display
         return (data?.map(p => ({...p, email: 'not-loaded@pdv.com'} as User))) || [];
    },
    // FIX: Add missing operator management functions to resolve compile errors.
    async addOperator(operatorData: { name: string; email: string; password?: string; market_id: number }): Promise<User> {
        // NOTE: True user creation isn't possible from the client-side without logging out the current user.
        // This is a placeholder and will throw an error. Manage users in Supabase UI.
        throw new Error("Operator creation from the app is not supported. Please use the Supabase dashboard.");
    },
    async updateOperator(id: string, operatorData: Partial<User> & { password?: string }): Promise<User> {
        if (operatorData.password) {
            // Password update should be done via supabase.auth.updateUser(), not on the profiles table.
            console.warn("Password updates are not handled in this simplified implementation.");
        }
        const { data, error } = await supabase.from('profiles').update({ name: operatorData.name }).eq('id', id).select().single();
        if (error) throw new Error(error.message);
        // Re-create a User object. Email is not updated here.
        const updatedUser = { ...data, email: operatorData.email || 'not-loaded@pdv.com' } as User;
        return updatedUser;
    },
    async deleteOperator(id: string): Promise<void> {
        // NOTE: This only deletes the profile, not the auth.user. This will orphan the user.
        // Proper deletion needs admin privileges on the backend.
        const { error } = await supabase.from('profiles').delete().eq('id', id);
        if (error) throw new Error(error.message);
    },
    
    // Expenses
    async getExpenses(market_id: number): Promise<Expense[]> {
        const { data, error } = await supabase.from('expenses').select('*').eq('market_id', market_id).order('date', { ascending: false });
        if (error) throw new Error(error.message);
        return data || [];
    },
    async addExpense(expenseData: Omit<Expense, 'id'>): Promise<Expense> {
        const { data, error } = await supabase.from('expenses').insert(expenseData).select().single();
        if (error) throw new Error(error.message);
        return data;
    },
    async updateExpense(id: number, expenseData: Partial<Expense>): Promise<Expense> {
        const { data, error } = await supabase.from('expenses').update(expenseData).eq('id', id).select().single();
        if (error) throw new Error(error.message);
        return data;
    },
    async deleteExpense(id: number): Promise<void> {
        const { error } = await supabase.from('expenses').delete().eq('id', id);
        if (error) throw new Error(error.message);
    },

    // --- Cashier API ---
    async getActiveCashierSession(operator_id: string): Promise<CashierSession | null> {
         const { data, error } = await supabase.from('cashier_sessions').select('*').eq('operator_id', operator_id).eq('status', 'open').maybeSingle();
        if (error) throw new Error(error.message);
        return data;
    },
    async startCashierSession(sessionData: Omit<CashierSession, 'id' | 'status'>): Promise<CashierSession> {
        const { data, error } = await supabase.from('cashier_sessions').insert({ ...sessionData, status: 'open' }).select().single();
        if (error) throw new Error(error.message);
        return data;
    },
    async addCashierTransaction(sessionId: number, transaction: Omit<CashierTransaction, 'id' | 'timestamp' | 'session_id'>): Promise<CashierSession> {
        await supabase.from('cashier_transactions').insert({ ...transaction, session_id: sessionId });
        // Refetch the session to get updated summary data
        const { data, error } = await supabase.from('cashier_sessions').select('*').eq('id', sessionId).single();
        if(error) throw new Error(error.message);
        return data;
    },
    async closeCashierSession(sessionId: number, closing_balance: number): Promise<CashierSession> {
        const { data, error } = await supabase.rpc('close_cashier', { p_session_id: sessionId, p_closing_balance: closing_balance });
        if (error) throw new Error(error.message);
        return data;
    },
    async getCashierHistory(market_id: number): Promise<CashierSession[]> {
        const { data, error } = await supabase.from('cashier_sessions').select('*').eq('market_id', market_id).eq('status', 'closed').order('start_time', { ascending: false });
        if (error) throw new Error(error.message);
        return data || [];
    },
};

// --- Gemini Service ---
class GeminiService {
    ai: GoogleGenAI | null = null;
    apiKey: string | undefined = env.VITE_GEMINI_API_KEY;

    constructor() {
        try {
            if (this.apiKey) {
                this.ai = new GoogleGenAI({ apiKey: this.apiKey });
            } else {
                 console.warn("Gemini API key not found in VITE_GEMINI_API_KEY. Using mock service.");
            }
        } catch (e) {
            console.error("Could not initialize GoogleGenAI. AI features will be disabled.", e);
        }
    }
    
    getMockFinancialInsights(data: any): string {
        return `
### **Análise Financeira (Demonstração)**

**Resumo Geral:**
Seu faturamento de **R$ ${data.totalRevenue.toFixed(2)}** é sólido. Após deduzir os custos dos produtos (R$ ${data.totalCosts.toFixed(2)}) e outras despesas (R$ ${data.totalExpenses.toFixed(2)}), seu lucro líquido é de **R$ ${data.totalProfit.toFixed(2)}**. Isso indica uma boa saúde financeira para o período.

**Recomendações:**
1.  **Controle de Despesas:** Fique de olho nas despesas variáveis para maximizar seu lucro.
2.  **Crie Combos:** Ofereça pacotes com seus produtos mais vendidos para aumentar o ticket médio.

*Nota: Esta é uma análise de demonstração. Configure a chave VITE_GEMINI_API_KEY para obter insights em tempo real.*
        `;
    }

    async getFinancialInsights(data: any): Promise<string> {
        if (!this.ai) return this.getMockFinancialInsights(data);
        
        const prompt = `
            Analyze the following financial data for a small market and provide insights in Portuguese.
            The analysis should be concise, easy to understand for a non-expert, and actionable.
            Format the output using markdown (e.g., bold for titles, bullet points for lists).

            Data:
            - Total Revenue: R$ ${data.totalRevenue.toFixed(2)}
            - Total Costs (from sold goods): R$ ${data.totalCosts.toFixed(2)}
            - Total Other Expenses: R$ ${data.totalExpenses.toFixed(2)}
            - Net Profit: R$ ${data.totalProfit.toFixed(2)}
            - Top 5 Products (by revenue): ${data.topProducts.map((p: any) => `${p.name} (Revenue: R$ ${p.revenue.toFixed(2)}, Profit: R$ ${p.profit.toFixed(2)})`).join(', ')}
            - Sales by Hour: ${data.salesByHour.map((h: any) => `${h.hour}: ${h.sales} sales`).join(', ')}

            Based on this data, provide:
            1.  **Resumo Geral:** A quick summary of the financial health, commenting on revenue, expenses, and the final net profit.
            2.  **Principais Produtos:** Comment on the top products. Are they profitable? Any suggestions?
            3.  **Horários de Pico:** Analyze the sales by hour and suggest staffing or marketing strategies.
            4.  **Recomendações:** Two or three concrete recommendations for the business owner to increase profit or reduce costs.
        `;

        try {
            const response = await this.ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
            });
            return response.text;
        } catch (e) {
            console.error("Error calling Gemini API:", e);
            return "Erro ao gerar insights. Verifique sua chave de API e a conexão. Tente novamente mais tarde.";
        }
    }

    async startChatSession(marketId: number): Promise<ChatSession | null> {
        if (!this.ai) return null;

        const marketProducts = await api.getProducts(marketId);
        const marketSales = await api.getSales(marketId);

        const chat = this.ai.chats.create({
            model: 'gemini-2.5-flash',
            config: {
                systemInstruction: `
                    You are Marky, a helpful virtual assistant for PDVMarket Cloud, a point-of-sale system.
                    You are talking to a store owner or operator. Your tone should be friendly, helpful, and professional.
                    You have access to the store's data (products and recent sales).
                    Answer questions based on the provided data. If you don't have the information, say so.
                    Do not invent data. You can perform calculations based on the data.
                    Keep your answers concise. Always respond in Brazilian Portuguese.

                    Here is the store's data:
                    PRODUCTS:
                    ${marketProducts.map(p => `- ${p.name} (ID: ${p.id}, Price: R$${p.price.toFixed(2)}, Stock: ${p.stock})`).join('\n')}

                    RECENT SALES:
                    ${marketSales.slice(0, 10).map(s => `- Order #${s.order_number}, Total: R$${s.total.toFixed(2)}, Items: ${s.items.map(i => `${i.qty}x ${i.name}`).join(', ')}`).join('\n')}
                `,
            },
        });
        
        return {
            chat,
            marketData: {
                products: marketProducts,
                sales: marketSales
            }
        };
    }
}

export const geminiService = new GeminiService();