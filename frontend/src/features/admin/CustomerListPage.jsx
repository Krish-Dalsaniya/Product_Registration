import React, { useState, useEffect } from 'react';
import { getCustomers, createCustomer, updateCustomer, deleteCustomer } from '../../api/customers';
import DataTable from '../../components/shared/DataTable';
import Modal from '../../components/shared/Modal';
import { Search, Plus, Loader2, Users, Mail, Phone, MapPin, Building, Globe, Hash, ShieldCheck, Trash2, Edit3, Eye, FileText } from 'lucide-react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import Breadcrumbs from '../../components/shared/Breadcrumbs';

const CustomerListPage = () => {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('create'); // 'create', 'edit', 'view'
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
    customer.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.customer_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.company_name.toLowerCase().includes(searchTerm.toLowerCase())
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
      company_site_location: '',
      contact_person_name: '',
      mobile_no: '',
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
        <span className={`px-2 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
          row.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
        }`}>
          {row.status}
        </span>
      )
    }
  ];

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <Breadcrumbs items={[{ label: 'Customers', active: true }]} />

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-5">
          <div className="p-4 bg-white border border-gray-100 rounded-xl shadow-sm">
            <Users className="text-blue-600" />
          </div>
          <div>
            <h1 className="text-[26px] font-black text-gray-900 tracking-tighter uppercase leading-none">Customer Management</h1>
            <p className="text-[12px] text-gray-400 font-bold mt-1.5 uppercase tracking-[0.15em]">Directory of registered clients and companies</p>
          </div>
        </div>
        
        <button 
          onClick={handleOpenCreate}
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-xl shadow-lg shadow-blue-900/10 transition-all active:scale-95 flex items-center gap-2 text-sm"
        >
          <Plus size={18} />
          <span>Add New Customer</span>
        </button>
      </div>

      <div className="relative group max-w-2xl">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-600 transition-colors" size={18} />
        <input
          type="text"
          placeholder="Search by name, code or company..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-white border border-gray-200 rounded-xl py-3.5 pl-12 pr-4 outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-500/5 transition-all text-sm font-medium"
        />
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
        maxWidth="max-w-4xl"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8 py-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
            {/* Primary Details */}
            <div className="space-y-6">
              <div className="flex items-center gap-2 mb-2 pb-2 border-b border-gray-100">
                <Hash size={16} className="text-blue-600" />
                <h3 className="text-[11px] font-black uppercase tracking-widest text-gray-400">Identification</h3>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-2 ml-1">Customer Code</label>
                  <input
                    {...register('customer_code', { required: 'Code is required' })}
                    disabled={modalMode === 'view'}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold text-gray-900 focus:bg-white focus:border-blue-500 outline-none transition-all"
                    placeholder="CUST-001"
                  />
                  {errors.customer_code && <p className="text-red-500 text-[10px] mt-1 font-bold">{errors.customer_code.message}</p>}
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-2 ml-1">GST Number</label>
                  <input
                    {...register('gst_no')}
                    disabled={modalMode === 'view'}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold text-gray-900 focus:bg-white focus:border-blue-500 outline-none transition-all"
                    placeholder="27AAAAA0000A1Z5"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-2 ml-1">Customer Name</label>
                <input
                  {...register('customer_name', { required: 'Name is required' })}
                  disabled={modalMode === 'view'}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold text-gray-900 focus:bg-white focus:border-blue-500 outline-none transition-all"
                  placeholder="John Doe"
                />
              </div>

              <div className="space-y-6 pt-4">
                <div className="flex items-center gap-2 mb-2 pb-2 border-b border-gray-100">
                  <Building size={16} className="text-blue-600" />
                  <h3 className="text-[11px] font-black uppercase tracking-widest text-gray-400">Company Information</h3>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-2 ml-1">Company Name</label>
                  <input
                    {...register('company_name', { required: 'Company name is required' })}
                    disabled={modalMode === 'view'}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold text-gray-900 focus:bg-white focus:border-blue-500 outline-none transition-all"
                    placeholder="Acme Corp"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-2 ml-1">Company Address</label>
                  <textarea
                    {...register('company_address')}
                    disabled={modalMode === 'view'}
                    rows={3}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold text-gray-900 focus:bg-white focus:border-blue-500 outline-none transition-all resize-none"
                    placeholder="Enter full address..."
                  />
                </div>
              </div>
            </div>

            {/* Contact & Location */}
            <div className="space-y-6">
              <div className="flex items-center gap-2 mb-2 pb-2 border-b border-gray-100">
                <Mail size={16} className="text-blue-600" />
                <h3 className="text-[11px] font-black uppercase tracking-widest text-gray-400">Contact Details</h3>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-2 ml-1">Contact Person</label>
                  <input
                    {...register('contact_person_name')}
                    disabled={modalMode === 'view'}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold text-gray-900 focus:bg-white focus:border-blue-500 outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-2 ml-1">Mobile No</label>
                  <input
                    {...register('mobile_no')}
                    disabled={modalMode === 'view'}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold text-gray-900 focus:bg-white focus:border-blue-500 outline-none transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-2 ml-1">Email Address</label>
                <input
                  {...register('email')}
                  disabled={modalMode === 'view'}
                  type="email"
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold text-gray-900 focus:bg-white focus:border-blue-500 outline-none transition-all"
                />
              </div>

              <div className="space-y-6 pt-4">
                <div className="flex items-center gap-2 mb-2 pb-2 border-b border-gray-100">
                  <MapPin size={16} className="text-blue-600" />
                  <h3 className="text-[11px] font-black uppercase tracking-widest text-gray-400">Location</h3>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-2 ml-1">City</label>
                    <input
                      {...register('city')}
                      disabled={modalMode === 'view'}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold text-gray-900 focus:bg-white focus:border-blue-500 outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-2 ml-1">State</label>
                    <input
                      {...register('state')}
                      disabled={modalMode === 'view'}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold text-gray-900 focus:bg-white focus:border-blue-500 outline-none transition-all"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-2 ml-1">Pincode</label>
                    <input
                      {...register('pincode')}
                      disabled={modalMode === 'view'}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold text-gray-900 focus:bg-white focus:border-blue-500 outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-2 ml-1">Country</label>
                    <input
                      {...register('country')}
                      disabled={modalMode === 'view'}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold text-gray-900 focus:bg-white focus:border-blue-500 outline-none transition-all"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-6 pt-6 border-t border-gray-100">
            <div className="flex-1">
              <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-2 ml-1">Account Status</label>
              <select
                {...register('status')}
                disabled={modalMode === 'view'}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold text-gray-900 focus:bg-white focus:border-blue-500 outline-none transition-all appearance-none"
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
                  className="px-6 py-3 text-sm font-bold text-gray-400 uppercase tracking-widest hover:text-gray-600 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-10 rounded-xl shadow-lg shadow-blue-900/10 transition-all active:scale-95 flex items-center gap-2 text-sm"
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
