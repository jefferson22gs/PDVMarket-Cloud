
import React, { useState, useEffect, useMemo } from 'react';
import type { User, Sale, PaymentMethod } from '../types';
import { api } from '../services/api';
import { useToast } from '../App';
// FIX: Corrected import path for common components.
import { Modal, Icon } from './common';

interface SalesViewProps {
    user: User;
}

type DateFilter = 'all' | 'today' | 'week' | 'month';

const SalesView: React.FC<SalesViewProps> = ({ user }) => {
    const [sales, setSales] = useState<Sale[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
    const [dateFilter, setDateFilter] = useState<DateFilter>('all');
    const [paymentFilter, setPaymentFilter] = useState<PaymentMethod | 'all'>('all');

    const { addToast } = useToast();

    useEffect(() => {
        const fetchSales = async () => {
            setIsLoading(true);
            try {
                const data = await api.getSales(user.market_id);
                setSales(data);
            } catch (error) {
                addToast({ message: 'Falha ao buscar histórico de vendas.', type: 'error' });
            } finally {
                setIsLoading(false);
            }
        };
        fetchSales();
    }, [user.market_id, addToast]);
    
    const handleViewDetails = (sale: Sale) => {
        setSelectedSale(sale);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setSelectedSale(null);
    };

    const filteredSales = useMemo(() => {
        let result = [...sales];

        // Date filtering
        if (dateFilter !== 'all') {
            const now = new Date();
            const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

            if (dateFilter === 'today') {
                 result = result.filter(s => new Date(s.created_at) >= today);
            } else if (dateFilter === 'week') {
                const firstDayOfWeek = new Date(today);
                // Adjust to start from Sunday (or Monday, depending on locale)
                firstDayOfWeek.setDate(today.getDate() - today.getDay()); 
                result = result.filter(s => new Date(s.created_at) >= firstDayOfWeek);
            } else if (dateFilter === 'month') {
                const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
                result = result.filter(s => new Date(s.created_at) >= firstDayOfMonth);
            }
        }

        // Payment method filtering
        if (paymentFilter !== 'all') {
            result = result.filter(s => s.payment_method === paymentFilter);
        }

        // Search term filtering
        if (searchTerm) {
            const lowercasedTerm = searchTerm.toLowerCase();
            result = result.filter(s =>
                s.operator_name.toLowerCase().includes(lowercasedTerm) ||
                String(s.order_number).includes(lowercasedTerm)
            );
        }
        
        return result;
    }, [sales, searchTerm, dateFilter, paymentFilter]);

    const filteredTotal = useMemo(() => {
        return filteredSales.reduce((sum, sale) => sum + sale.total, 0);
    }, [filteredSales]);


    const exportToCSV = () => {
        const headers = ["Pedido Nº", "Data", "Operador", "Total (R$)", "Pagamento", "Itens"];
        const rows = filteredSales.map(sale => [
            sale.order_number,
            `"${new Date(sale.created_at).toLocaleString('pt-BR')}"`,
            `"${sale.operator_name}"`,
            sale.total.toFixed(2).replace('.',','),
            sale.payment_method.toUpperCase(),
            `"${sale.items.map(item => `${item.qty}x ${item.name}`).join('; ')}"`
        ]);

        let csvContent = "data:text/csv;charset=utf-8,"
            + headers.join(",") + "\n"
            + rows.map(e => e.join(",")).join("\n");

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `relatorio_vendas_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        addToast({ message: 'Relatório CSV gerado!', type: 'success' });
    };

    const exportToPDF = () => {
        const reportTitle = "Relatório de Vendas";
        const now = new Date().toLocaleString('pt-BR');
        
        const printWindow = window.open('', '_blank');
        if(!printWindow) {
            addToast({ message: 'Por favor, habilite pop-ups para gerar o PDF.', type: 'warning' });
            return;
        }

        printWindow.document.write(`<html><head><title>${reportTitle}</title>`);
        printWindow.document.write(`<style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; margin: 20px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; font-size: 12px; }
            th { background-color: #f2f2f2; }
            h1 { text-align: center; } h2 { text-align: center; font-weight: normal; font-size: 14px; color: #555; margin-top: -10px; }
            @media print { body { -webkit-print-color-adjust: exact; } }
        </style></head><body>`);
        
        printWindow.document.write(`<h1>${reportTitle}</h1><h2>Gerado em: ${now}</h2>`);
        
        let tableHTML = '<table><thead><tr>';
        const headers = ["Pedido Nº", "Data", "Operador", "Total (R$)", "Pagamento"];
        headers.forEach(h => tableHTML += `<th>${h}</th>`);
        tableHTML += '</tr></thead><tbody>';

        filteredSales.forEach(sale => {
            tableHTML += `<tr>
                <td>#${sale.order_number}</td>
                <td>${new Date(sale.created_at).toLocaleString('pt-BR')}</td>
                <td>${sale.operator_name}</td>
                <td>R$ ${sale.total.toFixed(2)}</td>
                <td>${sale.payment_method.toUpperCase()}</td>
            </tr>`;
        });

        tableHTML += '</tbody></table>';
        printWindow.document.write(tableHTML);
        printWindow.document.write('</body></html>');

        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => { // Timeout needed for some browsers
            printWindow.print();
            printWindow.close();
        }, 250);
    };


    const dateFilterOptions: { key: DateFilter, label: string }[] = [
        { key: 'all', label: 'Todos' },
        { key: 'today', label: 'Hoje' },
        { key: 'week', label: 'Esta Semana' },
        { key: 'month', label: 'Este Mês' },
    ];
    
    const paymentOptions: {key: PaymentMethod | 'all', label: string}[] = [
        { key: 'all', label: 'Todos'},
        { key: 'money', label: 'Dinheiro'},
        { key: 'debit', label: 'Débito'},
        { key: 'credit', label: 'Crédito'},
        { key: 'pix', label: 'PIX'},
    ]

    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 space-y-4">
            <div className="flex justify-between items-start">
                <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">Histórico de Vendas</h2>
                 <div className="flex items-center gap-2">
                     <button onClick={exportToCSV} className="flex items-center gap-2 px-3 py-2 text-sm bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition" disabled={filteredSales.length === 0}>
                        <Icon name="arrow-down-tray" className="w-4 h-4" /> CSV
                    </button>
                    <button onClick={exportToPDF} className="flex items-center gap-2 px-3 py-2 text-sm bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition" disabled={filteredSales.length === 0}>
                        <Icon name="arrow-down-tray" className="w-4 h-4" /> PDF
                    </button>
                 </div>
            </div>

            {/* Filters */}
            <div className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg space-y-4 md:space-y-0 md:flex md:items-center md:justify-between gap-4">
                <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold mr-2">Período:</span>
                    {dateFilterOptions.map(opt => (
                        <button key={opt.key} onClick={() => setDateFilter(opt.key)} className={`px-3 py-1 text-sm rounded-full font-medium transition ${dateFilter === opt.key ? 'bg-primary text-white' : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600'}`}>
                            {opt.label}
                        </button>
                    ))}
                </div>
                 <div className="flex items-center gap-2">
                     <select value={paymentFilter} onChange={e => setPaymentFilter(e.target.value as any)} className="p-2 text-sm rounded-md bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-primary focus:border-transparent">
                        {paymentOptions.map(opt => <option key={opt.key} value={opt.key}>{opt.label}</option>)}
                    </select>
                    <input
                        type="text"
                        placeholder="Buscar por Nº ou operador..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="p-2 text-sm w-48 rounded-md bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-primary focus:border-transparent"
                    />
                 </div>
            </div>

            {/* Summary */}
            <div className="p-2 bg-primary/10 dark:bg-primary/20 rounded-lg text-center text-sm font-semibold text-primary dark:text-primary-200">
                Mostrando <span className="font-bold">{filteredSales.length}</span> vendas, totalizando <span className="font-bold">R$ {filteredTotal.toFixed(2)}</span>
            </div>


            {/* Table */}
            <div className="overflow-x-auto relative">
                <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
                    <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                        <tr>
                            <th scope="col" className="px-6 py-3">Pedido Nº</th>
                            <th scope="col" className="px-6 py-3">Data</th>
                            <th scope="col" className="px-6 py-3">Operador</th>
                            <th scope="col" className="px-6 py-3">Total</th>
                            <th scope="col" className="px-6 py-3">Pagamento</th>
                            <th scope="col" className="px-6 py-3">Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        {isLoading ? (
                            <tr><td colSpan={6} className="text-center p-6">Carregando...</td></tr>
                        ) : filteredSales.map(sale => (
                            <tr key={sale.id} className="bg-white dark:bg-gray-800 border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600/20">
                                <th scope="row" className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap dark:text-white">#{sale.order_number}</th>
                                <td className="px-6 py-4">{new Date(sale.created_at).toLocaleString('pt-BR')}</td>
                                <td className="px-6 py-4">{sale.operator_name}</td>
                                <td className="px-6 py-4 font-bold">R$ {sale.total.toFixed(2)}</td>
                                <td className="px-6 py-4">
                                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                                        sale.payment_method === 'money' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' :
                                        sale.payment_method === 'credit' ? 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300' :
                                        sale.payment_method === 'debit' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300' :
                                        'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300'
                                    }`}>
                                        {sale.payment_method.toUpperCase()}
                                    </span>
                                </td>
                                <td className="px-6 py-4">
                                    <button onClick={() => handleViewDetails(sale)} className="font-medium text-primary dark:text-primary-400 hover:underline flex items-center gap-1">
                                        <Icon name="document-text" className="w-4 h-4"/> Detalhes
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                 { !isLoading && filteredSales.length === 0 && (
                    <div className="text-center py-10 text-gray-500">
                        <p>Nenhuma venda encontrada para os filtros selecionados.</p>
                    </div>
                )}
            </div>
            
            {selectedSale && (
                <Modal isOpen={isModalOpen} onClose={handleCloseModal} title={`Detalhes do Pedido #${selectedSale.order_number}`}>
                   <div className="p-6 space-y-4 text-gray-700 dark:text-gray-300">
                        <p><strong>Operador:</strong> {selectedSale.operator_name}</p>
                        <p><strong>Data:</strong> {new Date(selectedSale.created_at).toLocaleString('pt-BR')}</p>
                        
                        <div className="border-t border-b border-gray-200 dark:border-gray-700 py-2 my-2">
                           <h4 className="font-semibold mb-2">Itens:</h4>
                           <ul className="space-y-1">
                                {selectedSale.items.map(item => (
                                    <li key={item.id} className="flex justify-between items-center text-sm">
                                        <span>{item.qty}x {item.name}</span>
                                        <span>R$ {(item.price * item.qty).toFixed(2)}</span>
                                    </li>
                                ))}
                           </ul>
                        </div>
                        
                        <div className="space-y-1 font-medium">
                            <div className="flex justify-between">
                                <span>Subtotal</span>
                                <span>R$ {(selectedSale.total + (selectedSale.discount?.amount || 0)).toFixed(2)}</span>
                            </div>
                            {selectedSale.discount && (
                                <div className="flex justify-between text-green-600 dark:text-green-400">
                                    <span>Desconto ({selectedSale.discount.description})</span>
                                    <span>- R$ {selectedSale.discount.amount.toFixed(2)}</span>
                                </div>
                            )}
                            <div className="flex justify-between text-lg font-bold text-primary">
                                <span>TOTAL</span>
                                <span>R$ {selectedSale.total.toFixed(2)}</span>
                            </div>
                        </div>

                        <div className="text-sm border-t pt-2 border-gray-200 dark:border-gray-700">
                             <div className="flex justify-between">
                                <span>Método de Pagamento:</span>
                                <span>{selectedSale.payment_method.toUpperCase()}</span>
                            </div>
                             <div className="flex justify-between">
                                <span>Valor Recebido:</span>
                                <span>R$ {selectedSale.received.toFixed(2)}</span>
                            </div>
                             <div className="flex justify-between">
                                <span>Troco:</span>
                                <span>R$ {selectedSale.change.toFixed(2)}</span>
                            </div>
                        </div>

                   </div>
                </Modal>
            )}

        </div>
    );
};

export default SalesView;
