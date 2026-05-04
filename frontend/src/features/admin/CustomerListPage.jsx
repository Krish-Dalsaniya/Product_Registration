import React, { useState, useEffect } from 'react';
import { getCustomers, createCustomer, updateCustomer, deleteCustomer } from '../../api/customers';
import DataTable from '../../components/shared/DataTable';
import Modal from '../../components/shared/Modal';
import { Search, Plus, Loader2, Users, Mail, Phone, MapPin, Building, Globe, Hash, ShieldCheck, Trash2, Edit3, Eye, FileText, Briefcase, CreditCard, PenTool } from 'lucide-react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import Breadcrumbs from '../../components/shared/Breadcrumbs';

const CustomerListPage = () => {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('create');
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm();

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const data = await getCustomers();
      setCustomers(data);
    } catch (error) {
      toast.error('Failed to fetch customers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  const filteredCustomers = customers.filter(customer =>
    customer.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.customer_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.company_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const onSubmit = async (data) => {
    setIsSubmitting(true);
    try {
      if (modalMode === 'create') {
        await createCustomer(data);
        toast.success('Customer added successfully');
      } else {
        await updateCustomer(selectedCustomer.customer_id, data);
        toast.success('Customer updated successfully');
      }
      setIsModalOpen(false);
      fetchCustomers();
    } catch (error) {
      toast.error(error.response?.data?.error?.message || 'Action failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenCreate = () => {
    setModalMode('create');
    setSelectedCustomer(null);
    reset({
      customer_code: '',
      customer_name: '',
      company_name: '',
      company_address: '',
      customer_site_location: '',
      technical_contact_person: '',
      technical_contact_mobile: '',
      accounts_contact_person: '',
      accounts_contact_mobile: '',
      udyam_aadhar_no: '',
      email: '',
      city: '',
      state: '',
      country: 'India',
      pincode: '',
      gst_no: '',
      status: 'Active'
    });
    setIsModalOpen(true);
  };

  const handleEdit = (customer) => {
    setModalMode('edit');
    setSelectedCustomer(customer);
    reset(customer);
    setIsModalOpen(true);
  };

  const handleView = (customer) => {
    setModalMode('view');
    setSelectedCustomer(customer);
    reset(customer);
    setIsModalOpen(true);
  };

  const handleDelete = async (customer) => {
    if (!window.confirm(`Are you sure you want to delete ${customer.customer_name}?`)) return;
    try {
      await deleteCustomer(customer.customer_id);
      toast.success('Customer deleted successfully');
      fetchCustomers();
    } catch (error) {
      toast.error('Failed to delete customer');
    }
  };

  const columns = [
    { key: 'customer_code', label: 'Code' },
    { key: 'customer_name', label: 'Customer Name' },
    { key: 'company_name', label: 'Company' },
    { key: 'city', label: 'City' },
    {
      key: 'status',
      label: 'Status',
      render: (row) => (
        <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${row.status === 'Active'
          ? 'bg-emerald-500/10 text-emerald-500'
          : 'bg-rose-500/10 text-rose-500'
          }`}>
          {row.status}
        </span>
      )
    }
  ];

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-[1600px] mx-auto">
      <Breadcrumbs items={[{ label: 'Customers', active: true }]} />

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-5">
          <div className="p-4 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl shadow-sm group">
            <Users className="text-[var(--accent)] group-hover:scale-110 transition-transform duration-300" size={28} />
          </div>
          <div>
            <h1 className="text-3xl font-black text-[var(--text-main)] tracking-tight leading-none">Customer Management</h1>
            <p className="text-[11px] text-[var(--text-muted)] font-bold mt-2 uppercase tracking-[0.2em] opacity-70">Directory of registered clients and companies</p>
          </div>
        </div>

        <button
          onClick={handleOpenCreate}
          className="btn-primary shadow-lg px-8 py-3 group"
          style={{ boxShadow: '0 10px 15px -3px var(--border-glow)' }}
        >
          <Plus size={18} className="group-hover:rotate-90 transition-transform duration-300" />
          <span>Add New Customer</span>
        </button>
      </div>

      <div className="workspace-card p-4 flex flex-col md:flex-row gap-4 items-center">
        <div className="relative flex-1 group w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-dim)] group-focus-within:text-[var(--accent)] transition-colors duration-300" size={18} />
          <input
            type="text"
            placeholder="Search by name, code or company details..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[var(--input-bg)] border border-[var(--border-color)] rounded-xl py-3 pl-12 pr-32 outline-none focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--border-glow)] transition-all text-[14px] text-[var(--text-main)] placeholder:text-[var(--text-dim)] font-medium"
          />
          <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest opacity-40 pointer-events-none hidden sm:block">
            {customers.length} Records Listed
          </div>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={filteredCustomers}
        loading={loading}
        onView={handleView}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={modalMode === 'create' ? 'Register New Customer' : modalMode === 'edit' ? 'Update Customer Details' : 'Customer Profile'}
        maxWidth="max-w-6xl"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8 py-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-6">
            {/* Primary Details */}
            <div className="space-y-6">
              <div className="flex items-center gap-2 mb-2 pb-2 border-b border-[var(--border-color)]">
                <Hash size={16} className="text-[var(--accent)]" />
                <h3 className="text-[11px] font-black uppercase tracking-widest text-[var(--text-muted)]">Identification & Company</h3>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em] mb-2.5 ml-1">Customer Code</label>
                  <input
                    {...register('customer_code', { required: 'Code is required' })}
                    disabled={modalMode === 'view'}
                    className="w-full bg-[var(--input-bg)] border border-[var(--border-color)] rounded-xl px-4 py-3 text-sm font-bold text-[var(--text-main)] focus:border-[var(--accent)] outline-none transition-all placeholder:text-[var(--text-dim)]"
                    placeholder="CUST-001"
                  />
                  {errors.customer_code && <p className="text-red-500 text-[10px] mt-1 font-bold">{errors.customer_code.message}</p>}
                </div>
                <div>
                  <label className="block text-[11px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em] mb-2.5 ml-1">Udyam Aadhar No</label>
                  <input
                    {...register('udyam_aadhar_no')}
                    disabled={modalMode === 'view'}
                    className="w-full bg-[var(--input-bg)] border border-[var(--border-color)] rounded-xl px-4 py-3 text-sm font-bold text-[var(--text-main)] focus:border-[var(--accent)] outline-none transition-all placeholder:text-[var(--text-dim)]"
                    placeholder="UDYAM-XX-00-0000000"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em] mb-2.5 ml-1">Customer Name</label>
                <input
                  {...register('customer_name', { required: 'Name is required' })}
                  disabled={modalMode === 'view'}
                  className="w-full bg-[var(--input-bg)] border border-[var(--border-color)] rounded-xl px-4 py-3 text-sm font-bold text-[var(--text-main)] focus:border-[var(--accent)] outline-none transition-all placeholder:text-[var(--text-dim)]"
                  placeholder="John Doe"
                />
              </div>

              <div>
                <label className="block text-[11px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em] mb-2.5 ml-1">Company Name</label>
                <input
                  {...register('company_name', { required: 'Company name is required' })}
                  disabled={modalMode === 'view'}
                  className="w-full bg-[var(--input-bg)] border border-[var(--border-color)] rounded-xl px-4 py-3 text-sm font-bold text-[var(--text-main)] focus:border-[var(--accent)] outline-none transition-all placeholder:text-[var(--text-dim)]"
                  placeholder="Acme Corp"
                />
              </div>

              <div>
                <label className="block text-[11px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em] mb-2.5 ml-1">GST Number</label>
                <input
                  {...register('gst_no')}
                  disabled={modalMode === 'view'}
                  className="w-full bg-[var(--input-bg)] border border-[var(--border-color)] rounded-xl px-4 py-3 text-sm font-bold text-[var(--text-main)] focus:border-[var(--accent)] outline-none transition-all placeholder:text-[var(--text-dim)]"
                  placeholder="27AAAAA0000A1Z5"
                />
              </div>

              <div className="space-y-4 pt-4">
                <div className="flex items-center gap-2 mb-2 pb-2 border-b border-[var(--border-color)]">
                  <MapPin size={16} className="text-[var(--accent)]" />
                  <h3 className="text-[11px] font-black uppercase tracking-widest text-[var(--text-muted)]">Address & Location</h3>
                </div>
                <div>
                  <label className="block text-[11px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em] mb-2.5 ml-1">Company Address</label>
                  <textarea
                    {...register('company_address')}
                    disabled={modalMode === 'view'}
                    rows={2}
                    className="w-full bg-[var(--input-bg)] border border-[var(--border-color)] rounded-xl px-4 py-3 text-sm font-bold text-[var(--text-main)] focus:border-[var(--accent)] outline-none transition-all resize-none placeholder:text-[var(--text-dim)]"
                    placeholder="Enter full address..."
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em] mb-2.5 ml-1">City</label>
                    <input
                      {...register('city')}
                      disabled={modalMode === 'view'}
                      className="w-full bg-[var(--input-bg)] border border-[var(--border-color)] rounded-xl px-4 py-3 text-sm font-bold text-[var(--text-main)] focus:border-[var(--accent)] outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em] mb-2.5 ml-1">State</label>
                    <input
                      {...register('state')}
                      disabled={modalMode === 'view'}
                      className="w-full bg-[var(--input-bg)] border border-[var(--border-color)] rounded-xl px-4 py-3 text-sm font-bold text-[var(--text-main)] focus:border-[var(--accent)] outline-none transition-all"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Contact Persons Section */}
            <div className="space-y-6">
              <div className="flex items-center gap-2 mb-2 pb-2 border-b border-[var(--border-color)]">
                <Briefcase size={16} className="text-[var(--accent)]" />
                <h3 className="text-[11px] font-black uppercase tracking-widest text-[var(--text-muted)]">Contact Personnel</h3>
              </div>

              {/* Technical Contact */}
              <div className="bg-[var(--nav-hover)] p-5 rounded-2xl border border-[var(--border-color)] space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <PenTool size={14} className="text-[var(--text-dim)]" />
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Technical Contact</h4>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-widest mb-1.5 ml-1 opacity-60">Name</label>
                  <input
                    {...register('technical_contact_person')}
                    disabled={modalMode === 'view'}
                    className="w-full bg-[var(--bg-workspace)] border border-[var(--border-color)] rounded-xl px-4 py-2.5 text-sm font-bold text-[var(--text-main)] focus:border-[var(--accent)] outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-widest mb-1.5 ml-1 opacity-60">Mobile No</label>
                  <input
                    {...register('technical_contact_mobile')}
                    disabled={modalMode === 'view'}
                    className="w-full bg-[var(--bg-workspace)] border border-[var(--border-color)] rounded-xl px-4 py-2.5 text-sm font-bold text-[var(--text-main)] focus:border-[var(--accent)] outline-none transition-all"
                  />
                </div>
              </div>

              {/* Accounts Contact */}
              <div className="bg-[var(--nav-hover)] p-5 rounded-2xl border border-[var(--border-color)] space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <CreditCard size={14} className="text-[var(--text-dim)]" />
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Accounts Contact</h4>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-widest mb-1.5 ml-1 opacity-60">Name</label>
                  <input
                    {...register('accounts_contact_person')}
                    disabled={modalMode === 'view'}
                    className="w-full bg-[var(--bg-workspace)] border border-[var(--border-color)] rounded-xl px-4 py-2.5 text-sm font-bold text-[var(--text-main)] focus:border-[var(--accent)] outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-widest mb-1.5 ml-1 opacity-60">Mobile No</label>
                  <input
                    {...register('accounts_contact_mobile')}
                    disabled={modalMode === 'view'}
                    className="w-full bg-[var(--bg-workspace)] border border-[var(--border-color)] rounded-xl px-4 py-2.5 text-sm font-bold text-[var(--text-main)] focus:border-[var(--accent)] outline-none transition-all"
                  />
                </div>
              </div>

              <div className="space-y-4 pt-4">
                <div className="flex items-center gap-2 mb-2 pb-2 border-b border-[var(--border-color)]">
                  <Mail size={16} className="text-[var(--accent)]" />
                  <h3 className="text-[11px] font-black uppercase tracking-widest text-[var(--text-muted)]">Communication</h3>
                </div>
                <div>
                  <label className="block text-[11px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em] mb-2.5 ml-1">Email Address</label>
                  <input
                    {...register('email')}
                    disabled={modalMode === 'view'}
                    type="email"
                    className="w-full bg-[var(--input-bg)] border border-[var(--border-color)] rounded-xl px-4 py-3 text-sm font-bold text-[var(--text-main)] focus:border-[var(--accent)] outline-none transition-all placeholder:text-[var(--text-dim)]"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em] mb-2.5 ml-1">Pincode</label>
                    <input
                      {...register('pincode')}
                      disabled={modalMode === 'view'}
                      className="w-full bg-[var(--input-bg)] border border-[var(--border-color)] rounded-xl px-4 py-3 text-sm font-bold text-[var(--text-main)] focus:border-[var(--accent)] outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em] mb-2.5 ml-1">Country</label>
                    <input
                      {...register('country')}
                      disabled={modalMode === 'view'}
                      className="w-full bg-[var(--input-bg)] border border-[var(--border-color)] rounded-xl px-4 py-3 text-sm font-bold text-[var(--text-main)] focus:border-[var(--accent)] outline-none transition-all"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-6 pt-6 border-t border-[var(--border-color)]">
            <div className="flex-1">
              <label className="block text-[11px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em] mb-2.5 ml-1">Account Status</label>
              <select
                {...register('status')}
                disabled={modalMode === 'view'}
                className="w-full bg-[var(--input-bg)] border border-[var(--border-color)] rounded-xl px-4 py-3 text-sm font-bold text-[var(--text-main)] focus:border-[var(--accent)] outline-none transition-all appearance-none cursor-pointer"
                style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%233d6a7d'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`, backgroundSize: '1.2em', backgroundPosition: 'right 1rem center', backgroundRepeat: 'no-repeat' }}
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>

            {modalMode !== 'view' && (
              <div className="flex items-end gap-3 pt-6">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-6 py-3 text-sm font-bold text-[var(--text-muted)] uppercase tracking-widest hover:text-[var(--text-main)] transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn-primary py-3 px-10 shadow-lg flex items-center gap-2 text-sm"
                  style={{ boxShadow: '0 10px 15px -3px var(--border-glow)' }}
                >
                  {isSubmitting ? <Loader2 size={20} className="animate-spin" /> : (modalMode === 'create' ? 'Save Customer' : 'Update Customer')}
                </button>
              </div>
            )}
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default CustomerListPage;
