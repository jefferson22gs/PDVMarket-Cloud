import React, { useState, useEffect, useMemo } from 'react';
import type { User, Product } from '../types';
import { api } from '../services/api';
import { useToast } from '../App';
import { Modal, Icon } from './common';

interface ProductsViewProps {
    user: User;
    lowStockThreshold: number;
}

const ProductForm: React.FC<{ product: Partial<Product> | null; onSave: (product: Omit<Product, 'id' | 'market_id'>) => void; onCancel: () => void; }> = ({ product, onSave, onCancel }) => {
    const [formData, setFormData] = useState({
        name: product?.name || '',
        code: product?.code || '',
        price: product?.price || 0,
        cost: product?.cost || 0,
        stock: product?.stock || 0,
        expiry_date: product?.expiry_date || '',
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value, type } = e.target;
        setFormData(prev => ({ ...prev, [name]: type === 'number' ? parseFloat(value) : value }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(formData);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4 p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Nome do Produto</label>
                    <input type="text" name="name" id="name" value={formData.name} onChange={handleChange} required className="mt-1 block w-full rounded-md bg-white/10 dark:bg-black/20 border-gray-300 dark:border-gray-600 shadow-sm focus:border-primary focus:ring-primary sm:text-sm p-2"/>
                </div>
                 <div>
                    <label htmlFor="code" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Código/SKU</label>
                    <input type="text" name="code" id="code" value={formData.code} onChange={handleChange} required className="mt-1 block w-full rounded-md bg-white/10 dark:bg-black/20 border-gray-300 dark:border-gray-600 shadow-sm focus:border-primary focus:ring-primary sm:text-sm p-2"/>
                </div>
                <div>
                    <label htmlFor="price" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Preço (R$)</label>
                    <input type="number" name="price" id="price" value={formData.price} onChange={handleChange} required min="0" step="0.01" className="mt-1 block w-full rounded-md bg-white/10 dark:bg-black/20 border-gray-300 dark:border-gray-600 shadow-sm focus:border-primary focus:ring-primary sm:text-sm p-2"/>
                </div>
                <div>
                    <label htmlFor="cost" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Custo (R$)</label>
                    <input type="number" name="cost" id="cost" value={formData.cost} onChange={handleChange} required min="0" step="0.01" className="mt-1 block w-full rounded-md bg-white/10 dark:bg-black/20 border-gray-300 dark:border-gray-600 shadow-sm focus:border-primary focus:ring-primary sm:text-sm p-2"/>
                </div>
                 <div>
                    <label htmlFor="stock" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Estoque</label>
                    <input type="number" name="stock" id="stock" value={formData.stock} onChange={handleChange} required min="0" step="1" className="mt-1 block w-full rounded-md bg-white/10 dark:bg-black/20 border-gray-300 dark:border-gray-600 shadow-sm focus:border-primary focus:ring-primary sm:text-sm p-2"/>
                </div>
                 <div>
                    <label htmlFor="expiry_date" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Data de Validade</label>
                    <input type="date" name="expiry_date" id="expiry_date" value={formData.expiry_date} onChange={handleChange} className="mt-1 block w-full rounded-md bg-white/10 dark:bg-black/20 border-gray-300 dark:border-gray-600 shadow-sm focus:border-primary focus:ring-primary sm:text-sm p-2"/>
                </div>
            </div>
            <div className="flex justify-end gap-4 pt-4">
                <button type="button" onClick={onCancel} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600 dark:hover:bg-gray-600">Cancelar</button>
                <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-primary border border-transparent rounded-md shadow-sm hover:bg-primary/90 focus:outline-none">Salvar</button>
            </div>
        </form>
    );
}


const ProductsView: React.FC<ProductsViewProps> = ({ user, lowStockThreshold }) => {
    const [products, setProducts] = useState<Product[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);
    const { addToast } = useToast();

    const fetchProducts = async () => {
        setIsLoading(true);
        try {
            const data = await api.getProducts(user.market_id);
            setProducts(data);
        } catch (error) {
            addToast({ message: 'Falha ao buscar produtos.', type: 'error' });
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user.market_id]);

    const handleOpenModal = (product: Product | null = null) => {
        setEditingProduct(product);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setEditingProduct(null);
        setIsModalOpen(false);
    };

    const handleSaveProduct = async (productData: Omit<Product, 'id' | 'market_id'>) => {
        try {
            if (editingProduct) {
                await api.updateProduct(editingProduct.id, productData);
                addToast({ message: 'Produto atualizado com sucesso!', type: 'success' });
            } else {
                await api.addProduct({ ...productData, market_id: user.market_id });
                addToast({ message: 'Produto adicionado com sucesso!', type: 'success' });
            }
            fetchProducts();
            handleCloseModal();
        } catch (error) {
            addToast({ message: `Erro ao salvar produto.`, type: 'error' });
        }
    };

    // FIX: Changed productId type from string to number.
    const handleDeleteProduct = async (productId: number) => {
        if (window.confirm('Tem certeza que deseja excluir este produto?')) {
            try {
                await api.deleteProduct(productId);
                addToast({ message: 'Produto excluído com sucesso!', type: 'success' });
                fetchProducts();
            } catch (error) {
                addToast({ message: 'Erro ao excluir produto.', type: 'error' });
            }
        }
    };

    const filteredProducts = useMemo(() => {
        return products.filter(p =>
            p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.code.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [products, searchTerm]);

    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">Gerenciamento de Produtos</h2>
                <div className="flex gap-4">
                    <input
                        type="text"
                        placeholder="Buscar por nome ou código..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="p-2 rounded-md bg-gray-100 dark:bg-gray-700 border-transparent focus:ring-2 focus:ring-primary focus:border-transparent"
                    />
                    <button onClick={() => handleOpenModal()} className="px-4 py-2 bg-primary text-white rounded-lg font-semibold hover:bg-primary/90 transition">
                        Novo Produto
                    </button>
                </div>
            </div>

            <div className="overflow-x-auto relative">
                <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
                    <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                        <tr>
                            <th scope="col" className="px-6 py-3">Produto</th>
                            <th scope="col" className="px-6 py-3">Preço/Custo</th>
                            <th scope="col" className="px-6 py-3">Estoque</th>
                            <th scope="col" className="px-6 py-3">Validade</th>
                            <th scope="col" className="px-6 py-3">Status</th>
                            <th scope="col" className="px-6 py-3">Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        {isLoading ? (
                            <tr><td colSpan={6} className="text-center p-6">Carregando...</td></tr>
                        ) : filteredProducts.map(product => {
                            const isLowStock = product.stock <= lowStockThreshold;
                            const expiryDate = product.expiry_date ? new Date(`${product.expiry_date}T00:00:00`) : null;
                            const today = new Date();
                            today.setHours(0,0,0,0);
                            const thirtyDaysFromNow = new Date(today);
                            thirtyDaysFromNow.setDate(today.getDate() + 30);
                            
                            let expiryStatus = 'ok';
                            let expiryText = expiryDate ? expiryDate.toLocaleDateString('pt-BR') : 'N/A';
                            if (expiryDate) {
                                if (expiryDate < today) {
                                    expiryStatus = 'expired';
                                } else if (expiryDate <= thirtyDaysFromNow) {
                                    expiryStatus = 'nearing';
                                }
                            }
                            
                            return (
                                <tr key={product.id} className={`border-b dark:border-gray-700 ${isLowStock || expiryStatus !== 'ok' ? 'bg-amber-50 dark:bg-amber-900/20' : 'bg-white dark:bg-gray-800'}`}>
                                    <th scope="row" className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap dark:text-white">{product.name} <br/><span className="text-xs font-normal text-gray-500">{product.code}</span></th>
                                    <td className="px-6 py-4">R$ {product.price.toFixed(2)}<br/><span className="text-xs text-gray-500">Custo: R$ {product.cost.toFixed(2)}</span></td>
                                    <td className={`px-6 py-4 font-bold ${isLowStock ? 'text-amber-600 dark:text-amber-400' : ''}`}>{product.stock}</td>
                                    <td className={`px-6 py-4 font-medium ${expiryStatus === 'expired' ? 'text-red-500' : expiryStatus === 'nearing' ? 'text-amber-500' : ''}`}>{expiryText}</td>
                                    <td className="px-6 py-4">
                                        {isLowStock ? (
                                            <span className="flex items-center text-xs font-medium text-amber-800 bg-amber-100 dark:bg-amber-900 dark:text-amber-300 py-1 px-2 rounded-full">
                                                <Icon name="exclamation-triangle" className="w-4 h-4 mr-1" />
                                                Estoque Baixo
                                            </span>
                                        ) : <span className="text-xs font-medium text-green-800 bg-green-100 dark:bg-green-900 dark:text-green-300 py-1 px-2 rounded-full">OK</span>}
                                    </td>
                                    <td className="px-6 py-4 flex gap-2">
                                        <button onClick={() => handleOpenModal(product)} className="font-medium text-primary dark:text-primary-400 hover:underline">Editar</button>
                                        <button onClick={() => handleDeleteProduct(product.id)} className="font-medium text-danger dark:text-danger-400 hover:underline">Excluir</button>
                                    </td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
                 { !isLoading && filteredProducts.length === 0 && (
                    <div className="text-center py-10 text-gray-500">
                        <p>Nenhum produto encontrado.</p>
                    </div>
                )}
            </div>
            
            <Modal isOpen={isModalOpen} onClose={handleCloseModal} title={editingProduct ? 'Editar Produto' : 'Novo Produto'}>
                <ProductForm product={editingProduct} onSave={handleSaveProduct} onCancel={handleCloseModal} />
            </Modal>

        </div>
    );
};

export default ProductsView;