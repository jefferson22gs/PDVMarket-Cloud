import { GoogleGenAI, Chat } from "@google/genai";
import type { User, Product, Sale, Customer, SaleStatus, PaymentMethod, ChatSession } from '../types';

// Mock Data
const mockUsers: User[] = [
    { id: 1, name: 'Dono da Loja', email: 'dono@pdv.com', password: '123', type: 'owner', market_id: 1 },
    { id: 2, name: 'João Operador', email: 'joao@pdv.com', password: '123', type: 'operator', market_id: 1 },
];

const mockProducts: Product[] = [
    { id: 'p1', market_id: 1, name: 'Coca-Cola 2L', code: '7894900011517', price: 9.50, cost: 6.00, stock: 50 },
    { id: 'p2', market_id: 1, name: 'Salgadinho Doritos', code: '7892840252609', price: 8.75, cost: 5.50, stock: 30 },
    { id: 'p3', market_id: 1, name: 'Chocolate Lacta', code: '7622300991399', price: 6.00, cost: 3.50, stock: 120 },
    { id: 'p4', market_id: 1, name: 'Pão de Forma', code: '7896066300762', price: 7.20, cost: 4.00, stock: 8 },
    { id: 'p5', market_id: 1, name: 'Leite Integral 1L', code: '7891000311354', price: 4.50, cost: 3.20, stock: 40 },
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
        operator_name: 'João Operador',
        created_at: createdAt.toISOString(),
    };
});

const mockCustomers: Customer[] = [
    { id: 1, market_id: 1, name: 'Maria Silva', email: 'maria@email.com', phone: '11999998888', cpf: '123.456.789-00' },
    { id: 2, market_id: 1, name: 'José Santos', email: 'jose@email.com', phone: '11988887777', cpf: '987.654.321-00' },
];


// --- API Simulation ---
let users: User[] = [...mockUsers];
let products: Product[] = [...mockProducts];
let sales: Sale[] = [...mockSales];
let customers: Customer[] = [...mockCustomers];
let saleCounter = sales.length + 1000;

const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

export const api = {
    async login(email: string, pass: string): Promise<User | null> {
        await delay(500);
        const user = users.find(u => u.email === email && u.password === pass);
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
    async addSale(saleData: Omit<Sale, 'id' | 'created_at' | 'order_number'>): Promise<Sale> {
        await delay(500);
        const newSale: Sale = {
            ...saleData,
            id: `s${Date.now()}`,
            created_at: new Date().toISOString(),
            order_number: ++saleCounter,
        };
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
    async updateSaleStatus(id: string, status: SaleStatus): Promise<Sale> {
        await delay(200);
        sales = sales.map(s => s.id === id ? { ...s, status } : s);
        return sales.find(s => s.id === id)!;
    },

    // Customers
    async getCustomers(market_id: number): Promise<Customer[]> {
        await delay(300);
        return customers.filter(c => c.market_id === market_id);
    },
    async addCustomer(customerData: Omit<Customer, 'id'>): Promise<Customer> {
        await delay(400);
        const newCustomer: Customer = { ...customerData, id: Date.now() };
        customers.push(newCustomer);
        return newCustomer;
    },
    async updateCustomer(id: number, customerData: Partial<Omit<Customer, 'id' | 'market_id'>>): Promise<Customer> {
        await delay(400);
        customers = customers.map(c => c.id === id ? { ...c, ...customerData } : c);
        return customers.find(c => c.id === id)!;
    },
    async deleteCustomer(id: number): Promise<void> {
        await delay(400);
        customers = customers.filter(c => c.id !== id);
    },

    // Operators
    async getOperators(market_id: number): Promise<User[]> {
        await delay(300);
        return users.filter(u => u.market_id === market_id && u.type === 'operator');
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
Seu faturamento de **R$ ${data.totalRevenue.toFixed(2)}** é sólido, com um lucro estimado de **R$ ${data.totalProfit.toFixed(2)}**. Isso indica uma boa saúde financeira para o período.

**Principais Produtos:**
Seus produtos mais vendidos, como **${data.topProducts[0]?.name}**, estão gerando a maior parte da receita. Continue garantindo o estoque desses itens.

**Horários de Pico:**
Parece haver um aumento nas vendas por volta das **${data.salesByHour.reduce((prev: any, current: any) => (prev.sales > current.sales) ? prev : current, {hour: 'N/A'}).hour}**, considere reforçar a equipe nesse período.

**Recomendações:**
1.  **Crie Combos:** Ofereça pacotes com seus produtos mais vendidos para aumentar o ticket médio.
2.  **Promoções Direcionadas:** Crie promoções nos horários de menor movimento para atrair mais clientes.

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
            - Total Profit: R$ ${data.totalProfit.toFixed(2)}
            - Top 5 Products (by revenue): ${data.topProducts.map((p: any) => `${p.name} (Revenue: R$ ${p.revenue.toFixed(2)}, Profit: R$ ${p.profit.toFixed(2)})`).join(', ')}
            - Sales by Hour: ${data.salesByHour.map((h: any) => `${h.hour}: ${h.sales} sales`).join(', ')}

            Based on this data, provide:
            1.  **Resumo Geral:** A quick summary of the financial health.
            2.  **Principais Produtos:** Comment on the top products. Are they profitable? Any suggestions?
            3.  **Horários de Pico:** Analyze the sales by hour and suggest staffing or marketing strategies.
            4.  **Recomendações:** Two or three concrete recommendations for the business owner.
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
