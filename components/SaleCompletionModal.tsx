import React, { useState, useMemo, useEffect } from 'react';
import type { CartItem, Customer, Sale, PaymentMethod, User, Market } from '../types';
import { Icon, Modal } from './common';
import { useToast } from '../App';
import { api } from '../services/api';

interface SaleCompletionModalProps {
    isOpen: boolean;
    onClose: () => void;
    cart: CartItem[];
    customer: Customer | null;
    user: User; 
    onCompleteSale: (saleData: Omit<Sale, 'id' | 'created_at' | 'order_number' | 'market_id' | 'items' | 'operator_id'>) => Promise<boolean>;
}

const SaleCompletionModal: React.FC<SaleCompletionModalProps> = ({ isOpen, onClose, cart, customer, user, onCompleteSale }) => {
    const { addToast } = useToast();
    
    const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('money');
    const [receivedAmount, setReceivedAmount] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [saleCompletedData, setSaleCompletedData] = useState<Sale | null>(null);
    const [market, setMarket] = useState<Market | null>(null);
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
        const fetchMarket = async () => {
            if (isOpen && user) {
                const marketData = await api.getMarket(user.market_id);
                setMarket(marketData);
            }
        };

        if (isOpen) {
            setPaymentMethod('money');
            setReceivedAmount('');
            setDiscount(0);
            setIsLoading(false);
            setSaleCompletedData(null);
            fetchMarket();
        }
    }, [isOpen, user]);

    const formatReceiptText = (sale: Sale, target: 'whatsapp' | 'print') => {
        const line = target === 'whatsapp' ? '\n' : '<br>';
        const boldStart = target === 'whatsapp' ? '*' : '<b>';
        const boldEnd = target === 'whatsapp' ? '*' : '</b>';
        let text = `${boldStart}${market?.name || 'Recibo PDVMarket'}${boldEnd}${line}`;
        if (market?.cnpj) text += `CNPJ: ${market.cnpj}${line}`;
        if (market?.address) text += `${market.address}, ${market.city}${line}`;
        if (market?.phone) text += `Tel: ${market.phone}${line}`;
        text += `------------------------${line}`;
        text += `Data: ${new Date(sale.created_at).toLocaleString('pt-BR')}${line}`;
        if (sale.customer_name) {
            text += `Cliente: ${sale.customer_name}${line}`;
        }
        text += `------------------------${line}`;
        text += `${boldStart}Itens:${boldEnd}${line}`;
        sale.items.forEach(item => {
            text += `${item.qty}x ${item.name} - R$ ${(item.price * item.qty).toFixed(2)}${line}`;
        });
        text += line;
        if (sale.discount && sale.discount.amount > 0) {
            text += `Subtotal: R$ ${(sale.total + sale.discount.amount).toFixed(2)}${line}`;
            text += `Desconto: -R$ ${sale.discount.amount.toFixed(2)}${line}`;
        }
        text += `${boldStart}Total: R$ ${sale.total.toFixed(2)}${boldEnd}${line}`;
        text += `Pagamento: ${sale.payment_method.replace('_', ' ').toUpperCase()}${line}`;
        if (sale.payment_method === 'money') {
             text += `Recebido: R$ ${sale.received.toFixed(2)}${line}`;
             text += `Troco: R$ ${sale.change.toFixed(2)}${line}`;
        }
        text += `${line}Obrigado pela sua preferência!`;
        return text;
    };

    const handleSendWhatsApp = () => {
        if (!saleCompletedData) return;
        const message = encodeURIComponent(formatReceiptText(saleCompletedData, 'whatsapp'));
        window.open(`https://wa.me/?text=${message}`, '_blank');
    };
    
    const handlePrintReceipt = () => {
        if (!saleCompletedData || !market) return;
    
        const printWindow = window.open('', '_blank', 'width=320,height=500');
        if (!printWindow) {
            addToast({ message: 'Por favor, habilite pop-ups para imprimir.', type: 'warning' });
            return;
        }

        const receiptHTML = `
            <html>
            <head>
                <title>Recibo</title>
                <style>
                    body { font-family: 'Courier New', Courier, monospace; width: 300px; margin: 0 auto; padding: 10px; color: #000; }
                    .header { text-align: center; }
                    .header img { max-width: 150px; margin-bottom: 10px; }
                    .header h2 { margin: 0; font-size: 1.2em; }
                    .header p { margin: 2px 0; font-size: 0.8em; }
                    hr { border: none; border-top: 1px dashed #000; margin: 5px 0; }
                    .info { font-size: 0.8em; }
                    .items-table { width: 100%; border-collapse: collapse; margin: 10px 0; }
                    .items-table th, .items-table td { font-size: 0.8em; padding: 2px; text-align: left; }
                    .items-table .header-row th { border-top: 1px dashed #000; border-bottom: 1px dashed #000; }
                    .total-section { text-align: right; margin-top: 10px; font-size: 0.9em; }
                    .total-section .total { font-weight: bold; font-size: 1.1em; }
                    .footer { text-align: center; margin-top: 20px; font-size: 0.8em; }
                    @media print {
                        @page { margin: 0; }
                        body { margin: 0.5cm; }
                    }
                </style>
            </head>
            <body>
                <div class="header">
                    ${market.logo_url ? `<img src="${market.logo_url}" alt="Logo">` : ''}
                    <h2>${market.name}</h2>
                    ${market.address ? `<p>${market.address}, ${market.city}</p>` : ''}
                    ${market.cnpj ? `<p>CNPJ: ${market.cnpj}</p>` : ''}
                    ${market.phone ? `<p>Tel: ${market.phone}</p>` : ''}
                </div>
                <hr>
                <div class="info">
                    <p>CUPOM NÃO FISCAL</p>
                    <p>Data: ${new Date(saleCompletedData.created_at).toLocaleString('pt-BR')}</p>
                </div>
                <hr>
                <table class="items-table">
                    <thead><tr class="header-row"><th>Item</th><th>Qtd</th><th>Preço</th><th>Total</th></tr></thead>
                    <tbody>
                        ${saleCompletedData.items.map(item => `<tr><td>${item.name}</td><td>${item.qty}</td><td>${item.price.toFixed(2)}</td><td>${(item.price * item.qty).toFixed(2)}</td></tr>`).join('')}
                    </tbody>
                </table>
                <hr>
                <div class="total-section">
                    ${saleCompletedData.discount ? `<p>Subtotal: R$ ${(saleCompletedData.total + saleCompletedData.discount.amount).toFixed(2)}</p><p>Desconto: - R$ ${saleCompletedData.discount.amount.toFixed(2)}</p>` : ''}
                    <p>TOTAL: <span class="total">R$ ${saleCompletedData.total.toFixed(2)}</span></p>
                    <p>Pagamento: ${saleCompletedData.payment_method.toUpperCase()}</p>
                    ${saleCompletedData.payment_method === 'money' ? `<p>Recebido: R$ ${saleCompletedData.received.toFixed(2)}</p><p>Troco: R$ ${saleCompletedData.change.toFixed(2)}</p>` : ''}
                </div>
                <hr>
                <div class="footer">
                    <p>Obrigado pela preferência!</p>
                </div>
            </body>
            </html>
        `;

        printWindow.document.write(receiptHTML);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => {
            printWindow.print();
            printWindow.close();
        }, 250);
    };

    const handleSubmit = async () => {
        if (paymentMethod === 'money' && parseFloat(receivedAmount) < finalTotal) {
            addToast({ message: 'Valor recebido é menor que o total.', type: 'error' });
            return;
        }

        setIsLoading(true);
        // FIX: Added operator_id and corrected operator_name.
        const saleData: Omit<Sale, 'id' | 'created_at' | 'order_number' | 'market_id' | 'items'> = {
            total: finalTotal,
            payment_method: paymentMethod,
            received: paymentMethod === 'money' ? parseFloat(receivedAmount) : finalTotal,
            change: change,
            status: 'completed',
            operator_id: user.id,
            operator_name: user.name,
            customer_id: customer?.id || null,
            customer_name: customer?.name,
            discount: discount > 0 ? { type: 'manual', amount: discount } : undefined,
        };
        // @ts-ignore
        const success = await onCompleteSale(saleData);
        setIsLoading(false);
        if (success) {
            // Reconstruct a temporary Sale object for the success screen
            setSaleCompletedData({ 
                ...saleData, 
                items: cart, 
                created_at: new Date().toISOString(), 
                order_number: 0, 
                id: 0, 
                market_id: user.market_id 
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
                    <div className="flex flex-col sm:flex-row gap-4 pt-4">
                        <button onClick={onClose} className="w-full p-3 bg-gray-600 text-white font-bold rounded-lg hover:bg-gray-700">Nova Venda</button>
                        <button onClick={handleSendWhatsApp} className="w-full p-3 bg-green-500 text-white font-bold rounded-lg hover:bg-green-600 flex items-center justify-center gap-2">
                            <Icon name="paper-airplane" className="w-5 h-5" />
                            WhatsApp
                        </button>
                         <button onClick={handlePrintReceipt} className="w-full p-3 bg-blue-500 text-white font-bold rounded-lg hover:bg-blue-600 flex items-center justify-center gap-2">
                            <Icon name="document-text" className="w-5 h-5" />
                            Imprimir
                        </button>
                        <button onClick={() => addToast({ message: 'Funcionalidade de e-mail requer configuração de servidor.', type: 'info'})} className="w-full p-3 bg-orange-500 text-white font-bold rounded-lg hover:bg-orange-600 flex items-center justify-center gap-2">
                           <Icon name="paper-airplane" className="w-5 h-5" />
                            E-mail
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