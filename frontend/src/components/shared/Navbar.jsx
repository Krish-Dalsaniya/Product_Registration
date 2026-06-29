import React, { useRef, useState, useEffect } from 'react';
import { Menu, X, Briefcase, ChevronLeft, ChevronRight, Trash2, Package, Bell, AlertTriangle, PackagePlus, Loader2, LifeBuoy, LogOut, Shield } from 'lucide-react';
import { Home, Users, ShoppingBag, Wrench, Box, Layers, Cpu, LayoutGrid } from 'lucide-react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { getNotifications, addPCBStock, addElectronicsStock, addElectricalStock, addStructuralStock } from '../../api/inventory';
import { fetchPendingRegistrationsApi, approveRegistrationApi, rejectRegistrationApi } from '../../api/hr';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import Modal from './Modal';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';

const IconMap = {
  Home,
  Users,
  Briefcase,
  ShoppingBag,
  Wrench,
  Box,
  Layers,
  Cpu,
  LayoutGrid,
  Package
};

const Navbar = ({ onMenuClick, tabs = [], activePath = '', onTabClose, onTabClick, onClearAllTabs }) => {
  const scrollContainerRef = useRef(null);
  const activeTabRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const notificationsRef = useRef(null);
  const { user, logout, hasPermission } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  const handleLogout = () => {
    Swal.fire({
      title: 'Sign Out?',
      text: 'Are you sure you want to log out?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#f06532',
      cancelButtonColor: '#a89b96',
      confirmButtonText: 'Yes, sign out',
      background: 'var(--bg-card)',
      color: 'var(--text-main)',
      iconColor: '#f06532'
    }).then((result) => {
      if (result.isConfirmed) {
        logout();
      }
    });
  };

  const basePath = user?.role_name ? `/${user.role_name.toLowerCase()}` : '/admin';

  const hasInventoryAccess = hasPermission('inventory', 'view');
  const hasTicketsAccess = hasPermission('support_tickets', 'view');
  const hasHRAccess = hasPermission('hr', 'view', 'employees');
  const hasNotificationsAccess = hasInventoryAccess || hasTicketsAccess || hasHRAccess;

  const [quickAddModal, setQuickAddModal] = useState({ isOpen: false, item: null, quantityToAdd: '' });

  const { data: notificationsRes } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => getNotifications().then(res => res.data.data),
    enabled: !!(hasInventoryAccess || hasTicketsAccess),
    refetchInterval: 60000,
  });

  const { data: pendingRegRes } = useQuery({
    queryKey: ['pendingRegistrations'],
    queryFn: () => fetchPendingRegistrationsApi().then(res => res.data.data),
    enabled: !!hasHRAccess,
    refetchInterval: 60000,
  });

  const alerts = notificationsRes?.inventoryAlerts || [];
  const tickets = notificationsRes?.supportTickets || [];
  const pendingRegistrations = pendingRegRes || [];
  const totalNotifications = alerts.length + tickets.length + pendingRegistrations.length;

  const addStockMutation = useMutation({
    mutationFn: async ({ category, id, quantity }) => {
      switch(category) {
        case 'PCB': return await addPCBStock(id, quantity);
        case 'Electronics': return await addElectronicsStock(id, quantity);
        case 'Electrical': return await addElectricalStock(id, quantity);
        case 'Structural': return await addStructuralStock(id, quantity);
        default: throw new Error('Unknown category');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['notifications']);
      setQuickAddModal({ isOpen: false, item: null, quantityToAdd: '' });
    }
  });

  const handleQuickAddSubmit = (e) => {
    e.preventDefault();
    addStockMutation.mutate({
      category: quickAddModal.item.category,
      id: quickAddModal.item.id,
      quantity: parseInt(quickAddModal.quantityToAdd, 10)
    });
  };

  const handleApproveRegistration = async (id) => {
    const result = await Swal.fire({
      title: 'Approve Registration?',
      text: 'This will create an employee account and send a welcome email.',
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#10b981',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Yes, Approve'
    });

    if (result.isConfirmed) {
      try {
        const res = await approveRegistrationApi(id);
        if (res.data?.success) {
          toast.success('Registration approved successfully.');
          queryClient.invalidateQueries(['pendingRegistrations']);
        }
      } catch (error) {
        toast.error(error.response?.data?.error?.message || 'Failed to approve registration');
      }
    }
  };

  const handleRejectRegistration = async (id) => {
    const result = await Swal.fire({
      title: 'Reject Registration?',
      text: 'This will reject the request and notify the user.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Yes, Reject'
    });

    if (result.isConfirmed) {
      try {
        const res = await rejectRegistrationApi(id);
        if (res.data?.success) {
          toast.success('Registration rejected successfully.');
          queryClient.invalidateQueries(['pendingRegistrations']);
        }
      } catch (error) {
        toast.error('Failed to reject registration');
      }
    }
  };

  // Close notifications when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notificationsRef.current && !notificationsRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const checkScroll = () => {
    if (scrollContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(Math.ceil(scrollLeft + clientWidth) < scrollWidth);
    }
  };

  useEffect(() => {
    checkScroll();
    window.addEventListener('resize', checkScroll);
    return () => window.removeEventListener('resize', checkScroll);
  }, [tabs]);

  useEffect(() => {
    if (activeTabRef.current && scrollContainerRef.current) {
      activeTabRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
  }, [activePath, tabs.length]);

  const scrollByAmount = (amount) => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: amount, behavior: 'smooth' });
    }
  };

  return (
    <header className="fixed top-0 right-0 left-0 md:left-64 h-[52px] z-30 transition-all">
      <div
        className="h-full px-4 md:px-8 flex items-center justify-between gap-4"
        style={{
          background: 'var(--grad-header)',
          borderBottom: '1px solid var(--border-color)',
          boxShadow: 'var(--card-shadow)',
        }}
      >
        <button
          onClick={onMenuClick}
          className="md:hidden p-3 rounded-xl transition-all bg-[var(--bg-elevated)] border border-[var(--border-color)] text-[var(--accent)]"
        >
          <Menu size={20} strokeWidth={3} />
        </button>

        {/* Dynamic Workspace Tabs inside Navbar */}
        <div className="hidden md:flex flex-1 items-center gap-2 overflow-hidden h-full">
          {canScrollLeft && (
            <button
              onClick={() => scrollByAmount(-200)}
              className="z-10 p-1.5 h-[32px] w-[32px] flex-shrink-0 flex items-center justify-center bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-muted)] hover:text-[var(--accent)] hover:border-[var(--accent)] rounded-lg shadow-sm transition-all"
            >
              <ChevronLeft size={16} strokeWidth={3} />
            </button>
          )}
          
          <div 
            ref={scrollContainerRef}
            onScroll={checkScroll}
            className="flex items-center gap-2 overflow-hidden h-full py-2 select-none w-full scroll-smooth"
          >
          {tabs.map((tab) => {
            const isActive = activePath === tab.fullPath;
            const Icon = IconMap[tab.iconType] || Briefcase;
            return (
              <div
                key={tab.fullPath}
                ref={isActive ? activeTabRef : null}
                onClick={() => onTabClick(tab.fullPath)}
                className={`flex items-center gap-2.5 px-5 py-2 rounded-md text-[10px] font-black uppercase tracking-widest cursor-pointer border transition-all duration-300 flex-shrink-0 group ${
                  isActive
                    ? 'text-white border-transparent shadow-md shadow-[var(--border-glow)]'
                    : 'bg-[var(--bg-card)] text-[var(--text-muted)] border-[var(--border-color)] hover:border-[var(--accent)]/40 hover:text-[var(--text-main)]'
                }`}
                style={isActive ? { background: 'var(--grad-button)', boxShadow: '0 4px 12px -2px var(--border-glow)' } : {}}
              >
                <Icon size={12} className={isActive ? 'text-white' : 'text-[var(--text-dim)] group-hover:text-[var(--accent)] transition-colors'} />
                <span>{tab.label}</span>
                <button
                  onClick={(e) => onTabClose(e, tab.fullPath)}
                  className={`p-0.5 rounded-full transition-all duration-200 ${
                    isActive
                      ? 'hover:bg-white/20 text-white'
                      : 'hover:bg-rose-500/10 text-[var(--text-dim)] hover:text-rose-500'
                  }`}
                >
                  <X size={10} strokeWidth={3} />
                </button>
              </div>
            );
          })}
          </div>

          {canScrollRight && (
            <button
              onClick={() => scrollByAmount(200)}
              className="z-10 p-1.5 h-[32px] w-[32px] flex-shrink-0 flex items-center justify-center bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-muted)] hover:text-[var(--accent)] hover:border-[var(--accent)] rounded-lg shadow-sm transition-all"
            >
              <ChevronRight size={16} strokeWidth={3} />
            </button>
          )}

          {tabs.length > 1 && (
            <div className="flex items-center pl-2 ml-1 border-l border-[var(--border-color)]">
              <button
                onClick={onClearAllTabs}
                title="Clear All Tabs"
                className="z-10 p-1.5 h-[32px] w-[32px] flex-shrink-0 flex items-center justify-center bg-rose-500/10 border border-rose-500/20 text-rose-500 hover:bg-rose-500 hover:text-white hover:border-rose-500 rounded-lg shadow-sm transition-all"
              >
                <Trash2 size={16} strokeWidth={3} />
              </button>
            </div>
          )}

        </div>
        
        <div className="flex items-center gap-4 md:gap-6 flex-shrink-0">
          {hasNotificationsAccess && (
            <div className="relative flex items-center" ref={notificationsRef}>
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                title="Notifications"
                className={`z-10 relative p-1.5 h-[32px] w-[32px] flex-shrink-0 flex items-center justify-center border rounded-lg shadow-sm transition-all ${showNotifications ? 'bg-[var(--accent)] border-[var(--accent)] text-white' : 'bg-[var(--bg-card)] border-[var(--border-color)] text-[var(--text-muted)] hover:text-[var(--accent)] hover:border-[var(--accent)]'}`}
              >
                <Bell size={16} strokeWidth={showNotifications ? 3 : 2} />
                {totalNotifications > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[9px] font-bold text-white shadow-sm ring-2 ring-[var(--bg-card)]">
                    {totalNotifications}
                  </span>
                )}
              </button>

              {showNotifications && (
                <div className="absolute top-10 right-0 w-80 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl shadow-2xl overflow-hidden z-50 animate-scale-in">
                  <div className="px-4 py-3 border-b border-[var(--border-color)] bg-[var(--bg-workspace)] flex items-center justify-between">
                    <h3 className="text-[12px] font-black uppercase tracking-widest text-[var(--text-main)] flex items-center gap-2">
                      <Bell size={14} className="text-amber-500" />
                      Notifications
                    </h3>
                    <span className="text-[10px] font-bold text-rose-500 bg-rose-500/10 px-2 py-0.5 rounded-full">{totalNotifications} new</span>
                  </div>
                  <div className="max-h-[70vh] overflow-y-auto custom-scrollbar">
                    {totalNotifications === 0 ? (
                      <div className="p-6 text-center text-[12px] text-[var(--text-muted)]">
                        You have no new notifications.
                      </div>
                    ) : (
                      <div className="divide-y divide-[var(--border-color)]/50">
                        {pendingRegistrations.length > 0 && (
                          <div className="py-2">
                            <h4 className="px-4 py-1 text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Pending Registrations</h4>
                            {pendingRegistrations.map((reg) => (
                              <div key={`reg-${reg.id}`} className="px-4 py-3 hover:bg-[var(--nav-hover)] transition-colors group border-b border-[var(--border-color)]/30 last:border-0">
                                <div className="flex-1 min-w-0 pr-4">
                                  <p className="text-[12px] font-bold text-[var(--text-main)] truncate">{reg.full_name}</p>
                                  <p className="text-[10px] font-black tracking-widest text-[var(--text-dim)] mt-1 truncate">{reg.email}</p>
                                </div>
                                <div className="flex gap-2 mt-2">
                                  <button
                                    onClick={() => { setShowNotifications(false); handleApproveRegistration(reg.id); }}
                                    className="flex-1 py-1 bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500 hover:text-white rounded text-[10px] font-bold transition-colors"
                                  >
                                    Approve
                                  </button>
                                  <button
                                    onClick={() => { setShowNotifications(false); handleRejectRegistration(reg.id); }}
                                    className="flex-1 py-1 bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white rounded text-[10px] font-bold transition-colors"
                                  >
                                    Reject
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                        {tickets.length > 0 && (
                          <div className="py-2">
                            <h4 className="px-4 py-1 text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Support Tickets</h4>
                            {tickets.map((ticket, idx) => (
                              <div key={`ticket-${ticket.ticket_id}`} 
                                className="px-4 py-3 hover:bg-[var(--nav-hover)] transition-colors flex items-center justify-between cursor-pointer"
                                onClick={() => { setShowNotifications(false); navigate(`${basePath}/support-tickets/${ticket.id}`); }}
                              >
                                <div className="flex-1 min-w-0 pr-4">
                                  <p className="text-[12px] font-bold text-[var(--text-main)] truncate">{ticket.subject}</p>
                                  <p className="text-[10px] font-black uppercase tracking-widest text-amber-500 mt-1">Ticket {ticket.ticket_id}</p>
                                </div>
                                <LifeBuoy size={16} className="text-[var(--text-dim)]" />
                              </div>
                            ))}
                          </div>
                        )}
                        {alerts.length > 0 && (
                          <div className="py-2">
                            <h4 className="px-4 py-1 text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Low Stock Alerts</h4>
                            {alerts.map((alert, idx) => (
                              <div key={`${alert.category}-${alert.id}-${idx}`} className="px-4 py-3 hover:bg-[var(--nav-hover)] transition-colors flex items-center justify-between group">
                                <div className="flex-1 min-w-0 pr-4">
                                  <p className="text-[12px] font-bold text-[var(--text-main)] truncate">{alert.name}</p>
                                  <p className="text-[10px] font-black uppercase tracking-widest text-[var(--accent)] mt-1">{alert.category}</p>
                                </div>
                                <div className="flex-shrink-0 text-right flex items-center gap-3">
                                  <div className="flex flex-col items-end">
                                    <span className="text-[14px] font-black text-rose-500 leading-none">{alert.stock_quantity}</span>
                                    <span className="text-[8px] uppercase tracking-wider text-[var(--text-dim)] mt-1">left</span>
                                  </div>
                                  <button
                                    onClick={() => { setShowNotifications(false); setQuickAddModal({ isOpen: true, item: alert, quantityToAdd: '' }); }}
                                    className="p-1.5 bg-[var(--accent)]/10 text-[var(--accent)] rounded hover:bg-[var(--accent)] hover:text-white transition-all shadow-sm opacity-0 group-hover:opacity-100"
                                    title="Quick Restock"
                                  >
                                    <PackagePlus size={14} />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
          {/* Logout Button */}
          <button
            onClick={handleLogout}
            title="Log out"
            className="p-1.5 h-[32px] w-[32px] flex-shrink-0 flex items-center justify-center bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-muted)] hover:text-rose-500 hover:border-rose-500 rounded-lg shadow-sm transition-all"
          >
            <LogOut size={16} strokeWidth={2} />
          </button>
        </div>
      </div>

      {quickAddModal.isOpen && (
        <Modal
          isOpen={quickAddModal.isOpen}
          onClose={() => setQuickAddModal({ isOpen: false, item: null, quantityToAdd: '' })}
          title="Quick Restock"
          maxWidth="max-w-md"
        >
          <form onSubmit={handleQuickAddSubmit} className="space-y-6">
             <div className="bg-[var(--bg-workspace)] p-4 rounded-2xl border border-[var(--border-color)]">
                <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-1">Item to Restock</p>
                <p className="text-[14px] font-bold text-[var(--text-main)] truncate">{quickAddModal.item?.name}</p>
                <p className="text-[11px] font-black text-[var(--accent)] mt-1">{quickAddModal.item?.part_number}</p>
             </div>
             
             <div className="space-y-2">
                <label className="block text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest ml-1">
                   Quantity to Add <span className="text-rose-500">*</span>
                </label>
                <input 
                   type="number"
                   min="1"
                   required
                   value={quickAddModal.quantityToAdd}
                   onChange={(e) => setQuickAddModal(prev => ({ ...prev, quantityToAdd: e.target.value }))}
                   placeholder="Enter quantity"
                   className="w-full bg-[var(--bg-workspace)] border border-[var(--border-color)] rounded-xl px-5 py-3.5 text-[14px] text-[var(--text-main)] outline-none focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--accent)]/10 transition-all font-bold"
                />
             </div>

             <div className="flex justify-end gap-3 pt-4 border-t border-[var(--border-color)]">
                <button
                   type="button"
                   onClick={() => setQuickAddModal({ isOpen: false, item: null, quantityToAdd: '' })}
                   className="px-6 py-2.5 text-[11px] font-black uppercase tracking-widest text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors"
                >
                   Cancel
                </button>
                <button
                   type="submit"
                   disabled={addStockMutation.isPending}
                   className="px-6 py-2.5 text-[11px] font-black uppercase tracking-widest bg-[var(--accent)] text-white rounded-xl hover:opacity-90 shadow-md transition-all flex items-center gap-2 disabled:opacity-50"
                >
                   {addStockMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <PackagePlus size={14} />}
                   Confirm Restock
                </button>
             </div>
          </form>
        </Modal>
      )}
    </header>
  );
};

export default Navbar;
