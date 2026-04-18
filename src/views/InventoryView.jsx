import React, { useMemo, useState } from 'react';
import { AlertTriangle, Package, Plus, Search, Trash2, X } from 'lucide-react';

import { useBusinessContext } from '../context/BusinessContext';
import { formatCurrency } from '../utils/formatters';

export default function InventoryView() {
  const {
    addInventoryItem,
    deleteInventoryItem,
    inventory,
    showToast,
    t,
    updateInventoryItem,
  } = useBusinessContext();

  const [showAddItem, setShowAddItem] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [newItem, setNewItem] = useState({
    name: '',
    quantity: 0,
    minQuantity: 1,
    unit: 'unidades',
    category: 'Geral',
    supplier: '',
    price: 0,
  });

  const filteredInventory = useMemo(
    () => inventory.filter((item) => item.name.toLowerCase().includes(searchTerm.toLowerCase())),
    [inventory, searchTerm],
  );

  const lowStockItems = inventory.filter((item) => Number(item.quantity || 0) <= Number(item.minQuantity || 0));
  const totalInventoryValue = inventory.reduce(
    (sum, item) => sum + (Number(item.quantity || 0) * Number(item.price || 0)),
    0,
  );

  const handleAddItem = async (event) => {
    event.preventDefault();
    if (!newItem.name.trim()) {
      showToast('Informe o nome do item.', 'error');
      return;
    }

    try {
      await addInventoryItem({
        ...newItem,
        quantity: Number(newItem.quantity) || 0,
        minQuantity: Number(newItem.minQuantity) || 0,
        price: Number(newItem.price) || 0,
      });
      setShowAddItem(false);
      setNewItem({
        name: '',
        quantity: 0,
        minQuantity: 1,
        unit: 'unidades',
        category: 'Geral',
        supplier: '',
        price: 0,
      });
    } catch {
      showToast('Nao foi possivel cadastrar o item.', 'error');
    }
  };

  const changeQuantity = async (item, nextQuantity) => {
    if (nextQuantity < 0) return;
    try {
      await updateInventoryItem(item.id, { ...item, quantity: nextQuantity });
    } catch {
      showToast('Nao foi possivel atualizar a quantidade.', 'error');
    }
  };

  return (
    <div className="inventory-container">
      <div className="view-header">
        <h1><Package size={28} /> Controle de {t('inventory')}</h1>
        <button type="button" className="btn-primary" onClick={() => setShowAddItem(true)}>
          <Plus size={18} /> Novo item
        </button>
      </div>

      <div className="search-bar">
        <Search size={18} />
        <input
          type="text"
          placeholder={`Buscar em ${t('inventory').toLowerCase()}`}
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
        />
      </div>

      {showAddItem && (
        <div className="modal-overlay" onClick={() => setShowAddItem(false)}>
          <div className="modal-content" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <h2>Novo item de estoque</h2>
              <button type="button" className="btn-icon" onClick={() => setShowAddItem(false)}><X size={18} /></button>
            </div>

            <form onSubmit={handleAddItem} className="modal-form">
              <div className="form-grid">
                <div className="form-group full-width">
                  <label>Nome do item</label>
                  <input type="text" value={newItem.name} onChange={(event) => setNewItem((prev) => ({ ...prev, name: event.target.value }))} />
                </div>
                <div className="form-group">
                  <label>Quantidade atual</label>
                  <input type="number" min="0" value={newItem.quantity} onChange={(event) => setNewItem((prev) => ({ ...prev, quantity: event.target.value }))} />
                </div>
                <div className="form-group">
                  <label>Estoque minimo</label>
                  <input type="number" min="0" value={newItem.minQuantity} onChange={(event) => setNewItem((prev) => ({ ...prev, minQuantity: event.target.value }))} />
                </div>
                <div className="form-group">
                  <label>Unidade</label>
                  <input type="text" value={newItem.unit} onChange={(event) => setNewItem((prev) => ({ ...prev, unit: event.target.value }))} />
                </div>
                <div className="form-group">
                  <label>Valor unitario</label>
                  <input type="number" min="0" step="0.01" value={newItem.price} onChange={(event) => setNewItem((prev) => ({ ...prev, price: event.target.value }))} />
                </div>
                <div className="form-group">
                  <label>Categoria</label>
                  <input type="text" value={newItem.category} onChange={(event) => setNewItem((prev) => ({ ...prev, category: event.target.value }))} />
                </div>
                <div className="form-group">
                  <label>Fornecedor</label>
                  <input type="text" value={newItem.supplier} onChange={(event) => setNewItem((prev) => ({ ...prev, supplier: event.target.value }))} />
                </div>
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowAddItem(false)}>Cancelar</button>
                <button type="submit" className="btn-primary">Salvar item</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {lowStockItems.length > 0 && (
        <div className="alert-section">
          <h2><AlertTriangle size={18} /> Itens com reposicao urgente</h2>
          <div className="stock-alerts-grid">
            {lowStockItems.map((item) => (
              <div key={item.id} className="stock-alert-card">
                <strong>{item.name}</strong>
                <p>Disponivel: {item.quantity} {item.unit}</p>
                <p>Minimo recomendado: {item.minQuantity} {item.unit}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="inventory-stats-grid">
        <div className="metric-card">
          <div className="metric-content">
            <div className="metric-label">Itens cadastrados</div>
            <div className="metric-value">{inventory.length}</div>
          </div>
        </div>
        <div className="metric-card">
          <div className="metric-content">
            <div className="metric-label">Valor estimado em estoque</div>
            <div className="metric-value">{formatCurrency(totalInventoryValue)}</div>
          </div>
        </div>
        <div className="metric-card expenses">
          <div className="metric-content">
            <div className="metric-label">Itens criticos</div>
            <div className="metric-value">{lowStockItems.length}</div>
          </div>
        </div>
      </div>

      <div className="section-card" style={{ marginTop: 24 }}>
        <div className="section-header">
          <h2>Itens em estoque</h2>
        </div>

        <div className="table-responsive">
          <table>
            <thead>
              <tr>
                <th>Item</th>
                <th>Categoria</th>
                <th>Fornecedor</th>
                <th>Quantidade</th>
                <th>Valor unitario</th>
                <th>Acoes</th>
              </tr>
            </thead>
            <tbody>
              {filteredInventory.length === 0 ? (
                <tr><td colSpan="6">Nenhum item encontrado.</td></tr>
              ) : (
                filteredInventory.map((item) => {
                  const isLow = Number(item.quantity || 0) <= Number(item.minQuantity || 0);
                  return (
                    <tr key={item.id}>
                      <td>
                        <strong>{item.name}</strong>
                        {isLow ? <div style={{ color: 'var(--danger)', fontSize: 12 }}>Abaixo do minimo</div> : null}
                      </td>
                      <td>{item.category || 'Geral'}</td>
                      <td>{item.supplier || 'Nao informado'}</td>
                      <td>{item.quantity} {item.unit}</td>
                      <td>{formatCurrency(item.price)}</td>
                      <td>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button type="button" className="btn-secondary btn-sm" onClick={() => changeQuantity(item, Number(item.quantity || 0) - 1)}>-1</button>
                          <button type="button" className="btn-secondary btn-sm" onClick={() => changeQuantity(item, Number(item.quantity || 0) + 1)}>+1</button>
                          <button type="button" className="btn-icon" onClick={() => deleteInventoryItem(item.id)} title="Excluir item">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
