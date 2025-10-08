import React, { useState, useEffect, useMemo } from 'react';
import type { User, Sale, Product, OperatorPerformance } from '../types';
import { api } from '../services/api';
import { useToast } from '../App';
import { Icon } from './common';

interface ReportsViewProps {
    user: User;
}

const OperatorPerformanceReport: React.FC<{ user: User }> = ({ user }) => {
    const [performanceData, setPerformanceData] = useState<OperatorPerformance[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const calculatePerformance = async () => {
            setIsLoading(true);
            try {
                const [operators, sales, products] = await Promise.all([
                    api.getOperators(user.market_id),
                    api.getSales(user.market_id),
                    api.getProducts(user.market_id)
                ]);

                const productMap = new Map(products.map(p => [p.id, p]));

                const data: OperatorPerformance[] = operators.map(op => {
                    const operatorSales = sales.filter(s => s.operator_name === op.name);
                    const totalRevenue = operatorSales.reduce((sum, s) => sum + s.total, 0);
                    const saleCount = operatorSales.length;
                    const itemsSold = operatorSales.reduce((sum, s) => sum + s.items.reduce((itemSum, i) => itemSum + i.qty, 0), 0);
                    const totalProfit = operatorSales.reduce((sum, sale) => {
                        const saleProfit = sale.items.reduce((itemSum, item) => {
                            const product = productMap.get(item.id);
                            const cost = product ? product.cost : 0;
                            return itemSum + (item.price - cost) * item.qty;
                        }, 0);
                        return sum + saleProfit;
                    }, 0);

                    return {
                        operatorName: op.name,
                        totalRevenue,
                        saleCount,
                        averageTicket: saleCount > 0 ? totalRevenue / saleCount : 0,
                        itemsSold,
                        totalProfit
                    };
                });
                setPerformanceData(data.sort((a, b) => b.totalRevenue - a.totalRevenue));
            } catch {
                // handle error
            } finally {
                setIsLoading(false);
            }
        };

        calculatePerformance();
    }, [user]);

    return (
        <div className="overflow-x-auto relative">
            <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
                <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                    <tr>
                        <th scope="col" className="px-6 py-3">Operador</th>
                        <th scope="col" className="px-6 py-3">Vendas (R$)</th>
                        <th scope="col" className="px-6 py-3">Lucro (R$)</th>
                        <th scope="col" className="px-6 py-3">Nº Vendas</th>
                        <th scope="col" className="px-6 py-3">Ticket Médio</th>
                        <th scope="col" className="px-6 py-3">Itens Vendidos</th>
                    </tr>
                </thead>
                <tbody>
                    {isLoading ? (
                        <tr><td colSpan={6} className="text-center p-6">Calculando...</td></tr>
                    ) : performanceData.map(op => (
                        <tr key={op.operatorName} className="bg-white dark:bg-gray-800 border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600/20">
                            <th scope="row" className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap dark:text-white">{op.operatorName}</th>
                            <td className="px-6 py-4 font-bold text-primary">R$ {op.totalRevenue.toFixed(2)}</td>
                            <td className="px-6 py-4 font-semibold text-green-600">R$ {op.totalProfit.toFixed(2)}</td>
                            <td className="px-6 py-4">{op.saleCount}</td>
                            <td className="px-6 py-4">R$ {op.averageTicket.toFixed(2)}</td>
                            <td className="px-6 py-4">{op.itemsSold}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

const ExpiryReport: React.FC<{ user: User }> = ({ user }) => {
    const [products, setProducts] = useState<Product[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchProducts = async () => {
            setIsLoading(true);
            try {
                const data = await api.getProducts(user.market_id);
                setProducts(data);
            } catch {
                // handle error
            } finally {
                setIsLoading(false);
            }
        };
        fetchProducts();
    }, [user.market_id]);
    
    const expiringProducts = useMemo(() => {
        const today = new Date();
        today.setHours(0,0,0,0);
        const thirtyDaysFromNow = new Date(today);
        thirtyDaysFromNow.setDate(today.getDate() + 30);

        return products.filter(p => {
            if (!p.expiry_date) return false;
            const expiryDate = new Date(`${p.expiry_date}T00:00:00`);
            return expiryDate <= thirtyDaysFromNow;
        }).sort((a,b) => new Date(a.expiry_date!).getTime() - new Date(b.expiry_date!).getTime());
    }, [products]);

    return (
         <div className="overflow-x-auto relative">
            <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
                <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                    <tr>
                        <th scope="col" className="px-6 py-3">Produto</th>
                        <th scope="col" className="px-6 py-3">Estoque</th>
                        <th scope="col" className="px-6 py-3">Data de Validade</th>
                        <th scope="col" className="px-6 py-3">Status</th>
                    </tr>
                </thead>
                <tbody>
                    {isLoading ? (
                        <tr><td colSpan={4} className="text-center p-6">Carregando...</td></tr>
                    ) : expiringProducts.map(p => {
                        const expiryDate = new Date(`${p.expiry_date}T00:00:00`);
                        const today = new Date();
                        today.setHours(0,0,0,0);
                        const isExpired = expiryDate < today;

                        return (
                            <tr key={p.id} className={`bg-white dark:bg-gray-800 border-b dark:border-gray-700 ${isExpired ? 'bg-red-50 dark:bg-red-900/20' : 'hover:bg-gray-50 dark:hover:bg-gray-600/20'}`}>
                                <th scope="row" className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap dark:text-white">{p.name}</th>
                                <td className="px-6 py-4">{p.stock}</td>
                                <td className="px-6 py-4 font-semibold">{expiryDate.toLocaleDateString('pt-BR')}</td>
                                <td className="px-6 py-4">
                                     <span className={`px-2 py-1 text-xs font-medium rounded-full ${isExpired ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300' : 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300'}`}>
                                        {isExpired ? 'Vencido' : 'Vence em breve'}
                                    </span>
                                </td>
                            </tr>
                        )
                    })}
                </tbody>
            </table>
             {!isLoading && expiringProducts.length === 0 && (
                <div className="text-center py-10 text-gray-500">
                    <p>Nenhum produto vencendo nos próximos 30 dias.</p>
                </div>
            )}
        </div>
    );
};


const ReportsView: React.FC<ReportsViewProps> = ({ user }) => {
    const [activeReport, setActiveReport] = useState<'performance' | 'expiry'>('performance');

    const tabs = [
        { id: 'performance', label: 'Desempenho por Operador' },
        { id: 'expiry', label: 'Validade de Produtos' }
    ];

    return (
         <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 space-y-4">
             <div className="border-b border-gray-200 dark:border-gray-700">
                <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveReport(tab.id as any)}
                            className={`${
                                activeReport === tab.id
                                    ? 'border-primary text-primary'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300 dark:hover:border-gray-600'
                            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </nav>
            </div>
            
            <div>
                {activeReport === 'performance' && <OperatorPerformanceReport user={user} />}
                {activeReport === 'expiry' && <ExpiryReport user={user} />}
            </div>
         </div>
    );
};

export default ReportsView;
