import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import type { User, View, Product, CartItem, Sale, Customer, CashierSession } from '../types';
import { api } from '../services/api';
import { useToast } from '../App';
import { useKeyboardShortcuts, useDebouncedCallback, useSoundEffects } from '../hooks';
import { Icon } from './common';
import SaleCompletionModal from './SaleCompletionModal';
import CustomerSearch from './CustomerSearch';
import ComandasModal from './ComandasModal';
import CashierControlModal from './CashierControlModal';
import BarcodeScannerModal from './BarcodeScannerModal';
import PointsRedemptionModal from './PointsRedemptionModal';
import { motion, AnimatePresence } from 'framer-motion';

interface PDVViewProps {
    user: User;
    onSwitchView: (view: View) => void;
    onLogout: () => void;
}

const POINTS_TO_BRL_RATE = 0.10; // 1 point = R$ 0.10

const PDVView: React.FC<PDVViewProps> = ({ user, onSwitchView, onLogout }) => {
    // State
    const [products, setProducts] = useState<Product[]>([]);
    const [cart, setCart] = useState<CartItem[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeSale, setActiveSale] = useState<Sale | null>(null);
    const [customer, setCustomer] = useState<Customer | null>(null);
    const [cashierSession, setCashierSession] = useState<CashierSession | null>(null);

    // Modal States
    const [isSaleModalOpen, setIsSaleModalOpen] = useState(false);
    const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
    const [isComandasModalOpen, setIsComandasModalOpen] = useState(false);
    const [isCashierModalOpen, setIsCashierModalOpen] = useState(false);
    const [isScannerOpen, setIsScannerOpen] = useState(false);
    const [isPointsModalOpen, setIsPointsModalOpen] = useState(false);
    
    // Refs and Custom Hooks
    const searchInputRef = useRef<HTMLInputElement>(null);
    const { addToast } = useToast();
    const { playSound } = useSoundEffects();
    const debouncedSearch = useDebouncedCallback((term: string) => setSearchTerm(term), 300);

    // Data Fetching
    useEffect(() => {
        const fetchData = async () => {
            try {
                const [productsData, sessionData] = await Promise.all([
                    api.getProducts(user.market_id),
                    api.getActiveCashierSession(user.id)
                ]);
                setProducts(productsData);
                setCashierSession(sessionData);
                if (!sessionData) {
                    setIsCashierModalOpen(true);
                }
            } catch (error) {
                addToast({ message: 'Erro ao carregar dados iniciais.', type: 'error' });
            }
        };
        fetchData();
    }, [user.id, user.market_id, addToast]);

    // Derived State
    const cartTotal = useMemo(() => cart.reduce((sum, item) => sum + item.price * item.qty, 0), [cart]);

    // Cart Management
    const addToCart = useCallback((product: Product) => {
        if (!cashierSession) {
            addToast({ message: 'Abra o caixa para iniciar uma venda.', type: 'warning' });
            setIsCashierModalOpen(true);
            return;
        }

        setCart(currentCart => {
            const existingItem = currentCart.find(item => item.id === product.id);
            if (existingItem) {
                if (existingItem.qty < product.stock) {
                    playSound('add');
                    return currentCart.map(item => item.id === product.id ? { ...item, qty: item.qty + 1 } : item);
                } else {
                    addToast({ message: 'Estoque máximo atingido para este item.', type: 'warning' });
                    return currentCart;
                }
            } else {
                 if (product.stock > 0) {
                    playSound('add');
                    return [...currentCart, { ...product, qty: 1 }];
                } else {
                     addToast({ message: 'Produto sem estoque.', type: 'error' });
                     return currentCart;
                }
            }
        });
    }, [cashierSession, addToast, playSound]);
    
    const updateQty = (productId: string, newQty: number) => {
        const product = products.find(p => p.id === productId);
        if (newQty > 0 && product && newQty <= product.stock) {
            setCart(cart.map(item => item.id === productId ? { ...item, qty: newQty } : item));
        } else if (newQty > (product?.stock || 0)) {
            addToast({ message: `Estoque máximo: ${product?.stock}`, type: 'warning'});
        } else {
            setCart(cart.filter(item => item.id !== productId));
        }
    };

    // Sale Management
    const clearSale = useCallback(() => {
        setCart([]);
        setCustomer(null);
        setActiveSale(null);
        setSearchTerm('');
        if (searchInputRef.current) {
            searchInputRef.current.value = '';
            searchInputRef.current.focus();
        };
        playSound('clear');
    }, [playSound]);

    const handleCompleteSale = async (saleData: Omit<Sale, 'id' | 'created_at' | 'order_number' | 'market_id' | 'items'>) => {
        const saleToSave = {
            ...saleData,
            operator_name: user.name,
            market_id: user.market_id,
            items: cart.map(({ id, name, price, qty }) => ({ id, name, price, qty })),
        };
        
        try {
            let completedSale: Sale;
            if (activeSale?.id) {
                completedSale = await api.updateSale(activeSale.id, { ...saleToSave, status: 'completed' });
            } else {
                completedSale = await api.addSale({ ...saleToSave, status: 'completed' });
            }

            // Update local product stock
            setProducts(prevProducts => prevProducts.map(p => {
                const soldItem = completedSale.items.find(i => i.id === p.id);
                if (soldItem) {
                    return { ...p, stock: p.stock - soldItem.qty };
                }
                return p;
            }));

            // Add transaction to cashier session
            if (cashierSession) {
                 const updatedSession = await api.addCashierTransaction(cashierSession.id, {
                    type: 'sale',
                    amount: completedSale.total,
                    payment_method: completedSale.payment_method
                });
                setCashierSession(updatedSession);
            }

            if (customer && saleData.discount?.type === 'points') {
                const pointsUsed = saleData.discount.amount / POINTS_TO_BRL_RATE;
                await api.updateCustomer(customer.id, { points: -pointsUsed });
            }
            if(customer) {
                const pointsEarned = Math.floor(completedSale.total);
                await api.updateCustomer(customer.id, { points: pointsEarned });
                 addToast({ message: `Cliente ${customer.name} ganhou ${pointsEarned} pontos!`, type: 'info' });
            }

            setIsSaleModalOpen(false);
            clearSale();
            playSound('success');
            return true; // Indicate success
        } catch (error) {
            addToast({ message: 'Erro ao finalizar a venda.', type: 'error' });
            return false; // Indicate failure
        }
    };

    const loadComanda = (comanda: Sale) => {
        setCart(comanda.items.map(item => {
            const product = products.find(p => p.id === item.id);
            return { ...(product!), ...item };
        }));
        setActiveSale(comanda);
        setIsComandasModalOpen(false);
        addToast({ message: `Comanda "${comanda.customer_name}" carregada.`, type: 'info' });
    };

    // Barcode Scanner Handler
    const handleScanSuccess = useCallback((code: string) => {
        setIsScannerOpen(false);
        const product = products.find(p => p.code === code);
        if (product) {
            addToCart(product);
        } else {
            addToast({ message: 'Produto não encontrado.', type: 'error' });
        }
    }, [products, addToCart, addToast]);

    // Keyboard Shortcuts
    useKeyboardShortcuts({
        'F1': () => searchInputRef.current?.focus(),
        'F2': () => setIsCustomerModalOpen(true),
        'F4': () => cart.length > 0 && setIsSaleModalOpen(true),
        'F7': () => setIsComandasModalOpen(true),
        'F8': () => setIsCashierModalOpen(true),
        'F9': () => setIsScannerOpen(true),
        'Escape': clearSale
    });

    const filteredProducts = useMemo(() => {
        if (!searchTerm) return [];
        return products.filter(p =>
            p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.code.includes(searchTerm)
        ).slice(0, 50); // Limit results for performance
    }, [products, searchTerm]);
    
    return (
        <div className="h-screen w-full flex flex-col bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-100">
            {/* Header */}
            <header className="flex items-center justify-between p-2 bg-white dark:bg-gray-800 shadow-md">
                <div className="flex items-center gap-4">
                    <h1 className="text-xl font-bold text-primary">PDVMarket</h1>
                    {user.type === 'owner' && (
                        <button onClick={() => onSwitchView('admin')} className="text-sm font-semibold text-gray-600 dark:text-gray-300 hover:text-primary">Administração</button>
                    )}
                    <button onClick={() => onSwitchView('kitchen')} className="text-sm font-semibold text-gray-600 dark:text-gray-300 hover:text-primary">Cozinha</button>
                </div>
                <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold">{user.name}</span>
                    <button onClick={() => setIsCashierModalOpen(true)} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700">
                        <Icon name="cash" className="w-6 h-6 text-green-500"/>
                    </button>
                    <button onClick={onLogout} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700">
                        <Icon name="logout" className="w-5 h-5 text-red-500"/>
                    </button>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-4 p-4 overflow-hidden">
                {/* Left Side: Search and Products */}
                <div className="flex flex-col bg-white dark:bg-gray-800 rounded-lg shadow">
                    <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                        <div className="relative">
                           <input
                                ref={searchInputRef}
                                type="text"
                                placeholder="Buscar produto por nome ou código (F1)"
                                onChange={e => debouncedSearch(e.target.value)}
                                className="w-full p-3 pl-10 rounded-lg bg-gray-100 dark:bg-gray-700 border-transparent focus:ring-2 focus:ring-primary"
                           />
                           <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"/>
                           <button onClick={() => setIsScannerOpen(true)} className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-gray-500 hover:text-primary">
                                <Icon name="qrcode" className="w-6 h-6"/>
                           </button>
                        </div>
                    </div>
                    <div className="flex-1 overflow-y-auto">
                        {filteredProducts.length > 0 ? (
                            <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                                {filteredProducts.map(p => (
                                    <li key={p.id}>
                                        <button onClick={() => addToCart(p)} className="w-full text-left p-4 hover:bg-primary/5 dark:hover:bg-primary/10 flex justify-between items-center" disabled={p.stock <= 0}>
                                            <div>
                                                <p className={`font-semibold ${p.stock <= 0 ? 'text-gray-400' : ''}`}>{p.name}</p>
                                                <p className="text-xs text-gray-500 dark:text-gray-400">{p.code} | Estoque: {p.stock}</p>
                                            </div>
                                            <span className={`font-bold text-lg ${p.stock <= 0 ? 'text-gray-400' : 'text-primary'}`}>R$ {p.price.toFixed(2)}</span>
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <div className="p-10 text-center text-gray-400">
                                <p>Digite para buscar produtos ou use o leitor de código de barras.</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Side: Cart and Actions */}
                <div className="flex flex-col bg-white dark:bg-gray-800 rounded-lg shadow">
                    {/* Customer Info */}
                    <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                        {customer ? (
                            <div className="flex items-center gap-3">
                                <button onClick={() => setCustomer(null)} className="text-red-500 hover:text-red-700"><Icon name="x-circle" className="w-5 h-5"/></button>
                                <div>
                                    <p className="font-semibold">{customer.name}</p>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">{customer.cpf} | {customer.points} pontos</p>
                                </div>
                                <button onClick={() => setIsPointsModalOpen(true)} className="ml-4 px-2 py-1 text-xs bg-amber-500 text-white rounded-full hover:bg-amber-600">Resgatar Pontos</button>
                            </div>
                        ) : (
                            <button onClick={() => setIsCustomerModalOpen(true)} className="flex items-center gap-2 text-primary hover:underline">
                                <Icon name="user-plus" className="w-5 h-5"/>
                                <span>Identificar Cliente (F2)</span>
                            </button>
                        )}
                         <button onClick={() => setIsComandasModalOpen(true)} className="flex items-center gap-2 text-primary hover:underline">
                            <Icon name="document-text" className="w-5 h-5"/>
                            <span>Comandas (F7)</span>
                        </button>
                    </div>

                    {/* Cart Items */}
                    <div className="flex-1 overflow-y-auto">
                        {cart.length > 0 ? (
                            <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                                <AnimatePresence>
                                    {cart.map(item => (
                                        <motion.li 
                                            key={item.id} 
                                            layout
                                            initial={{ opacity: 0, height: 0 }}
                                            animate={{ opacity: 1, height: 'auto' }}
                                            exit={{ opacity: 0, height: 0 }}
                                            transition={{ type: 'spring', bounce: 0.3, duration: 0.4 }}
                                            className="p-4 flex items-center gap-4 overflow-hidden"
                                        >
                                            <div className="flex-1">
                                                <p className="font-semibold">{item.name}</p>
                                                <p className="text-sm text-gray-500 dark:text-gray-400">R$ {item.price.toFixed(2)}</p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <input
                                                    type="number"
                                                    value={item.qty}
                                                    onChange={(e) => updateQty(item.id, parseInt(e.target.value))}
                                                    className="w-16 p-1 text-center rounded-md bg-gray-100 dark:bg-gray-700"
                                                    min="1"
                                                    max={item.stock}
                                                />
                                            </div>
                                            <p className="w-24 text-right font-bold text-lg">R$ {(item.price * item.qty).toFixed(2)}</p>
                                            <button onClick={() => updateQty(item.id, 0)} className="text-red-500 hover:text-red-700">
                                                <Icon name="trash" className="w-5 h-5"/>
                                            </button>
                                        </motion.li>
                                    ))}
                                </AnimatePresence>
                            </ul>
                        ) : (
                            <div className="p-10 text-center text-gray-400 h-full flex flex-col justify-center items-center">
                                <Icon name="shopping-cart" className="w-16 h-16 mb-4"/>
                                <p>O carrinho está vazio.</p>
                                <p className="text-sm">Adicione produtos para iniciar a venda.</p>
                            </div>
                        )}
                    </div>
                    {/* Footer: Total and Payment */}
                    {cart.length > 0 && (
                        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                            <div className="flex justify-between items-center mb-4">
                                <span className="text-lg font-medium">Total</span>
                                <motion.div
                                    key={cartTotal}
                                    initial={{ y: -10, opacity: 0.5 }}
                                    animate={{ y: 0, opacity: 1 }}
                                    transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                                    className="text-3xl font-bold text-primary"
                                >
                                    R$ {cartTotal.toFixed(2)}
                                </motion.div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <button onClick={clearSale} className="p-4 w-full bg-red-500 text-white font-bold rounded-lg hover:bg-red-600">CANCELAR (ESC)</button>
                                <button onClick={() => setIsSaleModalOpen(true)} className="p-4 w-full bg-green-500 text-white font-bold rounded-lg hover:bg-green-600">PAGAMENTO (F4)</button>
                            </div>
                        </div>
                    )}
                </div>
            </main>

            {/* Modals */}
            {isSaleModalOpen && 
                <SaleCompletionModal 
                    isOpen={isSaleModalOpen} 
                    onClose={() => setIsSaleModalOpen(false)}
                    cart={cart}
                    customer={customer}
                    onCompleteSale={handleCompleteSale}
                />
            }
            {isCustomerModalOpen &&
                <CustomerSearch
                    isOpen={isCustomerModalOpen}
                    onClose={() => setIsCustomerModalOpen(false)}
                    onSelectCustomer={(c) => { setCustomer(c); setIsCustomerModalOpen(false); }}
                    user={user}
                />
            }
             {isComandasModalOpen &&
                <ComandasModal
                    isOpen={isComandasModalOpen}
                    onClose={() => setIsComandasModalOpen(false)}
                    user={user}
                    onSelectComanda={loadComanda}
                />
            }
             <CashierControlModal 
                isOpen={isCashierModalOpen}
                onClose={() => { if(cashierSession) setIsCashierModalOpen(false); }}
                session={cashierSession}
                user={user}
                onSessionStarted={(session) => { setCashierSession(session); setIsCashierModalOpen(false); }}
                onTransactionAdded={(session) => setCashierSession(session)}
                onSessionClosed={() => { setCashierSession(null); setIsCashierModalOpen(true); }}
             />
             {isScannerOpen &&
                <BarcodeScannerModal 
                    isOpen={isScannerOpen}
                    onClose={() => setIsScannerOpen(false)}
                    onScanSuccess={handleScanSuccess}
                />
             }
             {isPointsModalOpen && customer && 
                <PointsRedemptionModal
                    isOpen={isPointsModalOpen}
                    onClose={() => setIsPointsModalOpen(false)}
                    customer={customer}
                    cartTotal={cartTotal}
                    onRedeem={(points, discount) => {
                        // This is a mock redemption; the real logic is in SaleCompletionModal
                        addToast({ message: `Desconto de R$${discount.toFixed(2)} por ${points} pontos será aplicado no pagamento.`, type: 'info' });
                        setIsPointsModalOpen(false);
                        setIsSaleModalOpen(true); // Open payment modal right away
                    }}
                />
             }
        </div>
    );
};

export default PDVView;