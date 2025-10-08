import React, { useState, useMemo, useEffect } from 'react';
import type { CartItem, Customer, Sale, PaymentMethod } from '../types';
import { Icon, Modal } from './common';
import { useToast } from '../App';

interface SaleCompletionModalProps {
    isOpen: boolean;
    onClose: () => void;
    cart: CartItem[];
    customer: Customer | null;
    onCompleteSale: (saleData: Omit<Sale, 'id' | 'created_at' | 'order_number' | 'market_id' | 'items'>) => Promise<boolean>;
}

const SaleCompletionModal: React.FC<SaleCompletionModalProps> = ({ isOpen, onClose, cart, customer, onCompleteSale }) => {
    const { addToast } = useToast();
    
    const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('money');
    const [receivedAmount, setReceivedAmount] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [saleCompletedData, setSaleCompletedData] = useState<Sale | null>(null);
    const [discount, setDiscount] = useState(0); 

    const cartTotal = useMemo(() => cart.reduce((sum, item) => sum + item.price * item.qty, 0), [cart]);

    const finalTotal = useMemo(() => {
        const total = cartTotal - discount;
        return total > 0 ? total : 0;
    }, [cartTotal, discount]);

    const change = useMemo(() => {
        if (paymentMethod !== 'money') return 0;
        const received = parseFloat(receivedAmount) || 0;
        const changeAmount = received - finalTotal;
        return changeAmount > 0 ? changeAmount : 0;
    }, [paymentMethod, receivedAmount, finalTotal]);
    
    const customerCreditAvailable = useMemo(() => {
        if (!customer) return 0;
        return customer.credit_limit - customer.credit_balance;
    }, [customer]);

    const canUseCredit = customer && finalTotal > 0 && finalTotal <= customerCreditAvailable;

    useEffect(() => {
        if (isOpen) {
            setPaymentMethod('money');
            setReceivedAmount('');
            setDiscount(0);
            setIsLoading(false);
            setSaleCompletedData(null);
        }
    }, [isOpen]);

    const formatReceiptForWhatsApp = (sale: Sale) => {
        let message = `*Recibo PDVMarket Cloud*\n\n`;
        message += `Data: ${new Date(sale.created_at).toLocaleString('pt-BR')}\n`;
        if (sale.customer_name) {
            message += `Cliente: ${sale.customer_name}\n`;
        }
        message += `\n*Itens:*\n`;
        sale.items.forEach(item => {
            message += `${item.qty}x ${item.name} - R$ ${(item.price * item.qty).toFixed(2)}\n`;
        });
        message += `\n`;
        if (sale.discount && sale.discount.amount > 0) {
            message += `Subtotal: R$ ${(sale.total + sale.discount.amount).toFixed(2)}\n`;
            message += `Desconto: -R$ ${sale.discount.amount.toFixed(2)}\n`;
        }
        message += `*Total: R$ ${sale.total.toFixed(2)}*\n`;
        message += `Pagamento: ${sale.payment_method.replace('_', ' ').toUpperCase()}\n`;
        if (sale.payment_method === 'money') {
             message += `Recebido: R$ ${sale.received.toFixed(2)}\n`;
             message += `Troco: R$ ${sale.change.toFixed(2)}\n`;
        }
        message += `\nObrigado pela sua preferência!`;
        return encodeURIComponent(message);
    };

    const handleSendWhatsApp = () => {
        if (!saleCompletedData) return;
        const message = formatReceiptForWhatsApp(saleCompletedData);
        window.open(`https://wa.me/?text=${message}`, '_blank');
    };

    const handleSubmit = async () => {
        if (paymentMethod === 'money' && parseFloat(receivedAmount) < finalTotal) {
            addToast({ message: 'Valor recebido é menor que o total.', type: 'error' });
            return;
        }

        setIsLoading(true);
        const saleData: Omit<Sale, 'id' | 'created_at' | 'order_number' | 'market_id' | 'items'> = {
            total: finalTotal,
            payment_method: paymentMethod,
            received: paymentMethod === 'money' ? parseFloat(receivedAmount) : finalTotal,
            change: change,
            status: 'completed',
            operator_name: '',
            customer_id: customer?.id || null,
            customer_name: customer?.name,
            discount: discount > 0 ? { type: 'manual', amount: discount } : undefined,
        };

        const success = await onCompleteSale(saleData);
        setIsLoading(false);
        if (success) {
            // Reconstruct a temporary Sale object for the success screen
            setSaleCompletedData({ 
                ...saleData, 
                items: cart, 
                created_at: new Date().toISOString(), 
                order_number: 0, 
                id: '', 
                market_id: 0 
            });
        }
    };
    
    const paymentMethods: { id: PaymentMethod; name: string; icon: string }[] = [
        { id: 'money', name: 'Dinheiro', icon: 'cash' },
        { id: 'debit', name: 'Débito', icon: 'credit-card' },
        { id: 'credit', name: 'Crédito', icon: 'credit-card' },
        { id: 'pix', name: 'PIX', icon: 'qrcode' },
    ];
    
    if (saleCompletedData) {
        return (
             <Modal isOpen={isOpen} onClose={onClose} title="Venda Concluída com Sucesso!">
                <div className="p-6 text-center space-y-4">
                    <Icon name="check-circle" className="w-20 h-20 text-green-500 mx-auto"/>
                    <h2 className="text-2xl font-bold">Venda Finalizada!</h2>
                    <p className="text-gray-500 dark:text-gray-400">Total: R$ {saleCompletedData.total.toFixed(2)}</p>
                    {saleCompletedData.change > 0 && (
                        <p className="text-lg font-bold">Troco: <span className="text-primary">R$ {saleCompletedData.change.toFixed(2)}</span></p>
                    )}
                    <div className="flex gap-4 pt-4">
                        <button onClick={onClose} className="flex-1 p-3 bg-gray-600 text-white font-bold rounded-lg hover:bg-gray-700">Nova Venda</button>
                        <button onClick={handleSendWhatsApp} className="flex-1 p-3 bg-green-500 text-white font-bold rounded-lg hover:bg-green-600 flex items-center justify-center gap-2">
                            <Icon name="paper-airplane" className="w-5 h-5" />
                            Enviar WhatsApp
                        </button>
                    </div>
                </div>
            </Modal>
        )
    }

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Finalizar Venda">
            <div className="p-6">
                <div className="grid grid-cols-2 gap-4 items-center mb-6">
                     <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Total da Venda</p>
                        <p className="text-5xl font-extrabold text-primary">R$ {finalTotal.toFixed(2)}</p>
                        {discount > 0 && <p className="text-xs text-green-600 dark:text-green-400">Desconto de R$ {discount.toFixed(2)} aplicado.</p>}
                    </div>
                    {paymentMethod === 'money' && change > 0 && (
                        <div className="text-right">
                            <p className="text-sm text-gray-500 dark:text-gray-400">Troco</p>
                            <p className="text-4xl font-bold text-green-500">R$ {change.toFixed(2)}</p>
                        </div>
                    )}
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-2">Forma de Pagamento</label>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                           {paymentMethods.map(pm => (
                                <button key={pm.id} onClick={() => setPaymentMethod(pm.id)} className={`p-4 rounded-lg font-semibold border-2 transition flex flex-col items-center justify-center aspect-square ${paymentMethod === pm.id ? 'bg-primary/10 border-primary text-primary ring-2 ring-primary' : 'bg-gray-100 dark:bg-gray-700 border-transparent hover:border-gray-300 dark:hover:border-gray-500'}`}>
                                    <Icon name={pm.icon} className="w-8 h-8 mb-2" />
                                    <span>{pm.name}</span>
                                </button>
                           ))}
                           <div className="relative">
                               <button 
                                    onClick={() => setPaymentMethod('credit_account')} 
                                    className={`w-full p-4 rounded-lg font-semibold border-2 transition flex flex-col items-center justify-center aspect-square ${paymentMethod === 'credit_account' ? 'bg-primary/10 border-primary text-primary ring-2 ring-primary' : 'bg-gray-100 dark:bg-gray-700 border-transparent hover:border-gray-300 dark:hover:border-gray-500'} disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:text-gray-400 dark:disabled:text-gray-500 disabled:cursor-not-allowed disabled:border-gray-200`}
                                    disabled={!canUseCredit}
                                >
                                    <Icon name="receipt-percent" className="w-8 h-8 mb-2" />
                                    <span>Venda a Prazo</span>
                                </button>
                                {!customer && (
                                    <span className="absolute -bottom-4 left-0 text-xs text-gray-400">Identifique um cliente</span>
                                )}
                                {customer && !canUseCredit && (
                                    <span className="absolute -bottom-4 left-0 text-xs text-red-500">Crédito insuficiente</span>
                                )}
                           </div>
                        </div>
                    </div>
                    {paymentMethod === 'money' && (
                        <div>
                            <label htmlFor="received" className="block text-sm font-medium mb-2">Valor Recebido (R$)</label>
                            <input
                                type="number"
                                id="received"
                                value={receivedAmount}
                                onChange={e => setReceivedAmount(e.target.value)}
                                className="w-full p-3 text-xl font-bold rounded-lg bg-gray-100 dark:bg-gray-700 border-transparent focus:ring-2 focus:ring-primary"
                                placeholder="0.00"
                                autoFocus
                            />
                            <div className="flex gap-2 mt-2 text-xs">
                                <button onClick={() => setReceivedAmount(String(finalTotal.toFixed(2)))} className="px-2 py-1 bg-gray-200 dark:bg-gray-600 rounded-full">Exato</button>
                                {[5, 10, 20, 50, 100].filter(val => val > finalTotal).map(val => (
                                    <button key={val} onClick={() => setReceivedAmount(String(val))} className="px-2 py-1 bg-gray-200 dark:bg-gray-600 rounded-full">R$ {val}</button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
                
                <div className="mt-8">
                     <button
                        onClick={handleSubmit}
                        disabled={isLoading}
                        className="w-full p-4 bg-green-500 text-white text-lg font-bold rounded-lg hover:bg-green-600 disabled:opacity-50"
                    >
                        {isLoading ? 'Processando...' : 'Confirmar Pagamento'}
                    </button>
                </div>
            </div>
        </Modal>
    );
};

export default SaleCompletionModal;