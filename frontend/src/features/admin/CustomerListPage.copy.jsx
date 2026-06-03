import React, { useState, useEffect } from 'react';
import { useCustomers, useCreateCustomer, useUpdateCustomer, useDeleteCustomer } from '../../hooks/useCustomers';
import DataTable from '../../components/shared/DataTable';
import Modal from '../../components/shared/Modal';
import { Search, Plus, Loader2, Users, Mail, Phone, MapPin, Building, Globe, Hash, ShieldCheck, Trash2, Edit3, Edit2, Check, Eye, FileText, Briefcase, CreditCard, PenTool, ChevronRight } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { useDispatch, useStore } from 'react-redux';
import { saveDraft, clearDraft } from '../../store/slices/draftSlice';
import toast from 'react-hot-toast';
import Swal from 'sweetalert2';

const CustomerListPage = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const { data: customersData, isLoading: loading } = useCustomers();
  const customers = customersData || [];

  const createCustomerMutation = useCreateCustomer();
  const updateCustomerMutation = useUpdateCustomer();
  const deleteCustomerMutation = useDeleteCustomer();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('create');
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [techContacts, setTechContacts] = useState([]);
  const [salesContacts, setSalesContacts] = useState([]);
  const [ownerContacts, setOwnerContacts] = useState([]);
  const [accountsContacts, setAccountsContacts] = useState([]);
  const [qaQcContacts, setQaQcContacts] = useState([]);
  const [otherContacts, setOtherContacts] = useState([]);
  const [addresses, setAddresses] = useState([]);
  const [isPersonnelModalOpen, setIsPersonnelModalOpen] = useState(false);
  const [personnelType, setPersonnelType] = useState('technical');
  const [editingPersonnelIdx, setEditingPersonnelIdx] = useState(null);
  const [tempPersonnel, setTempPersonnel] = useState(null);
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
  const [editingAddressIdx, setEditingAddressIdx] = useState(null);
  const [tempAddress, setTempAddress] = useState(null);
  const [isProductStatusModalOpen, setIsProductStatusModalOpen] = useState(false);

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm();

  const dispatch = useDispatch();
  const store = useStore();

  const formId = React.useMemo(() => {
    if (!isModalOpen || modalMode === 'view') return null;
    return modalMode === 'create' 
      ? `customer_create` 
      : `customer_edit_${selectedCustomer?.customer_id || 'unknown'}`;
  }, [isModalOpen, modalMode, selectedCustomer]);

  useEffect(() => {
    if (!formId || !isModalOpen) return;
    
    const subscription = watch((value) => {
      if (value && Object.keys(value).length > 0) {
        dispatch(saveDraft({ formId, data: value }));
      }
    });
    return () => subscription.unsubscribe();
  }, [watch, formId, dispatch, isModalOpen]);

  const filteredCustomers = customers.filter(customer =>
    customer.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.customer_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.company_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.product?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.technical_contacts?.some(c => c.person?.toLowerCase().includes(searchTerm.toLowerCase())) ||
    customer.sales_contacts?.some(c => c.person?.toLowerCase().includes(searchTerm.toLowerCase())) ||
    customer.owner_contacts?.some(c => c.person?.toLowerCase().includes(searchTerm.toLowerCase())) ||
    customer.accounts_contacts?.some(c => c.person?.toLowerCase().includes(searchTerm.toLowerCase())) ||
    customer.qa_qc_contacts?.some(c => c.person?.toLowerCase().includes(searchTerm.toLowerCase())) ||
    customer.other_contacts?.some(c => c.person?.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const onSubmit = async (data) => {
    setIsSubmitting(true);
    try {
      const payload = {
        ...data,
        technical_contacts: techContacts.map(c => ({
          person: c.name || c.person || '',
          name: c.name || c.person || '',
          mobile: c.mobile || '',
          email: c.email || '',
          designation: c.designation || ''
        })).filter(c => c.name.trim()),
        sales_contacts: salesContacts.map(c => ({
          person: c.name || c.person || '',
          name: c.name || c.person || '',
          mobile: c.mobile || '',
          email: c.email || '',
          designation: c.designation || ''
        })).filter(c => c.name.trim()),
        owner_contacts: ownerContacts.map(c => ({
          person: c.name || c.person || '',
          name: c.name || c.person || '',
          mobile: c.mobile || '',
          email: c.email || '',
          designation: c.designation || ''
        })).filter(c => c.name.trim()),
        accounts_contacts: accountsContacts.map(c => ({
          person: c.name || c.person || '',
          name: c.name || c.person || '',
          mobile: c.mobile || '',
          email: c.email || '',
          designation: c.designation || ''
        })).filter(c => c.name.trim()),
        qa_qc_contacts: qaQcContacts.map(c => ({
          person: c.name || c.person || '',
          name: c.name || c.person || '',
          mobile: c.mobile || '',
          email: c.email || '',
          designation: c.designation || ''
        })).filter(c => c.name.trim()),
        other_contacts: otherContacts.map(c => ({
          person: c.name || c.person || '',
          name: c.name || c.person || '',
          mobile: c.mobile || '',
          email: c.email || '',
          designation: c.designation || ''
        })).filter(c => c.name.trim()),
        addresses: addresses.filter(a => a.company_name?.trim())
      };

      if (modalMode === 'create') {
        await createCustomerMutation.mutateAsync(payload);
        toast.success('Customer added successfully');
      } else {
        await updateCustomerMutation.mutateAsync({ id: selectedCustomer.customer_id, data: payload });
        toast.success('Customer updated successfully');
      }
      setIsModalOpen(false);
      reset();
      if (formId) {
        dispatch(clearDraft({ formId }));
      }
    } catch (error) {
      toast.error(error.response?.data?.error?.message || 'Action failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenAddressModal = (idx = null) => {
    if (idx !== null) {
      setTempAddress({ ...addresses[idx] });
      setEditingAddressIdx(idx);
    } else {
      setTempAddress({
        country: 'India',
        company_name: '',
        mobile: '',
        pincode: '',
        flat: '',
        area: '',
        landmark: '',
        city: '',
        state: '',
        is_shipping: false,
        is_billing: false,
        is_registered: false
      });
      setEditingAddressIdx(null);
    }
    setIsAddressModalOpen(true);
  };

  const handleSaveAddress = () => {
    if (!tempAddress.flat || !tempAddress.city) {
      toast.error('Please fill in required fields');
      return;
    }
    
    let newAddresses = [...addresses];
    
    if (editingAddressIdx !== null) {
      newAddresses[editingAddressIdx] = tempAddress;
    } else {
      newAddresses.push(tempAddress);
    }
    setAddresses(newAddresses);
    setIsAddressModalOpen(false);
  };

  const handleOpenPersonnelModal = (type, idx = null) => {
    setPersonnelType(type);
    
    let contactsList = [];
    if (type === 'technical') contactsList = techContacts;
    else if (type === 'sales') contactsList = salesContacts;
    else if (type === 'owner') contactsList = ownerContacts;
    else if (type === 'accounts') contactsList = accountsContacts;
    else if (type === 'qa_qc') contactsList = qaQcContacts;
    else if (type === 'other') contactsList = otherContacts;

    if (idx !== null) {
      const contact = contactsList[idx];
      setTempPersonnel({
        name: contact.name || contact.person || '',
        mobile: contact.mobile || '',
        email: contact.email || '',
        designation: contact.designation || ''
      });
      setEditingPersonnelIdx(idx);
    } else {
      setTempPersonnel({
        name: '',
        mobile: '',
        email: '',
        designation: ''
      });
      setEditingPersonnelIdx(null);
    }
    setIsPersonnelModalOpen(true);
  };

  const handleSavePersonnel = () => {
    if (!tempPersonnel.name) {
      toast.error('Please fill in the Name field');
      return;
    }

    const newContact = {
      person: tempPersonnel.name,
      name: tempPersonnel.name,
      mobile: tempPersonnel.mobile,
      email: tempPersonnel.email,
      designation: tempPersonnel.designation
    };

    if (personnelType === 'technical') {
      let next = [...techContacts];
      if (editingPersonnelIdx !== null) next[editingPersonnelIdx] = newContact;
      else next.push(newContact);
      setTechContacts(next);
    } else if (personnelType === 'sales') {
      let next = [...salesContacts];
      if (editingPersonnelIdx !== null) next[editingPersonnelIdx] = newContact;
      else next.push(newContact);
      setSalesContacts(next);
    } else if (personnelType === 'owner') {
      let next = [...ownerContacts];
      if (editingPersonnelIdx !== null) next[editingPersonnelIdx] = newContact;
      else next.push(newContact);
      setOwnerContacts(next);
    } else if (personnelType === 'accounts') {
      let next = [...accountsContacts];
      if (editingPersonnelIdx !== null) next[editingPersonnelIdx] = newContact;
      else next.push(newContact);
      setAccountsContacts(next);
    } else if (personnelType === 'qa_qc') {
      let next = [...qaQcContacts];
      if (editingPersonnelIdx !== null) next[editingPersonnelIdx] = newContact;
      else next.push(newContact);
      setQaQcContacts(next);
    } else if (personnelType === 'other') {
      let next = [...otherContacts];
      if (editingPersonnelIdx !== null) next[editingPersonnelIdx] = newContact;
      else next.push(newContact);
      setOtherContacts(next);
    }

    setIsPersonnelModalOpen(false);
  };

  const handleOpenCreate = () => {
    setTechContacts([]);
    setSalesContacts([]);
    setOwnerContacts([]);
    setAccountsContacts([]);
    setQaQcContacts([]);
    setOtherContacts([]);
    setAddresses([]);
    
    const draftId = 'customer_create';
    const draft = store.getState().drafts[draftId];
    if (draft && draft.data && Object.keys(draft.data).length > 0) {
      reset(draft.data);
    } else {
      reset({
        customer_code: '',
        first_name: '',
        middle_name: '',
        last_name: '',
        company_name: '',
        udyam_aadhar_no: '',
        email: '',
        gst_no: '',
        status: 'Active',
        company_type: ''
      });
    }
    
    setIsModalOpen(true);
  };

  const handleEdit = (customer) => {
    setModalMode('edit');
    setSelectedCustomer(customer);
    const draftId = `customer_edit_${customer.customer_id}`;
    const draft = store.getState().drafts[draftId];
    if (draft && draft.data && Object.keys(draft.data).length > 0) {
      reset(draft.data);
    } else {
      reset(customer);
    }
    setTechContacts(customer.technical_contacts || []);
    setSalesContacts(customer.sales_contacts || []);
    setOwnerContacts(customer.owner_contacts || []);
    setAccountsContacts(customer.accounts_contacts || []);
    setQaQcContacts(customer.qa_qc_contacts || []);
    setOtherContacts(customer.other_contacts || []);
    setAddresses(customer.addresses || []);
    setIsModalOpen(true);
  };

  const handleView = (customer) => {
    setModalMode('view');
    setSelectedCustomer(customer);
    reset(customer);
    setTechContacts(customer.technical_contacts || []);
    setSalesContacts(customer.sales_contacts || []);
    setOwnerContacts(customer.owner_contacts || []);
    setAccountsContacts(customer.accounts_contacts || []);
    setQaQcContacts(customer.qa_qc_contacts || []);
    setOtherContacts(customer.other_contacts || []);
    setAddresses(customer.addresses || []);
    setIsModalOpen(true);
  };

  const handleDelete = async (customer) => {
    const result = await Swal.fire({
      title: 'Are you sure?',
      text: `Are you sure you want to delete ${customer.customer_name}?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: 'var(--accent)',
      cancelButtonColor: '#ef4444',
      confirmButtonText: 'Yes, delete it!'
    });
    if (!result.isConfirmed) return;
    try {
      await deleteCustomerMutation.mutateAsync(customer.customer_id);
      toast.success('Customer deleted successfully');
    } catch (error) {
      toast.error('Failed to delete customer');
    }
  };

  const columns = [
    { key: 'customer_code', label: 'Code' },
    { key: 'customer_name', label: 'Customer Name' },
    { key: 'company_name', label: 'Company' },
    { key: 'company_type', label: 'Type' },
    { key: 'product', label: 'Product', render: (row) => row.product || 'N/A' },
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

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 animate-entrance-down">
        <div className="flex items-center gap-5">
          <div className="p-4 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl shadow-sm group animate-float">
            <Users className="text-[var(--accent)] group-hover:scale-110 transition-transform duration-300" size={28} />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-black text-[var(--text-main)] tracking-tight leading-none ">Customer Management</h1>
            {/* <p className="text-[11px] text-[var(--text-muted)] font-bold mt-2 uppercase tracking-[0.2em] opacity-70">Directory of registered clients and companies</p> */}
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

      <div className="workspace-card p-3 flex flex-col md:flex-row gap-4 items-center">
        <div className="relative flex-1 group w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-dim)] group-focus-within:text-[var(--accent)] transition-colors duration-300" size={18} />
          <input
            type="text"
            placeholder="Search by name, code or company details..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[var(--input-bg)] border border-[var(--border-color)] rounded-xl py-2 pl-12 pr-32 outline-none focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--border-glow)] transition-all text-[14px] text-[var(--text-main)] placeholder:text-[var(--text-dim)] font-medium"
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
        rowKey="customer_id"
      />

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={modalMode === 'create' ? 'Register New Customer' : modalMode === 'edit' ? 'Update Customer Details' : 'Customer Profile'}
        maxWidth="max-w-6xl"
        headerActions={modalMode !== 'view' && (
          <div className="flex items-center gap-3">
            <button
              form="customer-form"
              type="submit"
              disabled={isSubmitting}
              className="btn-primary py-2 px-6 shadow-md flex items-center gap-2 text-[9px] font-black uppercase tracking-widest"
              style={{ boxShadow: '0 4px 12px -2px var(--border-glow)' }}
            >
              {isSubmitting ? <Loader2 size={14} className="animate-spin" /> : (modalMode === 'create' ? 'Save Customer' : 'Update Customer')}
            </button>
          </div>
        )}
      >
        {modalMode === 'view' ? (
          <div className="space-y-6 animate-in fade-in duration-500 py-4 max-h-[80vh] overflow-y-auto pr-2 custom-scrollbar">
            {/* Identification Section */}
            <div className="space-y-6">
              <div className="border-b border-[var(--border-color)] pb-4">
                <label className="block text-[10px] font-black text-[var(--accent)] uppercase tracking-[0.15em] mb-1.5 opacity-80">Full Name</label>
                <div className="text-xl font-black text-[var(--text-main)] uppercase tracking-tight">
                  {[selectedCustomer?.first_name, selectedCustomer?.middle_name, selectedCustomer?.last_name].filter(Boolean).join(' ')}
                </div>
              </div>

              <div className="border-b border-[var(--border-color)] pb-4">
                <label className="block text-[10px] font-black text-[var(--accent)] uppercase tracking-[0.15em] mb-1.5 opacity-80">Customer Code</label>
                <div className="text-base font-bold text-[var(--text-main)] uppercase">
                  {selectedCustomer?.customer_code}
                </div>
              </div>

              <div className="border-b border-[var(--border-color)] pb-4">
                <label className="block text-[10px] font-black text-[var(--accent)] uppercase tracking-[0.15em] mb-1.5 opacity-80">Company Name</label>
                <div className="text-base font-bold text-[var(--text-main)]">
                  {selectedCustomer?.company_name}
                </div>
              </div>

              <div className="border-b border-[var(--border-color)] pb-4">
                <label className="block text-[10px] font-black text-[var(--accent)] uppercase tracking-[0.15em] mb-1.5 opacity-80">Company Type</label>
                <div className="text-[14px] font-bold text-[var(--text-main)]">
                  {selectedCustomer?.company_type || 'N/A'}
                </div>
              </div>

              <div className="border-b border-[var(--border-color)] pb-4">
                <label className="block text-[10px] font-black text-[var(--accent)] uppercase tracking-[0.15em] mb-1.5 opacity-80">GST Number</label>
                <div className="text-[14px] font-bold text-[var(--text-main)] font-mono">
                  {selectedCustomer?.gst_no || 'N/A'}
                </div>
              </div>

              <div className="border-b border-[var(--border-color)] pb-4">
                <label className="block text-[10px] font-black text-[var(--accent)] uppercase tracking-[0.15em] mb-1.5 opacity-80">Udyam Aadhar No</label>
                <div className="text-[14px] font-bold text-[var(--text-main)]">
                  {selectedCustomer?.udyam_aadhar_no || 'N/A'}
                </div>
              </div>

              <div className="border-b border-[var(--border-color)] pb-4">
                <label className="block text-[10px] font-black text-[var(--accent)] uppercase tracking-[0.15em] mb-1.5 opacity-80">Linked Product</label>
                <div className="text-[14px] font-bold text-[var(--text-main)]">
                  {selectedCustomer?.product || 'N/A'}
                </div>
              </div>
            </div>

            {/* Addresses Section */}
            <div className="space-y-6 pt-4">
              <div className="flex items-center gap-2 mb-2 pb-2 border-b-2 border-[var(--accent)]/20">
                <MapPin size={14} className="text-[var(--accent)]" />
                <h3 className="text-[11px] font-black uppercase tracking-widest text-[var(--accent)]">Registered Addresses</h3>
              </div>
              
              <div className="flex flex-col gap-8">
                {selectedCustomer?.addresses?.map((addr, i) => (
                  <div key={i} className="border-b border-[var(--border-color)] pb-6 relative last:border-0">
                    <div className="absolute top-0 right-0 flex gap-3">
                      {addr.is_registered && <span className="px-3 py-1 border-2 border-blue-600 text-blue-600 text-[10px] font-black uppercase tracking-widest rounded-xl">Registered</span>}
                      {addr.is_billing && <span className="px-3 py-1 border-2 border-purple-600 text-purple-600 text-[10px] font-black uppercase tracking-widest rounded-xl">Billing</span>}
                      {addr.is_shipping && <span className="px-2.5 py-1 border-2 border-emerald-600 text-emerald-600 text-[10px] font-black uppercase tracking-widest rounded-xl">Shipping</span>}
                    </div>
                    
                    <label className="block text-[10px] font-black text-[var(--accent)] uppercase tracking-[0.15em] mb-1 opacity-80">{addr.company_name}</label>
                    <div className="text-[14px] font-medium text-[var(--text-main)] leading-relaxed">
                      <p>{addr.flat}{addr.area ? `, ${addr.area}` : ''}</p>
                      <p className="font-bold">{addr.city}, {addr.state} - {addr.pincode}</p>
                      {addr.mobile && <p className="text-[12px] mt-1 opacity-60">Contact: {addr.mobile}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Personnel Section */}
            <div className="space-y-6 pt-4">
              <div className="flex items-center gap-2 mb-2 pb-2 border-b-2 border-[var(--accent)]/20">
                <Users size={14} className="text-[var(--accent)]" />
                <h3 className="text-[11px] font-black uppercase tracking-widest text-[var(--accent)]">Key Personnel</h3>
              </div>

              <div className="space-y-6">
                {selectedCustomer?.technical_contacts && selectedCustomer.technical_contacts.length > 0 && (
                  <div>
                    <label className="block text-[10px] font-black text-[var(--accent)] uppercase tracking-[0.15em] mb-3 opacity-80">Technical Personnel</label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                      {selectedCustomer.technical_contacts.map((c, i) => (
                        <div key={i} className="p-3 bg-[var(--nav-hover)] border border-[var(--border-color)] rounded-xl flex flex-col justify-between">
                          <div>
                            <span className="text-[12px] font-black uppercase text-[var(--text-main)] block">{c.name || c.person}</span>
                            {c.designation && <span className="text-[9px] font-extrabold text-[var(--accent)] uppercase tracking-widest block mt-0.5">{c.designation}</span>}
                          </div>
                          <div className="text-[10px] font-medium text-[var(--text-muted)] space-y-0.5 mt-2">
                            {c.mobile && <p className="flex items-center gap-1.5"><Phone size={10} className="text-[var(--accent)]" /> {c.mobile}</p>}
                            {c.email && <p className="flex items-center gap-1.5"><Mail size={10} className="text-[var(--accent)]" /> {c.email}</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {selectedCustomer?.sales_contacts && selectedCustomer.sales_contacts.length > 0 && (
                  <div>
                    <label className="block text-[10px] font-black text-[var(--accent)] uppercase tracking-[0.15em] mb-3 opacity-80">Purchase Personnel</label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                      {selectedCustomer.sales_contacts.map((c, i) => (
                        <div key={i} className="p-3 bg-[var(--nav-hover)] border border-[var(--border-color)] rounded-xl flex flex-col justify-between">
                          <div>
                            <span className="text-[12px] font-black uppercase text-[var(--text-main)] block">{c.name || c.person}</span>
                            {c.designation && <span className="text-[9px] font-extrabold text-[var(--accent)] uppercase tracking-widest block mt-0.5">{c.designation}</span>}
                          </div>
                          <div className="text-[10px] font-medium text-[var(--text-muted)] space-y-0.5 mt-2">
                            {c.mobile && <p className="flex items-center gap-1.5"><Phone size={10} className="text-[var(--accent)]" /> {c.mobile}</p>}
                            {c.email && <p className="flex items-center gap-1.5"><Mail size={10} className="text-[var(--accent)]" /> {c.email}</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {selectedCustomer?.owner_contacts && selectedCustomer.owner_contacts.length > 0 && (
                  <div>
                    <label className="block text-[10px] font-black text-[var(--accent)] uppercase tracking-[0.15em] mb-3 opacity-80">Company Owner</label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                      {selectedCustomer.owner_contacts.map((c, i) => (
                        <div key={i} className="p-3 bg-[var(--nav-hover)] border border-[var(--border-color)] rounded-xl flex flex-col justify-between">
                          <div>
                            <span className="text-[12px] font-black uppercase text-[var(--text-main)] block">{c.name || c.person}</span>
                            {c.designation && <span className="text-[9px] font-extrabold text-[var(--accent)] uppercase tracking-widest block mt-0.5">{c.designation}</span>}
                          </div>
                          <div className="text-[10px] font-medium text-[var(--text-muted)] space-y-0.5 mt-2">
                            {c.mobile && <p className="flex items-center gap-1.5"><Phone size={10} className="text-[var(--accent)]" /> {c.mobile}</p>}
                            {c.email && <p className="flex items-center gap-1.5"><Mail size={10} className="text-[var(--accent)]" /> {c.email}</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {selectedCustomer?.accounts_contacts && selectedCustomer.accounts_contacts.length > 0 && (
                  <div>
                    <label className="block text-[10px] font-black text-[var(--accent)] uppercase tracking-[0.15em] mb-3 opacity-80">Accounts</label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                      {selectedCustomer.accounts_contacts.map((c, i) => (
                        <div key={i} className="p-3 bg-[var(--nav-hover)] border border-[var(--border-color)] rounded-xl flex flex-col justify-between">
                          <div>
                            <span className="text-[12px] font-black uppercase text-[var(--text-main)] block">{c.name || c.person}</span>
                            {c.designation && <span className="text-[9px] font-extrabold text-[var(--accent)] uppercase tracking-widest block mt-0.5">{c.designation}</span>}
                          </div>
                          <div className="text-[10px] font-medium text-[var(--text-muted)] space-y-0.5 mt-2">
                            {c.mobile && <p className="flex items-center gap-1.5"><Phone size={10} className="text-[var(--accent)]" /> {c.mobile}</p>}
                            {c.email && <p className="flex items-center gap-1.5"><Mail size={10} className="text-[var(--accent)]" /> {c.email}</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {selectedCustomer?.qa_qc_contacts && selectedCustomer.qa_qc_contacts.length > 0 && (
                  <div>
                    <label className="block text-[10px] font-black text-[var(--accent)] uppercase tracking-[0.15em] mb-3 opacity-80">QA/QC</label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                      {selectedCustomer.qa_qc_contacts.map((c, i) => (
                        <div key={i} className="p-3 bg-[var(--nav-hover)] border border-[var(--border-color)] rounded-xl flex flex-col justify-between">
                          <div>
                            <span className="text-[12px] font-black uppercase text-[var(--text-main)] block">{c.name || c.person}</span>
                            {c.designation && <span className="text-[9px] font-extrabold text-[var(--accent)] uppercase tracking-widest block mt-0.5">{c.designation}</span>}
                          </div>
                          <div className="text-[10px] font-medium text-[var(--text-muted)] space-y-0.5 mt-2">
                            {c.mobile && <p className="flex items-center gap-1.5"><Phone size={10} className="text-[var(--accent)]" /> {c.mobile}</p>}
                            {c.email && <p className="flex items-center gap-1.5"><Mail size={10} className="text-[var(--accent)]" /> {c.email}</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {selectedCustomer?.other_contacts && selectedCustomer.other_contacts.length > 0 && (
                  <div>
                    <label className="block text-[10px] font-black text-[var(--accent)] uppercase tracking-[0.15em] mb-3 opacity-80">Other Personnel</label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                      {selectedCustomer.other_contacts.map((c, i) => (
                        <div key={i} className="p-3 bg-[var(--nav-hover)] border border-[var(--border-color)] rounded-xl flex flex-col justify-between">
                          <div>
                            <span className="text-[12px] font-black uppercase text-[var(--text-main)] block">{c.name || c.person}</span>
                            {c.designation && <span className="text-[9px] font-extrabold text-[var(--accent)] uppercase tracking-widest block mt-0.5">{c.designation}</span>}
                          </div>
                          <div className="text-[10px] font-medium text-[var(--text-muted)] space-y-0.5 mt-2">
                            {c.mobile && <p className="flex items-center gap-1.5"><Phone size={10} className="text-[var(--accent)]" /> {c.mobile}</p>}
                            {c.email && <p className="flex items-center gap-1.5"><Mail size={10} className="text-[var(--accent)]" /> {c.email}</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Communication Section */}
            <div className="space-y-6 pt-4">
              <div className="flex items-center gap-2 mb-2 pb-2 border-b-2 border-[var(--accent)]/20">
                <Mail size={14} className="text-[var(--accent)]" />
                <h3 className="text-[11px] font-black uppercase tracking-widest text-[var(--accent)]">Communication</h3>
              </div>
              
              <div className="border-b border-[var(--border-color)] pb-4">
                <label className="block text-[10px] font-black text-[var(--accent)] uppercase tracking-[0.15em] mb-1.5 opacity-80">Email Address</label>
                <div className="text-[14px] font-bold text-[var(--text-main)]">
                  {selectedCustomer?.email}
                </div>
              </div>

              <div className="pb-4">
                <label className="block text-[10px] font-black text-[var(--accent)] uppercase tracking-[0.15em] mb-1.5 opacity-80">Account Status</label>
                <div className={`inline-block px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${selectedCustomer?.status === 'Active' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                  {selectedCustomer?.status}
                </div>
              </div>
            </div>

            <div className="pt-8 border-t border-[var(--border-color)] flex justify-end sticky bottom-0 bg-[var(--bg-card)] -mx-4 px-4 pb-2">
               <button onClick={() => setIsModalOpen(false)} className="px-12 py-2.5 bg-[var(--accent)] text-white rounded-xl text-[12px] font-black uppercase tracking-widest hover:opacity-90 shadow-lg transition-all">Close Profile</button>
            </div>
          </div>
        ) : (
          <form id="customer-form" onSubmit={handleSubmit(onSubmit)} className="space-y-8 py-4">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
              {/* Left Column */}
              <div className="lg:col-span-6 space-y-8">
                <div className="space-y-6">
                  <div className="flex items-center gap-2 pb-2 border-b border-[var(--border-color)]">
                    <Building size={16} className="text-[var(--accent)]" />
                    <h3 className="text-[11px] font-black uppercase tracking-widest text-[var(--accent)]">Company Information</h3>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] ml-1">Customer Code</label>
                      <input
                        {...register('customer_code', { required: 'Code is required' })}
                        placeholder="E.g. CUST001"
                        className="w-full bg-[var(--input-bg)] border border-[var(--border-color)] rounded-xl py-3 px-4 outline-none focus:border-[var(--accent)] transition-all font-bold text-[14px]"
                      />
                      {errors.customer_code && <p className="text-rose-500 text-[10px] font-bold ml-1">{errors.customer_code.message}</p>}
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] ml-1">Udyam Aadhar</label>
                      <input
                        {...register('udyam_aadhar_no')}
                        placeholder="UDYAM-XX-00-..."
                        className="w-full bg-[var(--input-bg)] border border-[var(--border-color)] rounded-xl py-3 px-4 outline-none focus:border-[var(--accent)] transition-all font-bold text-[14px]"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] ml-1">First Name</label>
                      <input {...register('first_name', { required: true })} className="w-full bg-[var(--input-bg)] border border-[var(--border-color)] rounded-xl py-3 px-4 outline-none focus:border-[var(--accent)] transition-all font-bold text-[14px]" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] ml-1">Middle</label>
                      <input {...register('middle_name')} className="w-full bg-[var(--input-bg)] border border-[var(--border-color)] rounded-xl py-3 px-4 outline-none focus:border-[var(--accent)] transition-all font-bold text-[14px]" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] ml-1">Last Name</label>
                      <input {...register('last_name', { required: true })} className="w-full bg-[var(--input-bg)] border border-[var(--border-color)] rounded-xl py-3 px-4 outline-none focus:border-[var(--accent)] transition-all font-bold text-[14px]" />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] ml-1">Company Name</label>
                      <input {...register('company_name', { required: true })} className="w-full bg-[var(--input-bg)] border border-[var(--border-color)] rounded-xl py-3 px-4 outline-none focus:border-[var(--accent)] transition-all font-bold text-[14px]" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] ml-1">Company Type</label>
                        <select {...register('company_type')} className="w-full bg-[var(--input-bg)] border border-[var(--border-color)] rounded-xl py-3 px-4 outline-none focus:border-[var(--accent)] transition-all font-bold text-[14px] appearance-none">
                          <option value="">Select Type</option>
                          <option value="Private Limited Company(Pvt Ltd)">Pvt Ltd</option>
                          <option value="Public Limited Company(Ltd)">Ltd</option>
                          <option value="Partnership Firm">Partnership</option>
                          <option value="One Person Company(OPC)">OPC</option>
                          <option value="Sole Proprietorship">Proprietorship</option>
                          <option value="Limited Liability Partnership(LLP)">LLP</option>
                        </select>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] ml-1">GST Number</label>
                        <input {...register('gst_no')} className="w-full bg-[var(--input-bg)] border border-[var(--border-color)] rounded-xl py-3 px-4 outline-none focus:border-[var(--accent)] transition-all font-bold text-[14px]" />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="flex items-center gap-2 pb-2 border-b border-[var(--border-color)]">
                    <Mail size={16} className="text-[var(--accent)]" />
                    <h3 className="text-[11px] font-black uppercase tracking-widest text-[var(--accent)]">Communication</h3>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    {/* <div className="space-y-1.5 col-span-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] ml-1">Email</label>
                      <input {...register('email', { required: true })} className="w-full bg-[var(--input-bg)] border border-[var(--border-color)] rounded-xl py-3 px-4 outline-none focus:border-[var(--accent)] transition-all font-bold text-[14px]" />
                    </div> */}
                    
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] ml-1">Status</label>
                      <select {...register('status')} className="w-full bg-[var(--input-bg)] border border-[var(--border-color)] rounded-xl py-3 px-4 outline-none focus:border-[var(--accent)] transition-all font-bold text-[14px] appearance-none">
                        <option value="Active">Active</option>
                        <option value="Inactive">Inactive</option>
                      </select>
                    </div>

                    <div className="space-y-1.5 relative">
                      <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] ml-1">Product Status</label>
                      <button 
                        type="button"
                        onClick={() => setIsProductStatusModalOpen(true)}
                        className="w-full bg-[var(--input-bg)] border border-[var(--border-color)] rounded-xl py-3 px-4 outline-none hover:border-[var(--accent)] transition-all font-bold text-[14px] flex justify-between items-center group"
                      >
                        <span className="truncate group-hover:text-[var(--accent)] transition-colors">
                          {[watch('product_promoted'), watch('product_inquired'), watch('product_quoted'), watch('product_sampled'), watch('product_purchased')].filter(Boolean).length > 0 
                            ? `${[watch('product_promoted'), watch('product_inquired'), watch('product_quoted'), watch('product_sampled'), watch('product_purchased')].filter(Boolean).length} Selected` 
                            : 'Select Statuses'}
                        </span>
                        <Plus size={16} className="text-[var(--text-dim)] group-hover:text-[var(--accent)] transition-colors" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column */}
              <div className="lg:col-span-6 space-y-8">
                <div className="space-y-4">
                  <div className="flex items-center gap-2 pb-2 border-b border-[var(--border-color)]">
                    <MapPin size={16} className="text-[var(--accent)]" />
                    <h3 className="text-[11px] font-black uppercase tracking-widest text-[var(--accent)]">Address Directory</h3>
                  </div>

                  <div className="p-5 bg-[var(--nav-hover)] border border-[var(--border-color)] rounded-2xl">
                    <div className="flex items-center justify-between mb-4 border-b border-[var(--border-color)] pb-3">
                      <span className="text-[11px] font-black uppercase text-[var(--text-main)] tracking-widest">Saved Addresses</span>
                      <button type="button" onClick={() => handleOpenAddressModal()} className="flex items-center gap-1.5 text-[10px] font-black text-[var(--accent)] uppercase tracking-widest hover:opacity-70"><Plus size={14} /> Add New</button>
                    </div>
                    <div className="space-y-3 max-h-[250px] overflow-y-auto pr-1 custom-scrollbar">
                      {addresses.map((addr, idx) => (
                        <div key={idx} className="p-4 rounded-xl bg-[var(--bg-workspace)]/50 border border-[var(--border-color)] flex justify-between items-center group hover:border-[var(--accent)]/30 transition-all">
                          <div>
                            <p className="text-[12px] font-black uppercase text-[var(--text-main)]">{addr.company_name}</p>
                            <p className="text-[11px] font-bold text-[var(--text-muted)] mb-1.5">{addr.city}, {addr.state}</p>
                            <div className="flex flex-wrap gap-1.5">
                              {addr.is_registered && <span className="text-[8px] font-black uppercase px-1.5 py-0.5 bg-blue-500/10 text-blue-600 border border-blue-500/20 rounded">Registered</span>}
                              {addr.is_billing && <span className="text-[8px] font-black uppercase px-1.5 py-0.5 bg-purple-500/10 text-purple-600 border border-purple-500/20 rounded">Billing</span>}
                              {addr.is_shipping && <span className="text-[8px] font-black uppercase px-1.5 py-0.5 bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 rounded">Shipping</span>}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button type="button" onClick={() => handleOpenAddressModal(idx)} className="p-2 hover:bg-[var(--accent)]/10 text-[var(--text-dim)] hover:text-[var(--accent)] rounded-lg transition-all"><Edit2 size={16} /></button>
                            <button type="button" onClick={() => setAddresses(addresses.filter((_, i) => i !== idx))} className="p-2 hover:bg-rose-500/10 text-rose-500/50 hover:text-rose-500 rounded-lg transition-all"><Trash2 size={16} /></button>
                          </div>
                        </div>
                      ))}
                      {addresses.length === 0 && <div className="py-4 text-center border-2 border-dashed border-[var(--border-color)] rounded-xl opacity-20 text-[10px] font-black uppercase tracking-widest">No addresses added</div>}
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="flex items-center gap-2 pb-2 border-b border-[var(--border-color)]">
                    <Users size={16} className="text-[var(--accent)]" />
                    <h3 className="text-[11px] font-black uppercase tracking-widest text-[var(--accent)]">Key Personnel</h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                    {/* Technical Personnel */}
                    <div className="p-4 bg-[var(--nav-hover)] border border-[var(--border-color)] rounded-2xl space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase tracking-wider text-[var(--accent)]">Technical Personnel</span>
                        <button type="button" onClick={() => handleOpenPersonnelModal('technical')} className="p-1 hover:bg-[var(--accent)]/10 rounded text-[var(--accent)]"><Plus size={14} /></button>
                      </div>
                      <div className="space-y-2 max-h-[250px] overflow-y-auto custom-scrollbar pr-1">
                        {techContacts.map((c, idx) => (
                          <div key={idx} className="p-3 rounded-xl bg-[var(--bg-workspace)]/50 border border-[var(--border-color)] flex justify-between items-center group hover:border-[var(--accent)]/30 transition-all">
                            <div className="min-w-0 flex-1">
                              <p className="text-[12px] font-black uppercase text-[var(--text-main)] truncate">{c.name || c.person}</p>
                              {c.designation && <p className="text-[9px] font-extrabold text-[var(--accent)] uppercase tracking-widest truncate">{c.designation}</p>}
                              <div className="text-[10px] font-medium text-[var(--text-muted)] space-y-0.5 mt-1">
                                {c.mobile && <p className="flex items-center gap-1"><Phone size={10} className="text-[var(--accent)]/60" /> {c.mobile}</p>}
                                {c.email && <p className="flex items-center gap-1 truncate"><Mail size={10} className="text-[var(--accent)]/60" /> {c.email}</p>}
                              </div>
                            </div>
                            <div className="flex items-center gap-1 opacity-60 group-hover:opacity-100 transition-all ml-2 flex-shrink-0">
                              <button type="button" onClick={() => handleOpenPersonnelModal('technical', idx)} className="p-1.5 hover:bg-[var(--accent)]/10 text-[var(--text-dim)] hover:text-[var(--accent)] rounded transition-all"><Edit2 size={13} /></button>
                              <button type="button" onClick={() => setTechContacts(techContacts.filter((_, i) => i !== idx))} className="p-1.5 hover:bg-rose-500/10 text-rose-500/50 hover:text-rose-500 rounded transition-all"><Trash2 size={13} /></button>
                            </div>
                          </div>
                        ))}
                        {techContacts.length === 0 && (
                          <div className="py-4 text-center border border-dashed border-[var(--border-color)] rounded-xl opacity-40 text-[9px] font-black uppercase tracking-widest text-[var(--accent)]">No technical personnel added</div>
                        )}
                      </div>
                    </div>

                    {/* Purchase Personnel */}
                    <div className="p-4 bg-[var(--nav-hover)] border border-[var(--border-color)] rounded-2xl space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase tracking-wider text-[var(--accent)]">Purchase Personnel</span>
                        <button type="button" onClick={() => handleOpenPersonnelModal('sales')} className="p-1 hover:bg-[var(--accent)]/10 rounded text-[var(--accent)]"><Plus size={14} /></button>
                      </div>
                      <div className="space-y-2 max-h-[250px] overflow-y-auto custom-scrollbar pr-1">
                        {salesContacts.map((c, idx) => (
                          <div key={idx} className="p-3 rounded-xl bg-[var(--bg-workspace)]/50 border border-[var(--border-color)] flex justify-between items-center group hover:border-[var(--accent)]/30 transition-all">
                            <div className="min-w-0 flex-1">
                              <p className="text-[12px] font-black uppercase text-[var(--text-main)] truncate">{c.name || c.person}</p>
                              {c.designation && <p className="text-[9px] font-extrabold text-[var(--accent)] uppercase tracking-widest truncate">{c.designation}</p>}
                              <div className="text-[10px] font-medium text-[var(--text-muted)] space-y-0.5 mt-1">
                                {c.mobile && <p className="flex items-center gap-1"><Phone size={10} className="text-[var(--accent)]/60" /> {c.mobile}</p>}
                                {c.email && <p className="flex items-center gap-1 truncate"><Mail size={10} className="text-[var(--accent)]/60" /> {c.email}</p>}
                              </div>
                            </div>
                            <div className="flex items-center gap-1 opacity-60 group-hover:opacity-100 transition-all ml-2 flex-shrink-0">
                              <button type="button" onClick={() => handleOpenPersonnelModal('sales', idx)} className="p-1.5 hover:bg-[var(--accent)]/10 text-[var(--text-dim)] hover:text-[var(--accent)] rounded transition-all"><Edit2 size={13} /></button>
                              <button type="button" onClick={() => setSalesContacts(salesContacts.filter((_, i) => i !== idx))} className="p-1.5 hover:bg-rose-500/10 text-rose-500/50 hover:text-rose-500 rounded transition-all"><Trash2 size={13} /></button>
                            </div>
                          </div>
                        ))}
                        {salesContacts.length === 0 && (
                          <div className="py-4 text-center border border-dashed border-[var(--border-color)] rounded-xl opacity-40 text-[9px] font-black uppercase tracking-widest text-[var(--accent)]">No purchase personnel added</div>
                        )}
                      </div>
                    </div>

                    {/* Company Owner */}
                    <div className="p-4 bg-[var(--nav-hover)] border border-[var(--border-color)] rounded-2xl space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase tracking-wider text-[var(--accent)]">Company Owner</span>
                        <button type="button" onClick={() => handleOpenPersonnelModal('owner')} className="p-1 hover:bg-[var(--accent)]/10 rounded text-[var(--accent)]"><Plus size={14} /></button>
                      </div>
                      <div className="space-y-2 max-h-[250px] overflow-y-auto custom-scrollbar pr-1">
                        {ownerContacts.map((c, idx) => (
                          <div key={idx} className="p-3 rounded-xl bg-[var(--bg-workspace)]/50 border border-[var(--border-color)] flex justify-between items-center group hover:border-[var(--accent)]/30 transition-all">
                            <div className="min-w-0 flex-1">
                              <p className="text-[12px] font-black uppercase text-[var(--text-main)] truncate">{c.name || c.person}</p>
                              {c.designation && <p className="text-[9px] font-extrabold text-[var(--accent)] uppercase tracking-widest truncate">{c.designation}</p>}
                              <div className="text-[10px] font-medium text-[var(--text-muted)] space-y-0.5 mt-1">
                                {c.mobile && <p className="flex items-center gap-1"><Phone size={10} className="text-[var(--accent)]/60" /> {c.mobile}</p>}
                                {c.email && <p className="flex items-center gap-1 truncate"><Mail size={10} className="text-[var(--accent)]/60" /> {c.email}</p>}
                              </div>
                            </div>
                            <div className="flex items-center gap-1 opacity-60 group-hover:opacity-100 transition-all ml-2 flex-shrink-0">
                              <button type="button" onClick={() => handleOpenPersonnelModal('owner', idx)} className="p-1.5 hover:bg-[var(--accent)]/10 text-[var(--text-dim)] hover:text-[var(--accent)] rounded transition-all"><Edit2 size={13} /></button>
                              <button type="button" onClick={() => setOwnerContacts(ownerContacts.filter((_, i) => i !== idx))} className="p-1.5 hover:bg-rose-500/10 text-rose-500/50 hover:text-rose-500 rounded transition-all"><Trash2 size={13} /></button>
                            </div>
                          </div>
                        ))}
                        {ownerContacts.length === 0 && (
                          <div className="py-4 text-center border border-dashed border-[var(--border-color)] rounded-xl opacity-40 text-[9px] font-black uppercase tracking-widest text-[var(--accent)]">No owner added</div>
                        )}
                      </div>
                    </div>

                    {/* Accounts */}
                    <div className="p-4 bg-[var(--nav-hover)] border border-[var(--border-color)] rounded-2xl space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase tracking-wider text-[var(--accent)]">Accounts</span>
                        <button type="button" onClick={() => handleOpenPersonnelModal('accounts')} className="p-1 hover:bg-[var(--accent)]/10 rounded text-[var(--accent)]"><Plus size={14} /></button>
                      </div>
                      <div className="space-y-2 max-h-[250px] overflow-y-auto custom-scrollbar pr-1">
                        {accountsContacts.map((c, idx) => (
                          <div key={idx} className="p-3 rounded-xl bg-[var(--bg-workspace)]/50 border border-[var(--border-color)] flex justify-between items-center group hover:border-[var(--accent)]/30 transition-all">
                            <div className="min-w-0 flex-1">
                              <p className="text-[12px] font-black uppercase text-[var(--text-main)] truncate">{c.name || c.person}</p>
                              {c.designation && <p className="text-[9px] font-extrabold text-[var(--accent)] uppercase tracking-widest truncate">{c.designation}</p>}
                              <div className="text-[10px] font-medium text-[var(--text-muted)] space-y-0.5 mt-1">
                                {c.mobile && <p className="flex items-center gap-1"><Phone size={10} className="text-[var(--accent)]/60" /> {c.mobile}</p>}
                                {c.email && <p className="flex items-center gap-1 truncate"><Mail size={10} className="text-[var(--accent)]/60" /> {c.email}</p>}
                              </div>
                            </div>
                            <div className="flex items-center gap-1 opacity-60 group-hover:opacity-100 transition-all ml-2 flex-shrink-0">
                              <button type="button" onClick={() => handleOpenPersonnelModal('accounts', idx)} className="p-1.5 hover:bg-[var(--accent)]/10 text-[var(--text-dim)] hover:text-[var(--accent)] rounded transition-all"><Edit2 size={13} /></button>
                              <button type="button" onClick={() => setAccountsContacts(accountsContacts.filter((_, i) => i !== idx))} className="p-1.5 hover:bg-rose-500/10 text-rose-500/50 hover:text-rose-500 rounded transition-all"><Trash2 size={13} /></button>
                            </div>
                          </div>
                        ))}
                        {accountsContacts.length === 0 && (
                          <div className="py-4 text-center border border-dashed border-[var(--border-color)] rounded-xl opacity-40 text-[9px] font-black uppercase tracking-widest text-[var(--accent)]">No accounts added</div>
                        )}
                      </div>
                    </div>

                    {/* QA/QC */}
                    <div className="p-4 bg-[var(--nav-hover)] border border-[var(--border-color)] rounded-2xl space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase tracking-wider text-[var(--accent)]">QA/QC</span>
                        <button type="button" onClick={() => handleOpenPersonnelModal('qa_qc')} className="p-1 hover:bg-[var(--accent)]/10 rounded text-[var(--accent)]"><Plus size={14} /></button>
                      </div>
                      <div className="space-y-2 max-h-[250px] overflow-y-auto custom-scrollbar pr-1">
                        {qaQcContacts.map((c, idx) => (
                          <div key={idx} className="p-3 rounded-xl bg-[var(--bg-workspace)]/50 border border-[var(--border-color)] flex justify-between items-center group hover:border-[var(--accent)]/30 transition-all">
                            <div className="min-w-0 flex-1">
                              <p className="text-[12px] font-black uppercase text-[var(--text-main)] truncate">{c.name || c.person}</p>
                              {c.designation && <p className="text-[9px] font-extrabold text-[var(--accent)] uppercase tracking-widest truncate">{c.designation}</p>}
                              <div className="text-[10px] font-medium text-[var(--text-muted)] space-y-0.5 mt-1">
                                {c.mobile && <p className="flex items-center gap-1"><Phone size={10} className="text-[var(--accent)]/60" /> {c.mobile}</p>}
                                {c.email && <p className="flex items-center gap-1 truncate"><Mail size={10} className="text-[var(--accent)]/60" /> {c.email}</p>}
                              </div>
                            </div>
                            <div className="flex items-center gap-1 opacity-60 group-hover:opacity-100 transition-all ml-2 flex-shrink-0">
                              <button type="button" onClick={() => handleOpenPersonnelModal('qa_qc', idx)} className="p-1.5 hover:bg-[var(--accent)]/10 text-[var(--text-dim)] hover:text-[var(--accent)] rounded transition-all"><Edit2 size={13} /></button>
                              <button type="button" onClick={() => setQaQcContacts(qaQcContacts.filter((_, i) => i !== idx))} className="p-1.5 hover:bg-rose-500/10 text-rose-500/50 hover:text-rose-500 rounded transition-all"><Trash2 size={13} /></button>
                            </div>
                          </div>
                        ))}
                        {qaQcContacts.length === 0 && (
                          <div className="py-4 text-center border border-dashed border-[var(--border-color)] rounded-xl opacity-40 text-[9px] font-black uppercase tracking-widest text-[var(--accent)]">No QA/QC added</div>
                        )}
                      </div>
                    </div>

                    {/* Other Personnel */}
                    <div className="p-4 bg-[var(--nav-hover)] border border-[var(--border-color)] rounded-2xl space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase tracking-wider text-[var(--accent)]">Other Personnel</span>
                        <button type="button" onClick={() => handleOpenPersonnelModal('other')} className="p-1 hover:bg-[var(--accent)]/10 rounded text-[var(--accent)]"><Plus size={14} /></button>
                      </div>
                      <div className="space-y-2 max-h-[250px] overflow-y-auto custom-scrollbar pr-1">
                        {otherContacts.map((c, idx) => (
                          <div key={idx} className="p-3 rounded-xl bg-[var(--bg-workspace)]/50 border border-[var(--border-color)] flex justify-between items-center group hover:border-[var(--accent)]/30 transition-all">
                            <div className="min-w-0 flex-1">
                              <p className="text-[12px] font-black uppercase text-[var(--text-main)] truncate">{c.name || c.person}</p>
                              {c.designation && <p className="text-[9px] font-extrabold text-[var(--accent)] uppercase tracking-widest truncate">{c.designation}</p>}
                              <div className="text-[10px] font-medium text-[var(--text-muted)] space-y-0.5 mt-1">
                                {c.mobile && <p className="flex items-center gap-1"><Phone size={10} className="text-[var(--accent)]/60" /> {c.mobile}</p>}
                                {c.email && <p className="flex items-center gap-1 truncate"><Mail size={10} className="text-[var(--accent)]/60" /> {c.email}</p>}
                              </div>
                            </div>
                            <div className="flex items-center gap-1 opacity-60 group-hover:opacity-100 transition-all ml-2 flex-shrink-0">
                              <button type="button" onClick={() => handleOpenPersonnelModal('other', idx)} className="p-1.5 hover:bg-[var(--accent)]/10 text-[var(--text-dim)] hover:text-[var(--accent)] rounded transition-all"><Edit2 size={13} /></button>
                              <button type="button" onClick={() => setOtherContacts(otherContacts.filter((_, i) => i !== idx))} className="p-1.5 hover:bg-rose-500/10 text-rose-500/50 hover:text-rose-500 rounded transition-all"><Trash2 size={13} /></button>
                            </div>
                          </div>
                        ))}
                        {otherContacts.length === 0 && (
                          <div className="py-4 text-center border border-dashed border-[var(--border-color)] rounded-xl opacity-40 text-[9px] font-black uppercase tracking-widest text-[var(--accent)]">No other personnel added</div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </form>
        )}
      </Modal>

      {/* Address Modal */}
      <Modal
        isOpen={isAddressModalOpen}
        onClose={() => setIsAddressModalOpen(false)}
        title={editingAddressIdx !== null ? "Edit Address Details" : "Register New Address"}
        maxWidth="max-w-3xl"
        headerActions={
          <button onClick={handleSaveAddress} className="px-5 py-2 bg-[var(--accent)] text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:opacity-90 shadow-lg flex items-center gap-2">
            <Check size={14} /> Confirm Address
          </button>
        }
      >
        <div className="space-y-6 py-2">
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] ml-1">Company/Entity Name</label>
              <input value={tempAddress?.company_name} onChange={e => setTempAddress({ ...tempAddress, company_name: e.target.value })} className="w-full bg-[var(--input-bg)] border border-[var(--border-color)] rounded-xl py-3 px-4 font-bold text-[14px]" placeholder="E.g. Branch Office" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] ml-1">Contact Number</label>
              <input value={tempAddress?.mobile} onChange={e => setTempAddress({ ...tempAddress, mobile: e.target.value })} className="w-full bg-[var(--input-bg)] border border-[var(--border-color)] rounded-xl py-3 px-4 font-bold text-[14px]" placeholder="Mobile for delivery" />
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] ml-1">Flat, House, Building</label>
              <input value={tempAddress?.flat} onChange={e => setTempAddress({ ...tempAddress, flat: e.target.value })} className="w-full bg-[var(--input-bg)] border border-[var(--border-color)] rounded-xl py-3 px-4 font-bold text-[14px]" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] ml-1">Area, Street, Village</label>
              <input value={tempAddress?.area} onChange={e => setTempAddress({ ...tempAddress, area: e.target.value })} className="w-full bg-[var(--input-bg)] border border-[var(--border-color)] rounded-xl py-3 px-4 font-bold text-[14px]" />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] ml-1">City</label>
              <input value={tempAddress?.city} onChange={e => setTempAddress({ ...tempAddress, city: e.target.value })} className="w-full bg-[var(--input-bg)] border border-[var(--border-color)] rounded-xl py-3 px-4 font-bold text-[14px]" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] ml-1">State</label>
              <input value={tempAddress?.state} onChange={e => setTempAddress({ ...tempAddress, state: e.target.value })} className="w-full bg-[var(--input-bg)] border border-[var(--border-color)] rounded-xl py-3 px-4 font-bold text-[14px]" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] ml-1">Pincode</label>
              <input value={tempAddress?.pincode} onChange={e => setTempAddress({ ...tempAddress, pincode: e.target.value })} className="w-full bg-[var(--input-bg)] border border-[var(--border-color)] rounded-xl py-3 px-4 font-bold text-[14px]" />
            </div>
          </div>

          <div className="flex items-center gap-10 pt-4 border-t border-[var(--border-color)]">
            <label className="flex items-center gap-3 cursor-pointer group">
              <input type="checkbox" checked={tempAddress?.is_registered} onChange={e => setTempAddress({ ...tempAddress, is_registered: e.target.checked })} className="w-5 h-5 rounded-md border-2 border-[var(--border-color)] text-blue-600 focus:ring-0 transition-all" />
              <span className="text-[11px] font-black uppercase tracking-widest text-[var(--text-main)] group-hover:text-blue-600 transition-colors">Registered</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer group">
              <input type="checkbox" checked={tempAddress?.is_billing} onChange={e => setTempAddress({ ...tempAddress, is_billing: e.target.checked })} className="w-5 h-5 rounded-md border-2 border-[var(--border-color)] text-purple-600 focus:ring-0 transition-all" />
              <span className="text-[11px] font-black uppercase tracking-widest text-[var(--text-main)] group-hover:text-purple-600 transition-colors">Billing</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer group">
              <input type="checkbox" checked={tempAddress?.is_shipping} onChange={e => setTempAddress({ ...tempAddress, is_shipping: e.target.checked })} className="w-5 h-5 rounded-md border-2 border-[var(--border-color)] text-emerald-600 focus:ring-0 transition-all" />
              <span className="text-[11px] font-black uppercase tracking-widest text-[var(--text-main)] group-hover:text-emerald-600 transition-colors">Shipping</span>
            </label>
          </div>
        </div>
      </Modal>

      {/* Personnel Modal */}
      <Modal
        isOpen={isPersonnelModalOpen}
        onClose={() => setIsPersonnelModalOpen(false)}
        title={editingPersonnelIdx !== null ? `Edit ${personnelType === 'technical' ? 'Technical' : personnelType === 'sales' ? 'Purchase' : personnelType === 'owner' ? 'Company Owner' : personnelType === 'accounts' ? 'Accounts' : 'QA/QC'} Personnel Details` : `Register New ${personnelType === 'technical' ? 'Technical' : personnelType === 'sales' ? 'Purchase' : personnelType === 'owner' ? 'Company Owner' : personnelType === 'accounts' ? 'Accounts' : 'QA/QC'} Personnel`}
        maxWidth="max-w-xl"
        headerActions={
          <button onClick={handleSavePersonnel} className="px-5 py-2 bg-[var(--accent)] text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:opacity-90 shadow-lg flex items-center gap-2">
            <Check size={14} /> Save Personnel
          </button>
        }
      >
        <div className="space-y-6 py-2">
          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] ml-1">Full Name</label>
            <input value={tempPersonnel?.name} onChange={e => setTempPersonnel({ ...tempPersonnel, name: e.target.value })} className="w-full bg-[var(--input-bg)] border border-[var(--border-color)] rounded-xl py-3 px-4 font-bold text-[14px]" placeholder="E.g. John Doe" />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] ml-1">Designation</label>
            <input value={tempPersonnel?.designation} onChange={e => setTempPersonnel({ ...tempPersonnel, designation: e.target.value })} className="w-full bg-[var(--input-bg)] border border-[var(--border-color)] rounded-xl py-3 px-4 font-bold text-[14px]" placeholder="E.g. Project Manager" />
          </div>
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] ml-1">Contact Number</label>
              <input value={tempPersonnel?.mobile} onChange={e => setTempPersonnel({ ...tempPersonnel, mobile: e.target.value })} className="w-full bg-[var(--input-bg)] border border-[var(--border-color)] rounded-xl py-3 px-4 font-bold text-[14px]" placeholder="Mobile number" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] ml-1">Email Address</label>
              <input value={tempPersonnel?.email} onChange={e => setTempPersonnel({ ...tempPersonnel, email: e.target.value })} className="w-full bg-[var(--input-bg)] border border-[var(--border-color)] rounded-xl py-3 px-4 font-bold text-[14px]" placeholder="email@company.com" />
            </div>
          </div>
        </div>
      </Modal>

      {/* Product Status Modal */}
      <Modal
        isOpen={isProductStatusModalOpen}
        onClose={() => setIsProductStatusModalOpen(false)}
        title="Manage Product Status"
        maxWidth="max-w-xl"
        headerActions={
          <button onClick={(e) => { e.preventDefault(); setIsProductStatusModalOpen(false); }} className="px-5 py-2 bg-[var(--accent)] text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:opacity-90 shadow-lg flex items-center gap-2">
            <Check size={14} /> Done
          </button>
        }
      >
        <div className="space-y-3 py-2">
          {[
            { name: 'product_promoted', label: 'Product Promoted', desc: 'Actively marketed & featured in campaigns' },
            { name: 'product_inquired', label: 'Product Inquired', desc: 'Customer queries received for this product' },
            { name: 'product_quoted', label: 'Product Quoted', desc: 'Formal price quotes generated for clients' },
            { name: 'product_sampled', label: 'Product Sampled', desc: 'Samples sent to prospective customers' },
            { name: 'product_purchased', label: 'Product Purchased', desc: 'Successfully ordered & sold in orders' }
          ].map(status => {
            const isChecked = watch(status.name);
            return (
              <label 
                key={status.name}
                className={`flex items-start gap-4 p-4 rounded-xl border transition-all duration-300 cursor-pointer select-none group relative overflow-hidden ${
                  isChecked 
                    ? 'bg-[var(--accent)]/5 border-[var(--accent)]' 
                    : 'bg-[var(--bg-workspace)]/40 border-[var(--border-color)] hover:border-[var(--text-muted)]/50'
                }`}
              >
                <input 
                  type="checkbox"
                  {...register(status.name)}
                  disabled={modalMode === 'view'}
                  className="sr-only"
                />
                <div className={`mt-0.5 w-5 h-5 rounded-md border flex items-center justify-center flex-shrink-0 transition-all ${
                  isChecked 
                    ? 'bg-[var(--accent)] border-[var(--accent)] text-white' 
                    : 'border-[var(--text-muted)] group-hover:border-[var(--text-main)]'
                }`}>
                  {isChecked && <Check size={12} strokeWidth={4} />}
                </div>

                <div className="space-y-0.5">
                  <span className={`block text-[13px] font-black uppercase tracking-wider transition-colors ${
                    isChecked ? 'text-[var(--accent)]' : 'text-[var(--text-main)]'
                  }`}>
                    {status.label}
                  </span>
                  <span className="block text-[11px] text-[var(--text-muted)] leading-relaxed font-medium">
                    {status.desc}
                  </span>
                </div>
              </label>
            );
          })}
        </div>
      </Modal>
    </div>
  );
};

export default CustomerListPage;
