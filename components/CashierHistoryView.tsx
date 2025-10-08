import React, { useState, useEffect, useMemo } from 'react';
import type { User, CashierSession } from '../types';
import { api } from '../services/api';
import { useToast } from '../App';
// FIX: Corrected import path for common components.
import { Modal, Icon } from './common';

interface CashierHistoryViewProps {
    user: User;
}

const CashierHistoryView: React.FC<CashierHistoryViewProps> = ({ user }) => {
    const [sessions, setSessions] = useState<CashierSession[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedSession, setSelectedSession] = useState<CashierSession | null>(null);
    const { addToast } = useToast();

    useEffect(() => {
        const fetchHistory = async () => {
            setIsLoading(true);
            try {
                const data = await api.getCashierHistory(user.market_id);
                setSessions(data);
            } catch (error) {
                addToast({ message: 'Falha ao buscar histórico de caixa.', type: 'error' });
            } finally {
                setIsLoading(false);
            }
        };
        fetchHistory();
    }, [user.market_id, addToast]);
    
    const handleViewDetails = (session: CashierSession) => {
        setSelectedSession(session);
    };

    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">Histórico de Caixa</h2>
            </div>

            <div className="overflow-x-auto relative">
                <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
                    <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                        <tr>
                            <th scope="col" className="px-6 py-3">Operador</th>
                            <th scope="col" className="px-6 py-3">Abertura</th>
                            <th scope="col" className="px-6 py-3">Fechamento</th>
                            <th scope="col" className="px-6 py-3">Total Vendas</th>
                            <th scope="col" className="px-6 py-3">Diferença</th>
                            <th scope="col" className="px-6 py-3">Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        {isLoading ? (
                            <tr><td colSpan={6} className="text-center p-6">Carregando...</td></tr>
                        ) : sessions.map(session => (
                            <tr key={session.id} className="bg-white dark:bg-gray-800 border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600/20">
                                <th scope="row" className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap dark:text-white">{session.operator_name}</th>
                                <td className="px-6 py-4">{new Date(session.start_time).toLocaleString('pt-BR')}</td>
                                <td className="px-6 py-4">{session.end_time ? new Date(session.end_time).toLocaleString('pt-BR') : '-'}</td>
                                <td className="px-6 py-4 font-semibold">R$ {session.calculated_sales_total.toFixed(2)}</td>
                                <td className={`px-6 py-4 font-bold ${session.difference === 0 ? 'text-green-500' : 'text-red-500'}`}>R$ {session.difference?.toFixed(2)}</td>
                                <td className="px-6 py-4">
                                    <button onClick={() => handleViewDetails(session)} className="font-medium text-primary dark:text-primary-400 hover:underline flex items-center gap-1">
                                        <Icon name="document-text" className="w-4 h-4"/> Detalhes
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                 { !isLoading && sessions.length === 0 && (
                    <div className="text-center py-10 text-gray-500">
                        <p>Nenhum histórico de caixa encontrado.</p>
                    </div>
                )}
            </div>
            
            {selectedSession && (
                <Modal isOpen={!!selectedSession} onClose={() => setSelectedSession(null)} title={`Detalhes do Caixa - ${selectedSession.operator_name}`} size="2xl">
                   <div className="p-6 space-y-4 text-gray-700 dark:text-gray-300">
                        <div className="grid grid-cols-2 gap-4 text-sm bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
                            <div><strong>Abertura:</strong> {new Date(selectedSession.start_time).toLocaleString('pt-BR')}</div>
                            <div><strong>Fechamento:</strong> {selectedSession.end_time ? new Date(selectedSession.end_time).toLocaleString('pt-BR') : ''}</div>
                             <div className="flex justify-between col-span-2"><span>Saldo Inicial:</span> <span className="font-semibold">R$ {selectedSession.opening_balance.toFixed(2)}</span></div>
                            <div className="flex justify-between col-span-2"><span>Valor Contado (Final):</span> <span className="font-semibold">R$ {selectedSession.closing_balance?.toFixed(2)}</span></div>
                            <div className="flex justify-between col-span-2"><span>Valor Calculado (Final):</span> <span className="font-semibold">R$ {selectedSession.calculated_closing_balance?.toFixed(2)}</span></div>
                            <div className={`flex justify-between font-bold text-lg col-span-2 ${selectedSession.difference === 0 ? 'text-green-500' : 'text-red-500'}`}>
                                <span>DIFERENÇA:</span> 
                                <span>R$ {selectedSession.difference?.toFixed(2)}</span>
                            </div>
                        </div>

                        <div>
                           <h4 className="font-semibold mb-2 mt-4">Extrato de Transações:</h4>
                           <div className="max-h-60 overflow-y-auto border rounded-lg">
                                <table className="w-full text-sm">
                                    <thead className="bg-gray-100 dark:bg-gray-700">
                                        <tr>
                                            <th className="p-2 text-left">Horário</th>
                                            <th className="p-2 text-left">Tipo</th>
                                            <th className="p-2 text-left">Valor</th>
                                            <th className="p-2 text-left">Observação</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {selectedSession.transactions.map(t => (
                                            <tr key={t.id} className="border-b dark:border-gray-700">
                                                <td className="p-2">{new Date(t.timestamp).toLocaleTimeString('pt-BR')}</td>
                                                <td className="p-2 font-medium capitalize">{t.type} {t.payment_method && `(${t.payment_method})`}</td>
                                                <td className={`p-2 font-semibold ${t.type === 'sangria' ? 'text-red-500' : t.type === 'suprimento' ? 'text-green-500' : ''}`}>
                                                    {t.type === 'sangria' ? '-' : '+'} R$ {t.amount.toFixed(2)}
                                                </td>
                                                <td className="p-2 text-xs">{t.notes}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                           </div>
                        </div>
                   </div>
                </Modal>
            )}
        </div>
    );
};

export default CashierHistoryView;