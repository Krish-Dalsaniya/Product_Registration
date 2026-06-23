import { useState, useEffect, useCallback } from 'react';
import { useSales, useSaleOptions, useCreateSale, useUpdateSale, useDeleteSale } from '../../hooks/useSales';
import DataTable from '../../components/shared/DataTable';
import Modal from '../../components/shared/Modal';
import {
  ShoppingCart,
  Plus,
  Search,
  Loader2,
  Package,
  Users,
  Hash,
  TrendingUp,
  CheckCircle2,
  AlertTriangle,
  Trash2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import Swal from 'sweetalert2';
import { useAuth } from '../../context/AuthContext';

const BookASalePage = () => {
  const { hasPermission } = useAuth();
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0 });
  const [searchTerm, setSearchTerm] = useState('');

  const queryParams = { page: pagination.page, limit: pagination.limit, search: searchTerm };
  const { data: salesData, isLoading: salesLoading } = useSales(queryParams);
  const { data: optionsData, isLoading: optionsLoading } = useSaleOptions();

  const sales = salesData?.data || [];
  const options = optionsData || { finishedGoods: [], customers: [] };
  const loading = salesLoading || optionsLoading;

  useEffect(() => {
    if (salesData?.meta) {
      setPagination(prev => ({ ...prev, total: salesData?.meta?.total || 0 }));
    }
  }, [salesData?.meta]);

  const createSaleMutation = useCreateSale();
  const updateSaleMutation = useUpdateSale();
  const deleteSaleMutation = useDeleteSale();

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [selectedFinishedGood, setSelectedFinishedGood] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [quantityError, setQuantityError] = useState('');

  // AI Assistant Autofill Event Listener
  useEffect(() => {
    const handleAutofill = (e) => {
      const { customer_id, finished_good_id, quantity: autoQty } = e.detail;
      
      if (customer_id) setSelectedCustomer(customer_id);
      if (finished_good_id) setSelectedFinishedGood(finished_good_id);
      if (autoQty) setQuantity(autoQty);
      
      setQuantityError('');
      setEditItem(null);
      setViewMode(false);
      setIsModalOpen(true);
      toast.success('Form autofilled by AI Assistant');
    };

    window.addEventListener('AUTOFILL_BOOK_A_SALE', handleAutofill);
    return () => window.removeEventListener('AUTOFILL_BOOK_A_SALE', handleAutofill);
  }, []);

  const [viewMode, setViewMode] = useState(false);
  const [editItem, setEditItem] = useState(null);

  // Derived: available qty of selected finished good
  const selectedFG = options.finishedGoods.find((fg) => String(fg.id) === String(selectedFinishedGood));
  const isSameFG = editItem && String(editItem.finished_good_id) === String(selectedFinishedGood);
  const maxQty = selectedFG ? parseInt(selectedFG.quantity, 10) + (isSameFG ? parseInt(editItem.quantity, 10) : 0) : 0;


  const resetForm = () => {
    setSelectedFinishedGood('');
    setSelectedCustomer('');
    setQuantity(1);
    setQuantityError('');
    setEditItem(null);
    setViewMode(false);
  };

  const handleOpenModal = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const handleView = (row) => {
    setEditItem(row);
    setSelectedFinishedGood(row.finished_good_id);
    setSelectedCustomer(row.customer_id);
    setQuantity(row.quantity);
    setViewMode(true);
    setQuantityError('');
    setIsModalOpen(true);
  };

  const handleEdit = (row) => {
    setEditItem(row);
    setSelectedFinishedGood(row.finished_good_id);
    setSelectedCustomer(row.customer_id);
    setQuantity(row.quantity);
    setViewMode(false);
    setQuantityError('');
    setIsModalOpen(true);
  };

  const handleQuantityChange = (e) => {
    const val = parseInt(e.target.value, 10);
    setQuantity(e.target.value);
    if (selectedFG && val > maxQty) {
      setQuantityError(
        `Not sufficient quantity. Only ${maxQty} available for "${selectedFG.product_name}".`
      );
    } else {
      setQuantityError('');
    }
  };

  const handleFinishedGoodChange = (e) => {
    setSelectedFinishedGood(e.target.value);
    setQuantity(1);
    setQuantityError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!selectedFinishedGood) {
      toast.error('Please select a product (finished good)');
      return;
    }
    if (!selectedCustomer) {
      toast.error('Please select a customer');
      return;
    }

    const qty = parseInt(quantity, 10);
    if (!qty || qty < 1) {
      toast.error('Quantity must be at least 1');
      return;
    }

    if (selectedFG && qty > maxQty) {
      setQuantityError(
        `Not sufficient quantity. Required ${qty}, but only ${maxQty} available for "${selectedFG.product_name}".`
      );
      toast.error('Insufficient quantity in finished goods');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        finished_good_id: selectedFinishedGood,
        customer_id: selectedCustomer,
        quantity: qty,
      };

      if (editItem) {
        await updateSaleMutation.mutateAsync({ id: editItem.id, data: payload });
        toast.success('Sale updated successfully!');
      } else {
        await createSaleMutation.mutateAsync(payload);
        toast.success('Sale booked successfully!');
      }

      setIsModalOpen(false);
      resetForm();
    } catch (error) {
      const msg =
        error?.message ||
        'Failed to book sale';
      setQuantityError(msg);
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (row) => {
    const result = await Swal.fire({
      title: 'Are you sure?',
      text: 'Are you sure you want to cancel this sale? Quantity will be restored.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: 'var(--accent)',
      cancelButtonColor: '#ef4444',
      confirmButtonText: 'Yes, cancel it!'
    });
    if (!result.isConfirmed) return;
    try {
      await deleteSaleMutation.mutateAsync(row.id);
      toast.success('Sale cancelled and quantity restored');
    } catch (err) {
      toast.error('Failed to cancel sale');
    }
  };

  const dropdownStyle = {
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%233d6a7d'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
    backgroundSize: '1.2em',
    backgroundPosition: 'right 1.5rem center',
    backgroundRepeat: 'no-repeat',
  };

  const columns = [
    {
      key: 'product_name',
      label: 'Product',
      render: (row) => (
        <div className="flex flex-col">
          <span className="font-bold text-[var(--text-main)]">
            {row.product_name} {row.version ? <span className="text-[var(--accent)]">({row.version})</span> : ''}
          </span>
          <span className="text-[10px] text-[var(--text-dim)] uppercase tracking-wider font-mono">
            {row.product_code}
          </span>
        </div>
      ),
    },
    {
      key: 'customer_name',
      label: 'Customer',
      render: (row) => (
        <div className="flex flex-col">
          <span className="font-bold text-[var(--text-main)]">
            {row.customer_name || row.company_name}
          </span>
          {row.customer_code && (
            <span className="text-[10px] text-[var(--text-dim)] uppercase tracking-wider font-mono">
              {row.customer_code}
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'quantity',
      label: 'Qty Sold',
      render: (row) => (
        <span className="font-black text-[var(--accent)] text-base">{row.quantity}</span>
      ),
    },
    {
      key: 'sale_date',
      label: 'Sale Date',
      render: (row) =>
        row.sale_date
          ? new Date(row.sale_date).toLocaleDateString('en-IN', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
            })
          : '—',
    },
    {
      key: 'created_at',
      label: 'Booked At',
      render: (row) =>
        row.created_at
          ? new Date(row.created_at).toLocaleDateString('en-IN', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
            })
          : '—',
    },
  ];

  const totalQtySold = sales.reduce((sum, s) => sum + (parseInt(s.quantity, 10) || 0), 0);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 animate-entrance-down">
        <div className="flex items-center gap-5">
          <div className="p-3 md:p-4 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl shadow-sm group animate-float">
            <ShoppingCart
              size={24}
              className="md:w-[28px] md:h-[28px] text-[var(--accent)] group-hover:scale-110 transition-transform duration-300"
            />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-black text-[var(--text-main)] tracking-tight leading-none ">
              Book a Sale
            </h1>
            {/* <p className="text-[11px] text-[var(--text-muted)] font-bold mt-2 uppercase tracking-[0.2em] opacity-70">
              Record sales from finished goods inventory
            </p> */}
          </div>
        </div>

        {hasPermission('sales', 'create') && (
          <button
            id="book-sale-btn"
            onClick={handleOpenModal}
            className="btn-primary shadow-lg px-8 py-3 group hover-scale-md animate-glow"
            style={{ boxShadow: '0 10px 15px -3px var(--border-glow)' }}
          >
            <Plus size={18} className="group-hover:rotate-90 transition-transform duration-300" />
            <span className="text-[12px] md:text-[14px]">Book a Sale</span>
          </button>
        )}
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          {
            title: 'Total Sales',
            value: pagination.total,
            icon: ShoppingCart,
            color: 'var(--badge-admin-text)',
            bg: 'var(--badge-admin-bg)',
          },
          {
            title: 'Units Sold',
            value: totalQtySold,
            icon: Hash,
            color: '#34d399',
            bg: 'rgba(52, 211, 153, 0.1)',
          },
          {
            title: 'Finished Good SKUs',
            value: options.finishedGoods.length,
            icon: Package,
            color: '#fbbf24',
            bg: 'rgba(251, 191, 36, 0.1)',
          },
          {
            title: 'Active Customers',
            value: options.customers.length,
            icon: Users,
            color: '#a78bfa',
            bg: 'rgba(167, 139, 250, 0.1)',
          },
        ].map((stat, idx) => (
          <div key={idx} className="workspace-card p-4 border border-[var(--border-color)] group hover:shadow-md transition-all duration-300 outline-none rounded-2xl">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[13px] font-bold tracking-wider text-[var(--text-muted)] mb-0.5">{stat.title}</p>
                <h3 className="text-2xl font-black text-[var(--text-main)] tracking-tight">{loading ? '...' : stat.value}</h3>
              </div>
              <div 
                className="w-9 h-9 rounded-xl flex items-center justify-center transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3 shadow-sm"
                style={{ background: stat.bg || 'var(--nav-hover)', color: stat.color || 'var(--accent)' }}
              >
                <stat.icon size={18} strokeWidth={2.5} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Search bar */}
      <div className="workspace-card p-2.5 flex flex-col md:flex-row gap-3 items-center border border-[var(--border-color)] bg-[var(--bg-card)] rounded-xl">
        <div className="relative flex-1 group w-full">
          <Search
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-dim)] group-focus-within:text-[var(--accent)] transition-colors duration-300"
            size={16}
          />
          <input
            type="text"
            placeholder="Search by product, customer or code..."
            className="w-full bg-[var(--bg-workspace)] border border-[var(--border-color)] rounded-lg py-2 pl-10 pr-28 outline-none focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--border-glow)] transition-all text-[13px] text-[var(--text-main)] placeholder:text-[var(--text-dim)] font-medium"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest opacity-40 pointer-events-none hidden sm:block">
            {pagination.total} Records
          </div>
        </div>
      </div>

      {/* Data Table */}
      <DataTable
        columns={columns}
        data={sales}
        loading={loading}
        totalCount={pagination.total}
        filteredCount={sales.length}
        currentPage={pagination.page}
        totalPages={Math.ceil(pagination.total / pagination.limit) || 1}
        onPageChange={(page) => setPagination((prev) => ({ ...prev, page }))}
        onView={handleView}
        onEdit={hasPermission('sales', 'edit') ? handleEdit : undefined}
        onDelete={hasPermission('sales', 'delete') ? handleDelete : undefined}
      />

      {/* Book a Sale Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          resetForm();
        }}
        title={viewMode ? 'View Sale Details' : editItem ? 'Edit Sale' : 'Book a Sale'}
        width="600px"
      >
        {viewMode ? (
          <div className="p-6 space-y-4 text-[var(--text-main)]">
            <h3 className="text-lg font-black">{editItem?.product_name}</h3>
            <p className="text-sm">Product Code: <span className="font-bold">{editItem?.product_code}</span></p>
            <p className="text-sm">Customer: <span className="font-bold">{editItem?.customer_name || editItem?.company_name}</span></p>
            <p className="text-sm">Quantity: <span className="font-bold text-[var(--accent)]">{editItem?.quantity}</span></p>
            <p className="text-sm text-[var(--text-dim)]">Date: {new Date(editItem?.sale_date).toLocaleDateString()}</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-8 p-2">
            {/* Select Product (Finished Good) */}
          <div className="space-y-3">
            <label className="text-[10px] font-black text-[var(--text-dim)] uppercase tracking-widest ml-1 flex items-center gap-2">
              <Package size={12} className="text-[var(--accent)]" />
              Select Product (Finished Good){' '}
              <span className="text-rose-500">*</span>
            </label>
            <select
              id="select-finished-good"
              className="w-full bg-[var(--bg-workspace)] border border-[var(--border-color)] rounded-2xl px-5 py-4 text-[14px] text-[var(--text-main)] outline-none focus:border-[var(--accent)] transition-all font-bold appearance-none cursor-pointer"
              style={dropdownStyle}
              value={selectedFinishedGood}
              onChange={handleFinishedGoodChange}
              required
            >
              <option value="">Select a product...</option>
              {options.finishedGoods.map((fg) => (
                <option key={fg.id} value={fg.id}>
                  {fg.product_name} {fg.version ? `(${fg.version})` : ''} 
                  {fg.product_code ? ` [${fg.product_code}]` : ''} — Available: {fg.quantity}
                </option>
              ))}
            </select>

            {/* Show available qty badge */}
            {/* {selectedFG && (
              <div className="flex items-center gap-2 px-3 py-2 bg-[var(--bg-elevated)] border border-[var(--border-color)] rounded-xl">
                <TrendingUp size={14} className="text-[var(--accent)]" />
                <span className="text-[11px] font-black uppercase tracking-wider text-[var(--text-dim)]">
                  Available Qty:
                </span>
                <span
                  className="font-black text-base"
                  style={{ color: maxQty > 0 ? 'var(--accent)' : '#ef4444' }}
                >
                  {maxQty}
                </span>
                {maxQty === 0 && (
                  <span className="text-[10px] font-bold text-rose-500 uppercase tracking-wider">
                    — Out of Stock
                  </span>
                )}
              </div>
            )} */}
          </div>

          {/* Select Customer */}
          <div className="space-y-3">
            <label className="text-[10px] font-black text-[var(--text-dim)] uppercase tracking-widest ml-1 flex items-center gap-2">
              <Users size={12} className="text-[var(--accent)]" />
              Select Customer <span className="text-rose-500">*</span>
            </label>
            <select
              id="select-customer"
              className="w-full bg-[var(--bg-workspace)] border border-[var(--border-color)] rounded-2xl px-5 py-4 text-[14px] text-[var(--text-main)] outline-none focus:border-[var(--accent)] transition-all font-bold appearance-none cursor-pointer"
              style={dropdownStyle}
              value={selectedCustomer}
              onChange={(e) => setSelectedCustomer(e.target.value)}
              required
            >
              <option value="">Select a customer...</option>
              {options.customers.map((c) => (
                <option key={c.customer_id} value={c.customer_id}>
                  {c.customer_name || c.company_name}
                  {c.customer_code ? ` — ${c.customer_code}` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Quantity */}
          <div className="space-y-3">
            <label className="text-[10px] font-black text-[var(--text-dim)] uppercase tracking-widest ml-1 flex items-center gap-2">
              <Hash size={12} className="text-[var(--accent)]" />
              Quantity <span className="text-rose-500">*</span>
            </label>
            <input
              id="sale-quantity"
              type="number"
              min="1"
              max={maxQty || undefined}
              className={`w-full bg-[var(--bg-workspace)] border rounded-2xl px-5 py-4 text-[14px] text-[var(--text-main)] outline-none transition-all font-bold font-mono ${
                quantityError
                  ? 'border-rose-500 focus:border-rose-500 focus:ring-4 focus:ring-rose-500/20'
                  : 'border-[var(--border-color)] focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--border-glow)]'
              }`}
              value={quantity}
              onChange={handleQuantityChange}
              required
            />
            {selectedFG && maxQty > 0 && (
              <p className="text-[10px] font-bold text-[var(--text-dim)] ml-1">
                Max allowed: {maxQty} units
              </p>
            )}
          </div>

          {/* Error display */}
          {quantityError && (
            <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-5 py-4 flex items-start gap-3">
              <AlertTriangle size={16} className="text-rose-500 mt-0.5 flex-shrink-0" />
              <p className="text-sm font-bold text-rose-500">{quantityError}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-4 pt-4 border-t border-[var(--border-color)]">
            <button
              type="button"
              onClick={() => {
                setIsModalOpen(false);
                resetForm();
              }}
              className="px-8 py-4 rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] text-[var(--text-dim)] hover:text-[var(--text-main)] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              id="submit-sale-btn"
              disabled={isSubmitting || !!quantityError || maxQty === 0}
              className="flex items-center gap-3 bg-[var(--accent)] text-white px-10 py-4 rounded-2xl font-black text-[12px] uppercase tracking-[0.2em] hover:scale-105 active:scale-95 transition-all shadow-xl disabled:opacity-50 disabled:scale-100"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="animate-spin" size={18} />
                  {editItem ? 'Updating...' : 'Booking...'}
                </>
              ) : (
                <>
                  <CheckCircle2 size={18} />
                  {editItem ? 'Update Sale' : 'Confirm Sale'}
                </>
              )}
            </button>
          </div>
        </form>
        )}
      </Modal>
    </div>
  );
};

export default BookASalePage;
