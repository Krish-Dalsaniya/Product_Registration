import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getAuditLogs } from '../../api/admin';
import DataTable from '../../components/shared/DataTable';
import Modal from '../../components/shared/Modal';
import { Shield, Search, Calendar, ChevronLeft, ChevronRight, Eye } from 'lucide-react';
import { format } from 'date-fns';

const AuditLogsPage = ({ isEmbedded = false }) => {
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({
    action: '',
    entityType: '',
    startDate: '',
    endDate: ''
  });
  
  const [selectedLog, setSelectedLog] = useState(null);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['audit-logs', page, filters],
    queryFn: async () => {
      const response = await getAuditLogs({ page, limit: 20, ...filters });
      return response.data;
    }
  });

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
    setPage(1); // Reset to page 1 on filter change
  };

  const logs = data?.logs || [];
  const totalPages = data?.totalPages || 1;

  const renderActionBadge = (action) => {
    let colorClass = 'bg-[var(--accent)]/10 text-[var(--accent)]';
    if (action.includes('LOGIN')) colorClass = 'bg-green-500/10 text-green-700';
    else if (action.includes('LOGOUT')) colorClass = 'bg-orange-500/10 text-orange-700';
    else if (action.includes('CREATE')) colorClass = 'bg-blue-500/10 text-blue-700';
    else if (action.includes('UPDATE')) colorClass = 'bg-yellow-500/10 text-yellow-700';
    else if (action.includes('DELETE')) colorClass = 'bg-red-500/10 text-red-700';

    return (
      <span className={`px-4 py-1.5 rounded-full text-[10px] font-black tracking-widest uppercase ${colorClass}`}>
        {action}
      </span>
    );
  };

  const columns = [
    { key: 'timestamp', label: 'Timestamp', render: (row) => (
      <div className="flex flex-col">
        <span className="text-[11px] md:text-[12px] font-bold text-[var(--text-main)] leading-tight">{format(new Date(row.created_at), 'MMM dd, yyyy')}</span>
        <span className="text-[9px] md:text-[10px] text-[var(--text-muted)] mt-0.5">{format(new Date(row.created_at), 'HH:mm:ss')}</span>
      </div>
    )},
    { key: 'user', label: 'User', render: (row) => (
      row.user_name ? (
        <div className="flex flex-col">
          <span className="text-[11px] md:text-[12px] font-bold text-[var(--text-main)] leading-tight">{row.user_name}</span>
          <span className="text-[9px] md:text-[10px] text-[var(--text-muted)] mt-0.5">{row.user_email}</span>
        </div>
      ) : <span className="text-[11px] md:text-[12px] font-bold text-[var(--text-muted)] italic">System</span>
    )},
    { key: 'action', label: 'Action', render: (row) => renderActionBadge(row.action) },
    { key: 'description', label: 'Description', render: (row) => (
      <span className="text-[10px] md:text-[11px] text-[var(--text-secondary)] block max-w-[120px] md:max-w-[180px] truncate" title={row.description}>
        {row.description || '-'}
      </span>
    )},
    // { key: 'entity_type', label: 'Entity Type', render: (row) => <span className="text-[11px] md:text-[12px] font-bold">{row.entity_type}</span> },
    { key: 'entity_id', label: 'Entity ID', render: (row) => {
      if (row.entity_type === 'USER') {
        if (row.entity_user_name) return (
          <div className="flex flex-col">
            <span className="text-[11px] md:text-[12px] font-bold text-[var(--text-main)] leading-tight">{row.entity_user_name}</span>
            <span className="text-[9px] md:text-[10px] text-[var(--text-muted)] mt-0.5">{row.entity_user_email}</span>
          </div>
        );
        if (row.action.includes('DELETE')) return <span className="text-[var(--text-muted)] italic text-[11px]">Deleted User</span>;
        return <span className="text-[var(--text-muted)] italic text-[11px]">Unknown User</span>;
      }
      return <span className="font-mono text-[10px] md:text-[11px] text-[var(--text-muted)] truncate block max-w-[120px]" title={row.entity_id}>{row.entity_id}</span>;
    }},
    { key: 'ip_address', label: 'IP Address', render: (row) => <span className="text-[10px] md:text-[11px] font-mono text-[var(--text-muted)]">{row.ip_address}</span> }
  ];

  return (
    <div className={`flex flex-col h-full animate-fade-in ${isEmbedded ? '' : 'pb-10'}`}>
      {/* Header */}
      {!isEmbedded && (
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-[var(--accent)]/10 text-[var(--accent)] rounded-lg">
              <Shield size={24} />
            </div>
            <h1 className="text-2xl font-black text-[var(--text-main)] uppercase tracking-tight">Audit Logs</h1>
          </div>
          <p className="text-[var(--text-secondary)] text-sm font-bold">Track system events and user activity</p>
        </div>
      </div>
      )}

      {/* Filters */}
      <div className={`flex flex-wrap items-center gap-4 mb-6 ${isEmbedded ? 'pt-2 px-2' : ''}`}>
        <div className="relative">
          <select
            name="action"
            value={filters.action}
            onChange={handleFilterChange}
            className="min-w-[180px] bg-white border border-gray-200 text-gray-800 rounded-full px-5 py-2.5 text-[13px] font-black outline-none focus:border-gray-400 transition-all appearance-none shadow-sm cursor-pointer"
          >
            <option value="">All Actions</option>
            <option value="LOGIN">LOGIN</option>
            <option value="LOGOUT">LOGOUT</option>
            <option value="PASSWORD_RESET">PASSWORD_RESET</option>
            <option value="ENABLE_2FA">ENABLE_2FA</option>
            <option value="DISABLE_2FA">DISABLE_2FA</option>
            <option value="CREATE_USER">CREATE_USER</option>
            <option value="UPDATE_USER">UPDATE_USER</option>
            <option value="DELETE_USER">DELETE_USER</option>
            <option value="UPDATE_ROLE_PERMS">UPDATE_ROLE_PERMS</option>
          </select>
        </div>
        
        <div className="relative">
          <select
            name="entityType"
            value={filters.entityType}
            onChange={handleFilterChange}
            className="min-w-[180px] bg-white border border-gray-200 text-gray-800 rounded-full px-5 py-2.5 text-[13px] font-black outline-none focus:border-gray-400 transition-all appearance-none shadow-sm cursor-pointer"
          >
            <option value="">All Entity Types</option>
            <option value="USER">USER</option>
            <option value="ROLE">ROLE</option>
          </select>
        </div>

        <div className="relative">
          <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none text-gray-400">
            <Calendar size={16} />
          </div>
          <input
            type="date"
            name="startDate"
            value={filters.startDate}
            onChange={handleFilterChange}
            className="min-w-[160px] bg-white border border-gray-200 text-gray-800 rounded-full pl-5 pr-10 py-2.5 text-[13px] font-black outline-none focus:border-gray-400 transition-all shadow-sm cursor-pointer"
          />
        </div>

        <div className="relative">
          <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none text-gray-400">
            <Calendar size={16} />
          </div>
          <input
            type="date"
            name="endDate"
            value={filters.endDate}
            onChange={handleFilterChange}
            className="min-w-[160px] bg-white border border-gray-200 text-gray-800 rounded-full pl-5 pr-10 py-2.5 text-[13px] font-black outline-none focus:border-gray-400 transition-all shadow-sm cursor-pointer"
          />
        </div>
      </div>

      {/* Data Table */}
      <div className={`bg-[var(--bg-card)] border-[var(--border-color)] overflow-hidden flex-1 flex flex-col ${isEmbedded ? 'border-t' : 'border rounded-2xl shadow-sm'}`}>
        <div className="flex-1 overflow-auto">
          <DataTable 
            columns={columns} 
            data={logs} 
            loading={isLoading}
            onView={(row) => setSelectedLog(row)}
            rowKey="log_id"
            emptyMessage="No audit logs found for the selected filters."
            striped={true}
          />
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-[var(--border-color)] flex items-center justify-between bg-[var(--bg-card)] shrink-0">
            <span className="text-sm font-bold text-[var(--text-secondary)]">
              Page {page} of {totalPages}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="w-8 h-8 flex items-center justify-center border border-gray-200 rounded-full hover:bg-gray-50 disabled:opacity-50 text-gray-600 transition-colors shadow-sm"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="w-8 h-8 flex items-center justify-center border border-gray-200 rounded-full hover:bg-gray-50 disabled:opacity-50 text-gray-600 transition-colors shadow-sm"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* JSON Payload Modal */}
      <Modal
        isOpen={!!selectedLog}
        onClose={() => setSelectedLog(null)}
        title="Audit Log Details"
      >
        {selectedLog && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-[var(--bg-workspace)] border border-[var(--border-color)] rounded-xl">
                <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1">Action</p>
                <p className="text-[13px] font-bold text-[var(--text-main)]">{selectedLog.action}</p>
              </div>
              <div className="p-3 bg-[var(--bg-workspace)] border border-[var(--border-color)] rounded-xl">
                <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1">Entity</p>
                <p className="text-[13px] font-bold text-[var(--text-main)]">{selectedLog.entity_type} - {selectedLog.entity_id}</p>
              </div>
            </div>

            {selectedLog.description && (
              <div className="p-3 bg-[var(--bg-workspace)] border border-[var(--border-color)] rounded-xl mt-4">
                <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1">Description</p>
                <p className="text-[13px] font-bold text-[var(--text-main)]">{selectedLog.description}</p>
              </div>
            )}

            <div className="mt-4">
              <h3 className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-2">Old Value</h3>
              <pre className="bg-[var(--bg-workspace)] text-[var(--text-main)] p-4 rounded-xl overflow-x-auto text-xs font-mono border border-[var(--border-color)] shadow-inner">
                {selectedLog.old_value ? JSON.stringify(selectedLog.old_value, null, 2) : 'null'}
              </pre>
            </div>

            <div className="mt-4">
              <h3 className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-2">New Value</h3>
              <pre className="bg-[var(--bg-workspace)] text-[var(--accent)] p-4 rounded-xl overflow-x-auto text-xs font-mono border border-[var(--border-color)] shadow-inner">
                {selectedLog.new_value ? JSON.stringify(selectedLog.new_value, null, 2) : 'null'}
              </pre>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default AuditLogsPage;
