import React, { useState, useEffect, useMemo, useCallback } from 'react';
import type { User, View, Product, CartItem, Customer, PaymentMethod, SaleStatus } from '../types';
import { api } from '../services/api';
import { useToast } from '../App';
import { useKeyboardShortcuts } from '../hooks';
import CustomerSearch from './CustomerSearch';
import ComandasModal from './ComandasModal';

interface PDVViewProps {
    user: User;
    onSwitchView: (view: View) => void;
    onLogout: () => void;
}

const PDVView: React.FC<PDVViewProps> = ({ user, onSwitchView, onLogout }) => {
    const [products, setProducts] = useState<Product[]>([]);
    const [cart, setCart] = useState<CartItem[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [customer, setCustomer] = useState<Customer | null>(null);
    const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('money');
    const [receivedAmount, setReceivedAmount] = useState('');
    const [isCustomerModalOpen, setCustomerModalOpen] = useState(false);
    const [isComandasModalOpen, setComandasModalOpen] = useState(false);
    const [isFinishing, setIsFinishing] = useState(false);
    const { addToast } = useToast();

    useEffect(() => {
        const fetchProducts = async () => {
            try {
                const data = await api.getProducts(user.market_id);
                setProducts(data);
            } catch {
                addToast({ message: 'Erro ao carregar produtos.', type: 'error' });
            }
        };
        fetchProducts();
    }, [user.market_id, addToast]);

    const filteredProducts = useMemo(() => {
        return products.filter(p =>
            p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.code.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [products, searchTerm]);

    const addToCart = useCallback((product: Product) => {
        setCart(prevCart => {
            const existingItem = prevCart.find(item => item.id === product.id);
            if (existingItem) {
                if (existingItem.qty < product.stock) {
                    return prevCart.map(item => item.id === product.id ? { ...item, qty: item.qty + 1 } : item);
                } else {
                    addToast({ message: `Estoque máximo de ${product.name} atingido.`, type: 'warning'});
                    return prevCart;
                }
            } else {
                 if (product.stock > 0) {
                     return [...prevCart, { ...product, qty: 1 }];
                 } else {
                    addToast({ message: `${product.name} está sem estoque.`, type: 'warning'});
                    return prevCart;
                 }
            }
        });
    }, [addToast]);

    const updateCartQty = (productId: string, qty: number) => {
        setCart(prevCart => {
            const product = products.find(p => p.id === productId);
            if (qty > 0 && product && qty <= product.stock) {
                 return prevCart.map(item => item.id === productId ? { ...item, qty } : item);
            } else if (qty > (product?.stock || 0)) {
                addToast({ message: `Estoque máximo de ${product?.name} é ${product?.stock}.`, type: 'warning'});
                return prevCart;
            }
            return prevCart.filter(item => item.id !== productId);
        });
    };

    const cartTotal = useMemo(() => cart.reduce((sum, item) => sum + item.price * item.qty, 0), [cart]);
    const change = useMemo(() => {
        const received = parseFloat(receivedAmount) || 0;
        return received > cartTotal ? received - cartTotal : 0;
    }, [cartTotal, receivedAmount]);

    const handleClearCart = () => {
        if (window.confirm('Deseja limpar o carrinho?')) {
            setCart([]);
            setCustomer(null);
            setReceivedAmount('');
            setPaymentMethod('money');
        }
    };

    const handleFinishSale = async () => {
        if (cart.length === 0) {
            addToast({ message: 'Carrinho está vazio.', type: 'warning' });
            return;
        }
        if (paymentMethod === 'money' && (parseFloat(receivedAmount) || 0) < cartTotal) {
             addToast({ message: 'Valor recebido é menor que o total.', type: 'error' });
             return;
        }
        
        setIsFinishing(true);
        try {
            await api.addSale({
                market_id: user.market_id,
                items: cart.map(({id, name, price, qty}) => ({id, name, price, qty})),
                total: cartTotal,
                payment_method: paymentMethod,
                received: parseFloat(receivedAmount) || cartTotal,
                change: change,
                status: 'completed' as SaleStatus, // Or 'pending' for kitchen
                operator_name: user.name,
                customer_id: customer?.id,
                customer_name: customer?.name,
            });
            addToast({ message: 'Venda finalizada com sucesso!', type: 'success' });
            setCart([]);
            setCustomer(null);
            setReceivedAmount('');
            setPaymentMethod('money');
        } catch (error) {
            addToast({ message: 'Erro ao finalizar a venda.', type: 'error' });
        } finally {
            setIsFinishing(false);
        }
    };

    useKeyboardShortcuts({
        'F1': () => document.getElementById('search-product')?.focus(),
        'F2': () => setCustomerModalOpen(true),
        'F8': handleFinishSale,
        'F9': handleClearCart,
    });


    return (
        <div className="h-screen w-full flex bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-100">
            {/* Header */}
            <header className="absolute top-0 left-0 right-0 h-16 bg-white dark:bg-gray-800 shadow-md flex items-center justify-between px-4 z-10">
                <div className="text-xl font-bold text-primary">PDVMarket</div>
                <div className="flex items-center gap-4">
                    <span>Operador: <span className="font-semibold">{user.name}</span></span>
                    {user.type === 'owner' && (
                         <button onClick={() => onSwitchView('admin')} className="px-3 py-1.5 text-sm rounded-md bg-gray-200 dark:bg-gray-700 font-semibold hover:bg-gray-300 dark:hover:bg-gray-600 transition">Admin</button>
                    )}
                    <button onClick={() => onSwitchView('kitchen')} className="px-3 py-1.5 text-sm rounded-md bg-amber-500 text-white font-semibold hover:bg-amber-600 transition">Cozinha</button>
                    <button onClick={onLogout} className="px-3 py-1.5 text-sm rounded-md bg-red-500 text-white font-semibold hover:bg-red-600 transition">Sair</button>
                </div>
            </header>
            
            <div className="flex flex-1 pt-16">
                {/* Left: Product List */}
                <div className="w-1/2 flex flex-col p-4">
                    <input
                        id="search-product"
                        type="text"
                        placeholder="Buscar produto por nome ou código (F1)"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full p-3 mb-4 rounded-lg bg-white dark:bg-gray-800 shadow focus:ring-2 focus:ring-primary focus:outline-none"
                    />
                    <div className="flex-1 overflow-y-auto grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {filteredProducts.map(p => (
                            <button key={p.id} onClick={() => addToCart(p)} disabled={p.stock <= 0} className="text-left p-3 bg-white dark:bg-gray-800 rounded-lg shadow hover:shadow-lg hover:ring-2 hover:ring-primary transition-all disabled:opacity-50">
                                <div className="font-bold text-sm truncate">{p.name}</div>
                                <div className="text-xs text-gray-500 dark:text-gray-400">Estoque: {p.stock}</div>
                                <div className="text-lg font-extrabold text-primary mt-2">R$ {p.price.toFixed(2)}</div>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Right: Cart and Payment */}
                <div className="w-1/2 bg-white dark:bg-gray-800 flex flex-col p-4 shadow-lg">
                    <h2 className="text-2xl font-bold mb-2">Carrinho</h2>
                    {/* Customer */}
                    <div className="mb-2">
                        {customer ? (
                            <div className="flex justify-between items-center p-2 bg-primary/10 rounded-lg text-sm">
                                <span className="font-semibold text-primary">{customer.name}</span>
                                <button onClick={() => setCustomer(null)} className="text-red-500 font-bold">X</button>
                            </div>
                        ) : (
                            <button onClick={() => setCustomerModalOpen(true)} className="w-full text-left p-2 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600">
                                Identificar Cliente (F2)
                            </button>
                        )}
                    </div>

                    {/* Cart Items */}
                    <div className="flex-1 overflow-y-auto border-y dark:border-gray-700 py-2">
                        {cart.length === 0 ? (
                            <p className="text-center text-gray-500 pt-10">Carrinho vazio</p>
                        ) : cart.map(item => (
                            <div key={item.id} className="flex items-center gap-2 py-2">
                                <div className="flex-1">
                                    <p className="font-semibold text-sm">{item.name}</p>
                                    <p className="text-xs text-gray-500">R$ {item.price.toFixed(2)}</p>
                                </div>
                                <input type="number" value={item.qty} onChange={e => updateCartQty(item.id, parseInt(e.target.value) || 0)} className="w-16 p-1 text-center rounded-md bg-gray-100 dark:bg-gray-700"/>
                                <p className="font-bold w-20 text-right">R$ {(item.price * item.qty).toFixed(2)}</p>
                                <button onClick={() => updateCartQty(item.id, 0)} className="text-red-500 font-bold text-lg">X</button>
                            </div>
                        ))}
                    </div>

                    {/* Totals */}
                    <div className="pt-4 space-y-2 text-xl">
                         <div className="flex justify-between font-bold">
                            <span>TOTAL</span>
                            <span className="text-3xl text-primary">R$ {cartTotal.toFixed(2)}</span>
                        </div>
                        {paymentMethod === 'money' && (
                             <div className="flex justify-between">
                                <span>Recebido</span>
                                <input type="number" placeholder="0.00" value={receivedAmount} onChange={e => setReceivedAmount(e.target.value)} className="w-32 p-1 text-xl text-right font-bold rounded-md bg-gray-100 dark:bg-gray-700"/>
                            </div>
                        )}
                        <div className="flex justify-between">
                            <span>Troco</span>
                            <span className="font-bold">R$ {change.toFixed(2)}</span>
                        </div>
                    </div>

                    {/* Payment */}
                    <div className="grid grid-cols-4 gap-2 py-4">
                        {(['money', 'debit', 'credit', 'pix'] as PaymentMethod[]).map(method => (
                            <button key={method} onClick={() => setPaymentMethod(method)} className={`p-2 rounded-lg font-semibold text-sm transition ${paymentMethod === method ? 'bg-primary text-white' : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300'}`}>
                                {method.toUpperCase()}
                            </button>
                        ))}
                    </div>
                    
                    {/* Actions */}
                    <div className="grid grid-cols-2 gap-4">
                         <button onClick={handleClearCart} disabled={cart.length === 0} className="w-full p-4 rounded-lg bg-red-500 text-white font-bold text-lg hover:bg-red-600 disabled:opacity-50">Limpar (F9)</button>
                         <button onClick={handleFinishSale} disabled={isFinishing || cart.length === 0} className="w-full p-4 rounded-lg bg-green-500 text-white font-bold text-lg hover:bg-green-600 disabled:opacity-50">
                             {isFinishing ? 'Finalizando...' : 'Finalizar (F8)'}
                         </button>
                    </div>
                </div>
            </div>

            <CustomerSearch 
                isOpen={isCustomerModalOpen}
                onClose={() => setCustomerModalOpen(false)}
                onSelectCustomer={(c) => { setCustomer(c); setCustomerModalOpen(false); }}
                user={user}
            />
            
            <ComandasModal
                isOpen={isComandasModalOpen}
                onClose={() => setComandasModalOpen(false)}
                user={user}
            />
        </div>
    );
};

export default PDVView;
