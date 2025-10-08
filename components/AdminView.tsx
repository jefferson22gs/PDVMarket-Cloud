import React, { useState } from 'react';
import type { User, View } from '../types';
import { Icon } from './common';
import Dashboard from './Dashboard';
import CustomersView from './CustomersView';
import ProductsView from './ProductsView';
import OperatorsView from './OperatorsView';
import SalesView from './SalesView';

interface AdminViewProps {
    user: User;
    onSwitchView: (view: View) => void;
    onLogout: () => void;
}

type AdminTab = 'dashboard' | 'products' | 'customers' | 'operators' | 'sales' | 'settings';

const AdminView: React.FC<AdminViewProps> = ({ user, onSwitchView, onLogout }) => {
    const [activeTab, setActiveTab] = useState<AdminTab>('dashboard');
    const [lowStockThreshold, setLowStockThreshold] = useState(10);

    const renderContent = () => {
        switch (activeTab) {
            case 'dashboard':
                return <Dashboard user={user} lowStockThreshold={lowStockThreshold} setActiveTab={setActiveTab} />;
            case 'products':
                return <ProductsView user={user} lowStockThreshold={lowStockThreshold} />;
            case 'customers':
                return <CustomersView user={user} />;
            case 'operators':
                return <OperatorsView user={user} />;
            case 'sales':
                return <SalesView user={user} />;
            case 'settings':
                 return (
                     <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 max-w-md">
                        <h2 className="text-xl font-bold mb-4 text-gray-800 dark:text-gray-100">Configurações</h2>
                        <div>
                            <label htmlFor="stockThreshold" className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Alerta de estoque baixo</label>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Destacar produtos quando o estoque for igual ou inferior a este valor.</p>
                            <input
                                type="number"
                                id="stockThreshold"
                                value={lowStockThreshold}
                                onChange={(e) => setLowStockThreshold(Number(e.target.value) >= 0 ? Number(e.target.value) : 0)}
                                className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-primary-500 focus:border-primary-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white"
                                placeholder="Ex: 10"
                            />
                        </div>
                    </div>
                );
            default:
                return null;
        }
    };

    const tabs: { id: AdminTab; name: string; icon: string }[] = [
        { id: 'dashboard', name: 'Dashboard', icon: 'chart-bar' },
        { id: 'sales', name: 'Vendas', icon: 'shopping-cart' },
        { id: 'products', name: 'Produtos', icon: 'archive-box' },
        { id: 'customers', name: 'Clientes', icon: 'user-group' },
        { id: 'operators', name: 'Operadores', icon: 'users' },
        { id: 'settings', name: 'Configurações', icon: 'cog' },
    ];

    return (
        <div className="min-h-screen flex bg-gray-100 dark:bg-gray-900">
            {/* Sidebar */}
            <aside className="w-64 bg-white dark:bg-gray-800 shadow-lg flex flex-col">
                <div className="p-6 text-2xl font-bold text-primary border-b border-gray-200 dark:border-gray-700">
                    Admin
                </div>
                <nav className="flex-1 p-4 space-y-2">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`w-full flex items-center gap-3 px-4 py-2 rounded-md text-left text-gray-600 dark:text-gray-300 transition-colors ${
                                activeTab === tab.id
                                    ? 'bg-primary/10 text-primary dark:bg-primary/20'
                                    : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                            }`}
                        >
                            <Icon name={tab.icon} className="w-5 h-5"/>
                            <span className="font-semibold">{tab.name}</span>
                        </button>
                    ))}
                </nav>
                 <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                     <button onClick={() => onSwitchView('pdv')} className="w-full text-left flex items-center gap-3 px-4 py-2 rounded-md text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700">Voltar ao PDV</button>
                    <button onClick={onLogout} className="w-full text-left flex items-center gap-3 px-4 py-2 rounded-md text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 mt-2">Sair</button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col overflow-hidden">
                <header className="bg-white dark:bg-gray-800 shadow-sm p-4">
                    <h1 className="text-xl font-semibold text-gray-800 dark:text-gray-100">
                        {tabs.find(t => t.id === activeTab)?.name}
                    </h1>
                </header>
                <div className="flex-1 p-6 overflow-y-auto">
                    {renderContent()}
                </div>
            </main>
        </div>
    );
};

export default AdminView;