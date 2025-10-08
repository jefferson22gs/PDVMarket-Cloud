import React, { useState, useEffect, useMemo } from 'react';
import type { User, Sale, Product, Expense } from '../types';
import { api, geminiService } from '../services/api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';
import { useToast } from '../App';
import { motion } from 'framer-motion';
import { Icon } from './common';

// --- Reusable Components for Dashboard ---

const StatCard: React.FC<{ title: string; value: string; variant?: 'default' | 'warning'; onClick?: () => void; }> = ({ title, value, variant = 'default', onClick }) => (
    <motion.div 
        className={`glass-effect p-6 rounded-xl shadow-lg border border-white/10 ${variant === 'warning' ? 'bg-amber-400/10 dark:bg-amber-500/10' : ''} ${onClick ? 'cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all' : ''}`}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        onClick={onClick}
    >
        <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</h3>
            {variant === 'warning' && <Icon name="exclamation-triangle" className="w-5 h-5 text-amber-500" />}
        </div>
        <p className={`text-3xl font-bold mt-1 ${variant === 'warning' ? 'text-amber-500' : 'text-gray-800 dark:text-gray-100'}`}>{value}</p>
    </motion.div>
);

const ChartContainer: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <motion.div 
        className="glass-effect p-6 rounded-xl shadow-lg border border-white/10 col-span-1 lg:col-span-2"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
    >
        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">{title}</h3>
        <div className="h-72">
            {children}
        </div>
    </motion.div>
);

// --- Main Dashboard Component ---

interface DashboardProps {
    user: User;
    lowStockThreshold: number;
    setActiveTab: (tab: 'dashboard' | 'products' | 'operators' | 'sales' | 'settings' | 'expenses') => void;
}
const Dashboard: React.FC<DashboardProps> = ({ user, lowStockThreshold, setActiveTab }) => {
    const [sales, setSales] = useState<Sale[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [aiInsight, setAiInsight] = useState('');
    const [isInsightLoading, setIsInsightLoading] = useState(false);
    const { addToast } = useToast();

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [salesData, productsData, expensesData] = await Promise.all([
                    api.getSales(user.market_id),
                    api.getProducts(user.market_id),
                    api.getExpenses(user.market_id)
                ]);
                setSales(salesData);
                setProducts(productsData);
                setExpenses(expensesData);
            } catch (error) {
                addToast({ message: 'Erro ao carregar dados do dashboard.', type: 'error'});
            }
        };
        fetchData();
    }, [user.market_id, addToast]);

    const dashboardData = useMemo(() => {
        const totalRevenue = sales.reduce((sum, sale) => sum + sale.total, 0);
        const totalCosts = sales.reduce((sum, sale) => {
            const saleCost = sale.items.reduce((itemSum, item) => {
                const product = products.find(p => p.id === item.id);
                const cost = product ? product.cost : 0;
                return itemSum + cost * item.qty;
            }, 0);
            return sum + saleCost;
        }, 0);
        const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0);
        const totalProfit = totalRevenue - totalCosts - totalExpenses;


        const salesByDay = sales.reduce((acc: { [key: string]: number }, sale) => {
            const date = new Date(sale.created_at).toLocaleDateString('pt-BR');
            acc[date] = (acc[date] || 0) + sale.total;
            return acc;
        }, {});

        const chartData = Object.entries(salesByDay)
            .map(([name, Vendas]) => ({ name, Vendas: parseFloat(Vendas.toFixed(2)) }))
            .reverse();
        
        const salesByHour = sales.reduce((acc: {[key: string]: number}, sale) => {
            const hour = new Date(sale.created_at).getHours().toString().padStart(2, '0');
            acc[hour] = (acc[hour] || 0) + 1;
            return acc;
        }, {});
        
        const salesByHourChart = Object.entries(salesByHour)
             .map(([hour, sales]) => ({ hour: `${hour}:00`, sales }))
             .sort((a,b) => a.hour.localeCompare(b.hour));


        const productSales = sales.flatMap(s => s.items).reduce((acc: { [key: string]: number }, item) => {
            acc[item.id] = (acc[item.id] || 0) + item.price * item.qty;
            return acc;
        }, {});

        const topProducts = Object.entries(productSales)
            .map(([id, revenue]) => {
                const product = products.find(p => p.id === id);
                return { name: product?.name || 'Desconhecido', revenue };
            })
            .sort((a, b) => b.revenue - a.revenue)
            .slice(0, 5);
        
        const topProductsForAI = Object.entries(productSales).map(([id, revenue]) => {
                const product = products.find(p => p.id === id);
                const profit = product ? (product.price - product.cost) * (revenue/product.price) : 0;
                return { name: product?.name || 'Desconhecido', revenue, profit };
            })
            .sort((a, b) => b.revenue - a.revenue)
            .slice(0, 5);
        
        const lowStockProducts = products.filter(p => p.stock <= lowStockThreshold);


        return { totalRevenue, totalProfit, totalExpenses, totalCosts, chartData, topProducts, salesByHourChart, topProductsForAI, lowStockProducts };
    }, [sales, products, expenses, lowStockThreshold]);

    const handleGetInsights = async () => {
        setIsInsightLoading(true);
        try {
            const insight = await geminiService.getFinancialInsights({
                totalRevenue: dashboardData.totalRevenue,
                totalProfit: dashboardData.totalProfit,
                totalCosts: dashboardData.totalCosts,
                totalExpenses: dashboardData.totalExpenses,
                topProducts: dashboardData.topProductsForAI,
                salesByHour: dashboardData.salesByHourChart,
            });
            setAiInsight(insight);
        } catch (error) {
            addToast({ message: 'Erro ao obter insights da IA.', type: 'error' });
        } finally {
            setIsInsightLoading(false);
        }
    };


    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard title="Vendas Totais (30d)" value={`R$ ${dashboardData.totalRevenue.toFixed(2)}`} />
                <StatCard title="Despesas Totais (30d)" value={`R$ ${dashboardData.totalExpenses.toFixed(2)}`} onClick={() => setActiveTab('expenses')}/>
                <StatCard title="Lucro Líquido (30d)" value={`R$ ${dashboardData.totalProfit.toFixed(2)}`} />
                <StatCard 
                    title="Estoque Baixo" 
                    value={dashboardData.lowStockProducts.length.toString()} 
                    variant={dashboardData.lowStockProducts.length > 0 ? 'warning' : 'default'}
                    onClick={() => setActiveTab('products')}
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                 <ChartContainer title="Vendas por Dia (Últimos dias)">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={dashboardData.chartData.slice(-7)} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.2)" />
                            <XAxis dataKey="name" fontSize={12} />
                            <YAxis fontSize={12} />
                            <Tooltip contentStyle={{backgroundColor: 'rgba(30,41,59,0.8)', border: 'none', borderRadius: '0.5rem'}}/>
                            <Legend />
                            <Bar dataKey="Vendas" fill="#8884d8" />
                        </BarChart>
                    </ResponsiveContainer>
                </ChartContainer>

                <motion.div 
                    className="glass-effect p-6 rounded-xl shadow-lg border border-white/10"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                >
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">Top 5 Produtos</h3>
                    <ul className="space-y-3">
                        {dashboardData.topProducts.map((p, i) => (
                            <li key={i} className="flex justify-between items-center text-sm">
                                <span className="font-medium text-gray-600 dark:text-gray-300">{p.name}</span>
                                <span className="font-bold text-primary">R$ {p.revenue.toFixed(2)}</span>
                            </li>
                        ))}
                    </ul>
                </motion.div>
                
                 <ChartContainer title="Vendas por Hora">
                    <ResponsiveContainer width="100%" height="100%">
                         <LineChart data={dashboardData.salesByHourChart} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.2)"/>
                            <XAxis dataKey="hour" fontSize={12} />
                            <YAxis fontSize={12}/>
                            <Tooltip contentStyle={{backgroundColor: 'rgba(30,41,59,0.8)', border: 'none', borderRadius: '0.5rem'}}/>
                            <Legend />
                            <Line type="monotone" dataKey="sales" name="Nº Vendas" stroke="#82ca9d" />
                        </LineChart>
                    </ResponsiveContainer>
                </ChartContainer>

                <motion.div 
                    className="lg:col-span-2 glass-effect p-6 rounded-xl shadow-lg border border-white/10"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.3 }}
                >
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Análise Financeira com IA</h3>
                        <button onClick={handleGetInsights} disabled={isInsightLoading} className="px-4 py-2 bg-primary text-white rounded-lg font-semibold text-sm hover:bg-primary-600 transition disabled:opacity-50">
                            {isInsightLoading ? 'Analisando...' : 'Obter Insights'}
                        </button>
                    </div>
                    {aiInsight ? (
                         <div className="prose prose-sm dark:prose-invert max-w-none text-gray-600 dark:text-gray-300" dangerouslySetInnerHTML={{ __html: aiInsight.replace(/\n/g, '<br />') }} />
                    ) : (
                        <p className="text-gray-500 dark:text-gray-400 text-sm">Clique no botão para receber sugestões e análises automáticas sobre os dados financeiros do seu negócio.</p>
                    )}
                </motion.div>

            </div>
        </div>
    );
};

export default Dashboard;