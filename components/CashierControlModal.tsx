import React, { useState, useMemo } from 'react';
import type { User, CashierSession, CashierTransaction, PaymentMethod } from '../types';
import { api } from '../services/api';
import { useToast } from '../App';
// FIX: Corrected import path for common components.
import { Modal } from './common';

interface CashierControlModalProps {
    isOpen: boolean;
    onClose: () => void;
    session: CashierSession | null;
    user: User;
    onSessionStarted: (session: CashierSession) => void;
    onTransactionAdded: (session: CashierSession) => void;
    onSessionClosed: () => void;
}

const OpenCashierView: React.FC<{ user: User; onSessionStarted: (session: CashierSession) => void; }> = ({ user, onSessionStarted }) => {
    const [openingBalance, setOpeningBalance] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const { addToast } = useToast();
    
    const handleStartSession = async (e: React.FormEvent) => {
        e.preventDefault();
        const balance = parseFloat(openingBalance);
        if (isNaN(balance) || balance < 0) {
            addToast({ message: 'Por favor, insira um valor de abertura válido.', type: 'error' });
            return;
        }
        setIsLoading(true);
        try {
            const newSession = await api.startCashierSession({
                operator_id: user.id,
                operator_name: user.name,
                market_id: user.market_id,
                opening_balance: balance
            });
            addToast({ message: 'Caixa aberto com sucesso!', type: 'success' });
            onSessionStarted(newSession);
        } catch (error) {
            addToast({ message: error instanceof Error ? error.message : 'Falha ao abrir o caixa.', type: 'error' });
        } finally {
            setIsLoading(false);
        }
    };
    
    return (
         <div className="p-6">
            <h3 className="text-lg font-bold mb-4">Abrir Caixa</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">Insira o valor inicial em dinheiro no caixa para começar o turno.</p>
            <form onSubmit={handleStartSession}>
                <label htmlFor="opening_balance" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Valor de Abertura (R$)</label>
                <input
                    type="number"
                    id="opening_balance"
                    value={openingBalance}
                    onChange={(e) => setOpeningBalance(e.target.value)}
                    className="mt-1 block w-full rounded-md bg-white/10 dark:bg-black/20 border-gray-300 dark:border-gray-600 shadow-sm focus:border-primary focus:ring-primary sm:text-sm p-2"
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                    required
                    autoFocus
                />
                <button type="submit" disabled={isLoading} className="mt-6 w-full p-3 bg-primary text-white font-bold rounded-lg hover:bg-primary/90 disabled:opacity-50">
                    {isLoading ? 'Abrindo...' : 'Iniciar Turno'}
                </button>
            </form>
        </div>
    );
};

const ActiveSessionView: React.FC<Omit<CashierControlModalProps, 'isOpen'>> = ({ session, onClose, user, onTransactionAdded, onSessionClosed }) => {
    const [activeTab, setActiveTab] = useState<'summary' | 'actions' | 'close'>('summary');
    const [amount, setAmount] = useState('');
    const [notes, setNotes] = useState('');
    const [closingBalance, setClosingBalance] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [closedSummary, setClosedSummary] = useState<CashierSession | null>(null);
    const { addToast } = useToast();

    const summary = useMemo(() => {
        if (!session) return null;
        const salesByPayment = session.transactions
            .filter(t => t.type === 'sale')
            .reduce((acc, t) => {
                const method = t.payment_method || 'money';
                acc[method] = (acc[method] || 0) + t.amount;
                return acc;
            }, {} as Record<PaymentMethod, number>);

        const suprimentos = session.transactions.filter(t => t.type === 'suprimento').reduce((sum, t) => sum + t.amount, 0);
        const sangrias = session.transactions.filter(t => t.type === 'sangria').reduce((sum, t) => sum + t.amount, 0);
        const totalSales = Object.values(salesByPayment).reduce((sum, a) => sum + a, 0);
        const expectedCash = session.opening_balance + (salesByPayment.money || 0) + suprimentos - sangrias;

        return { salesByPayment, suprimentos, sangrias, totalSales, expectedCash };
    }, [session]);

    const handleAddTransaction = async (type: 'suprimento' | 'sangria') => {
        const transactionAmount = parseFloat(amount);
        if(isNaN(transactionAmount) || transactionAmount <= 0) {
            addToast({ message: 'Valor inválido.', type: 'error' });
            return;
        }
        setIsLoading(true);
        try {
            const updatedSession = await api.addCashierTransaction(session!.id, {
                type,
                amount: transactionAmount,
                notes,
            });
            onTransactionAdded(updatedSession);
            addToast({ message: `${type === 'suprimento' ? 'Suprimento' : 'Sangria'} adicionada com sucesso.`, type: 'success' });
            setAmount('');
            setNotes('');
        } catch (error) {
             addToast({ message: 'Erro ao adicionar transação.', type: 'error' });
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleCloseSession = async () => {
        const balance = parseFloat(closingBalance);
        if (isNaN(balance) || balance < 0) {
            addToast({ message: 'Valor de fechamento inválido.', type: 'error' });
            return;
        }
        if (!window.confirm('Tem certeza que deseja fechar o caixa? Esta ação não pode ser desfeita.')) return;

        setIsLoading(true);
        try {
            const closedSessionData = await api.closeCashierSession(session!.id, balance);
            setClosedSummary(closedSessionData);
        } catch (error) {
             addToast({ message: 'Erro ao fechar o caixa.', type: 'error' });
        } finally {
            setIsLoading(false);
        }
    };
    
    if (closedSummary) {
        return (
            <div className="p-6">
                <h3 className="text-lg font-bold mb-4 text-center">Caixa Fechado</h3>
                <div className="space-y-2 text-sm bg-gray-100 dark:bg-gray-700 p-4 rounded-lg">
                    <div className="flex justify-between"><span>Valor Esperado em Caixa:</span> <span className="font-semibold">R$ {closedSummary.calculated_closing_balance?.toFixed(2)}</span></div>
                    <div className="flex justify-between"><span>Valor Contado:</span> <span className="font-semibold">R$ {closedSummary.closing_balance?.toFixed(2)}</span></div>
                    <hr className="border-gray-300 dark:border-gray-600"/>
                    <div className={`flex justify-between font-bold text-lg ${closedSummary.difference === 0 ? 'text-green-500' : 'text-red-500'}`}>
                        <span>DIFERENÇA:</span> 
                        <span>R$ {closedSummary.difference?.toFixed(2)}</span>
                    </div>
                </div>
                <button onClick={() => { onSessionClosed(); onClose(); }} className="mt-6 w-full p-3 bg-primary text-white font-bold rounded-lg hover:bg-primary/90">
                    Ok, Entendi
                </button>
            </div>
        );
    }

    return (
        <div>
            <div className="border-b border-gray-200 dark:border-gray-700 flex">
                <button onClick={() => setActiveTab('summary')} className={`px-4 py-3 font-semibold text-sm flex-1 ${activeTab === 'summary' ? 'border-b-2 border-primary text-primary' : 'text-gray-500'}`}>Resumo</button>
                <button onClick={() => setActiveTab('actions')} className={`px-4 py-3 font-semibold text-sm flex-1 ${activeTab === 'actions' ? 'border-b-2 border-primary text-primary' : 'text-gray-500'}`}>Movimentar</button>
                <button onClick={() => setActiveTab('close')} className={`px-4 py-3 font-semibold text-sm flex-1 ${activeTab === 'close' ? 'border-b-2 border-primary text-primary' : 'text-gray-500'}`}>Fechar Caixa</button>
            </div>
            <div className="p-6">
                {activeTab === 'summary' && summary && (
                    <div className="space-y-3 text-gray-700 dark:text-gray-200">
                        <div className="flex justify-between text-lg"><span>Saldo Inicial:</span> <span className="font-bold">R$ {session?.opening_balance.toFixed(2)}</span></div>
                        <div className="pl-4 border-l-2">
                           <h4 className="font-semibold text-sm mb-1">Vendas:</h4>
                            {Object.entries(summary.salesByPayment).map(([method, total]) => (
                                <div key={method} className="flex justify-between text-sm"><span>{method.toUpperCase()}:</span> <span>R$ {total.toFixed(2)}</span></div>
                            ))}
                        </div>
                        <div className="flex justify-between text-sm"><span>(+) Suprimentos:</span> <span className="text-green-500">R$ {summary.suprimentos.toFixed(2)}</span></div>
                        <div className="flex justify-between text-sm"><span>(-) Sangrias:</span> <span className="text-red-500">R$ {summary.sangrias.toFixed(2)}</span></div>
                        <hr className="border-gray-300 dark:border-gray-600 my-2"/>
                         <div className="flex justify-between text-xl font-bold"><span>Total em Caixa (Esperado):</span> <span className="text-primary">R$ {summary.expectedCash.toFixed(2)}</span></div>
                    </div>
                )}
                 {activeTab === 'actions' && (
                    <div className="space-y-6">
                        <div>
                             <h4 className="font-semibold mb-2">Adicionar Suprimento/Sangria</h4>
                             <input type="number" placeholder="Valor (R$)" value={amount} onChange={e=>setAmount(e.target.value)} className="w-full p-2 rounded-md bg-white/10 dark:bg-black/20 border-gray-300 dark:border-gray-600 shadow-sm" />
                             <input type="text" placeholder="Observação (Opcional)" value={notes} onChange={e=>setNotes(e.target.value)} className="w-full p-2 mt-2 rounded-md bg-white/10 dark:bg-black/20 border-gray-300 dark:border-gray-600 shadow-sm" />
                             <div className="grid grid-cols-2 gap-4 mt-4">
                                 <button onClick={() => handleAddTransaction('suprimento')} disabled={isLoading} className="p-2 bg-green-500 text-white font-bold rounded-lg hover:bg-green-600 disabled:opacity-50">Adicionar Suprimento</button>
                                <button onClick={() => handleAddTransaction('sangria')} disabled={isLoading} className="p-2 bg-red-500 text-white font-bold rounded-lg hover:bg-red-600 disabled:opacity-50">Realizar Sangria</button>
                             </div>
                        </div>
                    </div>
                )}
                {activeTab === 'close' && (
                    <div>
                        <h4 className="font-semibold mb-2">Fechar Caixa</h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">Conte todo o dinheiro na gaveta e insira o valor total abaixo para fechar o caixa.</p>
                         <label htmlFor="closing_balance" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Valor Contado (R$)</label>
                        <input
                            type="number"
                            id="closing_balance"
                            value={closingBalance}
                            onChange={(e) => setClosingBalance(e.target.value)}
                            className="mt-1 block w-full rounded-md bg-white/10 dark:bg-black/20 border-gray-300 dark:border-gray-600 shadow-sm focus:border-primary focus:ring-primary sm:text-sm p-2"
                            placeholder="0.00"
                            min="0"
                            step="0.01"
                            required
                        />
                         <button onClick={handleCloseSession} disabled={isLoading} className="mt-6 w-full p-3 bg-danger text-white font-bold rounded-lg hover:bg-danger/90 disabled:opacity-50">
                            {isLoading ? 'Fechando...' : 'Confirmar e Fechar Caixa'}
                        </button>
                    </div>
                )}
            </div>
        </div>
    )
}


const CashierControlModal: React.FC<CashierControlModalProps> = (props) => {
    const { isOpen, onClose, session } = props;
    
    return (
        <Modal 
            isOpen={isOpen}
            onClose={onClose}
            title={session ? `Caixa Aberto - ${session.operator_name}` : "Controle de Caixa"}
            persistent={!session} // Prevent closing if no session is active
            size={session ? 'xl' : 'md'}
        >
           {session ? <ActiveSessionView {...props} /> : <OpenCashierView user={props.user} onSessionStarted={props.onSessionStarted} />}
        </Modal>
    );
};

export default CashierControlModal;