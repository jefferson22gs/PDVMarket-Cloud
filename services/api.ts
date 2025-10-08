import { GoogleGenAI, Chat } from "@google/genai";
import type { User, Product, Sale, Customer, SaleStatus, PaymentMethod, ChatSession, CashierSession, CashierTransaction, CartItem, CustomerTransaction, Expense } from '../types';

// Mock Data
const mockUsers: User[] = [
    { id: 1, name: 'Dono da Loja', email: 'dono@pdv.com', password: '123', type: 'owner', market_id: 1 },
    { id: 2, name: 'João Operador', email: 'joao@pdv.com', password: '123', type: 'operator', market_id: 1 },
];

const mockProducts: Product[] = [
    { id: 'p1', market_id: 1, name: 'Coca-Cola 2L', code: '7894900011517', price: 9.50, cost: 6.00, stock: 50, expiry_date: '2025-12-31' },
    { id: 'p2', market_id: 1, name: 'Salgadinho Doritos', code: '7892840252609', price: 8.75, cost: 5.50, stock: 30, expiry_date: '2025-08-20' },
    { id: 'p3', market_id: 1, name: 'Chocolate Lacta', code: '7622300991399', price: 6.00, cost: 3.50, stock: 120, expiry_date: '2026-01-15' },
    { id: 'p4', market_id: 1, name: 'Pão de Forma', code: '7896066300762', price: 7.20, cost: 4.00, stock: 8, expiry_date: new Date(Date.now() + 5 * 86400000).toISOString().split('T')[0] },
    { id: 'p5', market_id: 1, name: 'Leite Integral 1L', code: '7891000311354', price: 4.50, cost: 3.20, stock: 40, expiry_date: new Date(Date.now() + 25 * 86400000).toISOString().split('T')[0] },
];

const mockExpenses: Expense[] = [
    { id: 'e1', market_id: 1, description: 'Aluguel da Loja', amount: 1500.00, category: 'Fixo', date: new Date(Date.now() - 15 * 86400000).toISOString().split('T')[0] },
    { id: 'e2', market_id: 1, description: 'Conta de Energia', amount: 350.75, category: 'Variável', date: new Date(Date.now() - 10 * 86400000).toISOString().split('T')[0] },
    { id: 'e3', market_id: 1, description: 'Compra de Estoque - Fornecedor X', amount: 850.00, category: 'Custo', date: new Date(Date.now() - 5 * 86400000).toISOString().split('T')[0] },
];

const mockSales: Sale[] = Array.from({ length: 50 }, (_, i) => {
    const itemsCount = Math.floor(Math.random() * 3) + 1;
    const items = Array.from({ length: itemsCount }, () => {
        const product = mockProducts[Math.floor(Math.random() * mockProducts.length)];
        const qty = Math.floor(Math.random() * 3) + 1;
        return { id: product.id, name: product.name, price: product.price, qty };
    });
    const total = items.reduce((sum, item) => sum + item.price * item.qty, 0);
    const paymentMethods: PaymentMethod[] = ['money', 'credit', 'debit', 'pix'];
    const createdAt = new Date();
    createdAt.setDate(createdAt.getDate() - (i % 30));
    createdAt.setHours(Math.floor(Math.random() * 24));


    return {
        id: `s${i + 1}`,
        market_id: 1,
        order_number: 1001 + i,
        items,
        total,
        payment_method: paymentMethods[Math.floor(Math.random() * paymentMethods.length)],
        received: total,
        change: 0,
        status: (['pending', 'preparing', 'ready', 'completed'] as SaleStatus[])[i % 4],
        operator_name: i % 3 === 0 ? 'Dono da Loja' : 'João Operador', // Assign sales to different operators
        created_at: createdAt.toISOString(),
    };
});

const mockCustomers: Customer[] = [
    { id: 1, market_id: 1, name: 'Maria Silva', email: 'maria@email.com', phone: '11999998888', cpf: '123.456.789-00', points: 150, credit_limit: 200.00, credit_balance: 55.50 },
    { id: 2, market_id: 1, name: 'José Santos', email: 'jose@email.com', phone: '11988887777', cpf: '987.654.321-00', points: 85, credit_limit: 100.00, credit_balance: 0.00 },
];

let mockCustomerTransactions: CustomerTransaction[] = [
    { id: 'ct1', customer_id: 1, type: 'purchase', amount: 35.50, timestamp: new Date(Date.now() - 86400000 * 5).toISOString(), related_sale_id: 's-mock-1' },
    { id: 'ct2', customer_id: 1, type: 'purchase', amount: 20.00, timestamp: new Date(Date.now() - 86400000 * 2).toISOString(), related_sale_id: 's-mock-2' },
];

// --- API Simulation ---
let users: User[] = [...mockUsers];
let products: Product[] = [...mockProducts];
let sales: Sale[] = [...mockSales];
let customers: Customer[] = [...mockCustomers];
let expenses: Expense[] = [...mockExpenses];
let customerTransactions: CustomerTransaction[] = [...mockCustomerTransactions];
let saleCounter = sales.length + 1000;

// --- MOCK DATA FOR CASHIER ---
let cashierSessions: CashierSession[] = [];
let activeCashierSession: CashierSession | null = null;
let sessionCounter = 1;


const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

export const api = {
    async login(email: string, pass: string): Promise<User | null> {
        await delay(500);
        const user = users.find(u => u.email === email && u.password === pass);
        // Reset cashier on login for mock purposes
        if (user && activeCashierSession?.operator_id !== user.id) {
            activeCashierSession = null;
        }
        return user ? { ...user } : null;
    },

    // Products
    async getProducts(market_id: number): Promise<Product[]> {
        await delay(300);
        return products.filter(p => p.market_id === market_id);
    },
    async addProduct(productData: Omit<Product, 'id'>): Promise<Product> {
        await delay(400);
        const newProduct: Product = { ...productData, id: `p${Date.now()}` };
        products.push(newProduct);
        return newProduct;
    },
    async updateProduct(id: string, productData: Partial<Omit<Product, 'id' | 'market_id'>>): Promise<Product> {
        await delay(400);
        products = products.map(p => p.id === id ? { ...p, ...productData } : p);
        return products.find(p => p.id === id)!;
    },
    async deleteProduct(id: string): Promise<void> {
        await delay(400);
        products = products.filter(p => p.id !== id);
    },

    // Sales
    async getSales(market_id: number): Promise<Sale[]> {
        await delay(300);
        return sales.filter(s => s.market_id === market_id).sort((a,b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    },
    async getOpenSales(market_id: number): Promise<Sale[]> {
        await delay(300);
        return sales.filter(s => s.market_id === market_id && s.status !== 'completed').sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    },
    async createOpenSale(saleData: Pick<Sale, 'market_id' | 'operator_name' | 'customer_name'>): Promise<Sale> {
        await delay(500);
        const newSale: Sale = {
            ...saleData,
            id: `s${Date.now()}`,
            created_at: new Date().toISOString(),
            order_number: ++saleCounter,
            status: 'open',
            items: [],
            total: 0,
            payment_method: 'money',
            received: 0,
            change: 0,
        };
        sales.unshift(newSale);
        return newSale;
    },
    async addSale(saleData: Omit<Sale, 'id' | 'created_at' | 'order_number'>): Promise<Sale> {
        await delay(500);
        const newSale: Sale = {
            ...saleData,
            id: `s${Date.now()}`,
            created_at: new Date().toISOString(),
            order_number: ++saleCounter,
        };
        
        // Handle credit account sales
        if (newSale.payment_method === 'credit_account') {
            const customer = customers.find(c => c.id === newSale.customer_id);
            if (!customer) throw new Error("Cliente não encontrado para venda a prazo.");
            if (customer.credit_balance + newSale.total > customer.credit_limit) {
                throw new Error("Limite de crédito excedido.");
            }
            customer.credit_balance += newSale.total;
            customerTransactions.unshift({
                id: `ct-sale-${newSale.id}`,
                customer_id: customer.id,
                type: 'purchase',
                amount: newSale.total,
                timestamp: newSale.created_at,
                related_sale_id: newSale.id
            });
        }
        
        sales.unshift(newSale); // Add to the beginning
        // Update stock
        newSale.items.forEach(item => {
            const product = products.find(p => p.id === item.id);
            if(product) {
                product.stock -= item.qty;
            }
        });
        return newSale;
    },
    async updateSale(id: string, saleData: Partial<Omit<Sale, 'id' | 'market_id'>>): Promise<Sale> {
        await delay(200);
        let saleToUpdate: Sale | undefined;
        const originalSale = sales.find(s => s.id === id);

        sales = sales.map(s => {
            if (s.id === id) {
                saleToUpdate = { ...s, ...saleData };
                return saleToUpdate;
            }
            return s;
        });

        if (!saleToUpdate) throw new Error("Sale not found");
        
        // Handle stock update on completion
        if (saleData.status === 'completed' && originalSale?.status !== 'completed') {
             saleToUpdate.items.forEach(item => {
                const product = products.find(p => p.id === item.id);
                if (product) {
                    product.stock -= item.qty;
                }
            });
        }
        
        return saleToUpdate;
    },
     async deleteSale(id: string): Promise<void> {
        await delay(400);
        sales = sales.filter(s => s.id !== id);
    },

    // Customers
    async getCustomers(market_id: number): Promise<Customer[]> {
        await delay(300);
        return customers.filter(c => c.market_id === market_id);
    },
    async addCustomer(customerData: Omit<Customer, 'id' | 'points' | 'credit_balance'>): Promise<Customer> {
        await delay(400);
        const newCustomer: Customer = { ...customerData, id: Date.now(), points: 0, credit_balance: 0 };
        customers.push(newCustomer);
        return newCustomer;
    },
    async updateCustomer(id: number, customerData: Partial<Omit<Customer, 'id' | 'market_id'>>): Promise<Customer> {
        await delay(400);
        let updatedCustomer: Customer | undefined;
        customers = customers.map(c => {
             if (c.id === id) {
                const currentPoints = c.points || 0;
                const pointsChange = customerData.points || 0;
                const newPoints = pointsChange < 0 ? currentPoints + pointsChange : currentPoints + pointsChange;
                
                updatedCustomer = { ...c, ...customerData, points: newPoints };
                return updatedCustomer;
             }
             return c;
        });
        
        if (!updatedCustomer) throw new Error('Customer not found');
        return updatedCustomer;
    },
    async deleteCustomer(id: number): Promise<void> {
        await delay(400);
        customers = customers.filter(c => c.id !== id);
    },
    async addCustomerPayment(customerId: number, amount: number): Promise<Customer> {
        await delay(500);
        const customer = customers.find(c => c.id === customerId);
        if (!customer) throw new Error("Cliente não encontrado.");
        if (amount <= 0) throw new Error("Valor do pagamento deve ser positivo.");

        customer.credit_balance -= amount;
        if (customer.credit_balance < 0) customer.credit_balance = 0;

        customerTransactions.unshift({
            id: `ct-payment-${Date.now()}`,
            customer_id: customerId,
            type: 'payment',
            amount: amount,
            timestamp: new Date().toISOString(),
            notes: "Pagamento recebido"
        });
        return { ...customer };
    },
    async getCustomerTransactions(customerId: number): Promise<CustomerTransaction[]> {
        await delay(300);
        return customerTransactions.filter(t => t.customer_id === customerId).sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    },


    // Operators
    async getOperators(market_id: number): Promise<User[]> {
        await delay(300);
        return users.filter(u => u.market_id === market_id);
    },
    async addOperator(operatorData: Omit<User, 'id' | 'type'>): Promise<User> {
        await delay(400);
        const newOperator: User = { ...operatorData, id: Date.now(), type: 'operator' };
        users.push(newOperator);
        return newOperator;
    },
    async updateOperator(id: number, operatorData: Partial<Omit<User, 'id' | 'market_id' | 'type'>>): Promise<User> {
        await delay(400);
        users = users.map(u => u.id === id ? { ...u, ...operatorData } : u);
        return users.find(u => u.id === id)!;
    },
    async deleteOperator(id: number): Promise<void> {
        await delay(400);
        users = users.filter(u => u.id !== id);
    },
    
    // --- Expenses API ---
    async getExpenses(market_id: number): Promise<Expense[]> {
        await delay(300);
        return expenses
            .filter(e => e.market_id === market_id)
            .sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    },
    async addExpense(expenseData: Omit<Expense, 'id'>): Promise<Expense> {
        await delay(400);
        const newExpense: Expense = { ...expenseData, id: `e${Date.now()}` };
        expenses.push(newExpense);
        return newExpense;
    },
    async updateExpense(id: string, expenseData: Partial<Omit<Expense, 'id' | 'market_id'>>): Promise<Expense> {
        await delay(400);
        expenses = expenses.map(e => e.id === id ? { ...e, ...expenseData } : e);
        return expenses.find(e => e.id === id)!;
    },
    async deleteExpense(id: string): Promise<void> {
        await delay(400);
        expenses = expenses.filter(e => e.id !== id);
    },

    // --- Cashier API ---
    async getActiveCashierSession(operator_id: number): Promise<CashierSession | null> {
        await delay(200);
        if (activeCashierSession && activeCashierSession.operator_id === operator_id) {
            return { ...activeCashierSession, transactions: [...activeCashierSession.transactions] };
        }
        return null;
    },

    async startCashierSession(data: { operator_id: number, operator_name: string, market_id: number, opening_balance: number }): Promise<CashierSession> {
        await delay(500);
        if (activeCashierSession) {
            throw new Error("Já existe uma sessão de caixa aberta.");
        }
        const newSession: CashierSession = {
            id: `cs${sessionCounter++}`,
            market_id: data.market_id,
            operator_id: data.operator_id,
            operator_name: data.operator_name,
            start_time: new Date().toISOString(),
            opening_balance: data.opening_balance,
            status: 'open',
            transactions: [],
            calculated_sales_total: 0,
        };
        activeCashierSession = newSession;
        return { ...activeCashierSession, transactions: [...activeCashierSession.transactions] };
    },

    async addCashierTransaction(sessionId: string, transaction: Omit<CashierTransaction, 'id' | 'timestamp'>): Promise<CashierSession> {
        await delay(100);
        if (!activeCashierSession || activeCashierSession.id !== sessionId) {
            throw new Error("Sessão de caixa não encontrada ou inativa.");
        }
        const newTransaction: CashierTransaction = {
            ...transaction,
            id: `ct${Date.now()}`,
            timestamp: new Date().toISOString(),
        };
        activeCashierSession.transactions.push(newTransaction);
        return { ...activeCashierSession, transactions: [...activeCashierSession.transactions] };
    },

    async closeCashierSession(sessionId: string, closing_balance: number): Promise<CashierSession> {
        await delay(500);
        if (!activeCashierSession || activeCashierSession.id !== sessionId) {
            throw new Error("Sessão de caixa não encontrada ou inativa.");
        }
        
        const suprimentos = activeCashierSession.transactions
            .filter(t => t.type === 'suprimento')
            .reduce((sum, t) => sum + t.amount, 0);

        const sangrias = activeCashierSession.transactions
            .filter(t => t.type === 'sangria')
            .reduce((sum, t) => sum + t.amount, 0);

        const salesInCash = activeCashierSession.transactions
            .filter(t => t.type === 'sale' && t.payment_method === 'money')
            .reduce((sum, t) => sum + t.amount, 0);
            
        const allSalesTotal = activeCashierSession.transactions
            .filter(t => t.type === 'sale')
            .reduce((sum, t) => sum + t.amount, 0);

        const calculated_closing_balance = activeCashierSession.opening_balance + salesInCash + suprimentos - sangrias;
        const difference = closing_balance - calculated_closing_balance;

        const closedSession: CashierSession = {
            ...activeCashierSession,
            status: 'closed',
            end_time: new Date().toISOString(),
            closing_balance,
            calculated_closing_balance,
            calculated_sales_total: allSalesTotal,
            difference,
        };
        
        cashierSessions.push(closedSession);
        activeCashierSession = null;

        return closedSession;
    },
    
    async getCashierHistory(market_id: number): Promise<CashierSession[]> {
        await delay(400);
        return cashierSessions
            .filter(cs => cs.market_id === market_id)
            .sort((a,b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime());
    },
};


// --- Gemini Service ---
class GeminiService {
    ai: GoogleGenAI | null = null;

    constructor() {
        try {
            if (process.env.API_KEY) {
                this.ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            } else {
                 console.warn("Gemini API key not found in process.env.API_KEY. Using mock service.");
            }
        } catch (e) {
            console.error("Could not initialize GoogleGenAI. AI features will be disabled.", e);
        }
    }
    
    // Mock financial insights for when API key is not available
    getMockFinancialInsights(data: any): string {
        return `
### **Análise Financeira (Demonstração)**

**Resumo Geral:**
Seu faturamento de **R$ ${data.totalRevenue.toFixed(2)}** é sólido. Após deduzir os custos dos produtos (R$ ${data.totalCosts.toFixed(2)}) e outras despesas (R$ ${data.totalExpenses.toFixed(2)}), seu lucro líquido é de **R$ ${data.totalProfit.toFixed(2)}**. Isso indica uma boa saúde financeira para o período.

**Principais Produtos:**
Seus produtos mais vendidos, como **${data.topProducts[0]?.name}**, estão gerando a maior parte da receita. Continue garantindo o estoque desses itens.

**Horários de Pico:**
Parece haver um aumento nas vendas por volta das **${data.salesByHour.reduce((prev: any, current: any) => (prev.sales > current.sales) ? prev : current, {hour: 'N/A'}).hour}**, considere reforçar a equipe nesse período.

**Recomendações:**
1.  **Controle de Despesas:** Fique de olho nas despesas variáveis para maximizar seu lucro.
2.  **Crie Combos:** Ofereça pacotes com seus produtos mais vendidos para aumentar o ticket médio.
3.  **Promoções Direcionadas:** Crie promoções nos horários de menor movimento para atrair mais clientes.

*Nota: Esta é uma análise de demonstração. Configure sua chave de API do Gemini para obter insights em tempo real.*
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