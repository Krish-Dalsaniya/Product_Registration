import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../../../api/api';
import {
  LifeBuoy,
  AlertCircle,
  CheckCircle,
  Plus,
  List,
  ChevronRight,
  LayoutDashboard
} from 'lucide-react';
import { format } from 'date-fns';

const StatCard = ({ title, value, icon: Icon, path, accentBg, accentText, navigate }) => (
  <div
    onClick={() => path && navigate(path)}
    className={`workspace-card px-4 py-3 border border-[var(--border-color)] group ${path ? 'cursor-pointer hover:shadow-md' : ''} transition-all duration-300 outline-none`}
  >
    <div className="flex items-start justify-between">
      <div>
        <p className="text-[13px] font-bold tracking-wider text-[var(--text-muted)] mb-0.5">{title}</p>
        <h3 className="text-2xl font-bold text-[var(--text-main)] tracking-tight">
          {value !== null ? value : '...'}
        </h3>
      </div>
      <div
        className="w-9 h-9 rounded-xl flex items-center justify-center transition-transform duration-300 shadow-sm"
        style={{ background: accentBg, color: accentText }}
      >
        <Icon size={18} strokeWidth={2.5} />
      </div>
    </div>
    {path && (
      <div className="mt-2 flex items-center gap-1 group/link">
        <span className="text-[11px] font-bold tracking-wide text-[var(--accent)]">View details</span>
        <ChevronRight size={14} className="text-[var(--accent)] transition-transform duration-300 group-hover/link:translate-x-1" />
      </div>
    )}
  </div>
);

const QuickAction = ({ title, icon: Icon, path, navigate }) => (
  <button
    onClick={() => navigate(path)}
    className="flex items-center gap-3 p-3.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-workspace)] hover:border-[var(--accent)] hover:bg-[var(--nav-hover)] transition-all duration-300 group w-full"
  >
    <div className="w-8 h-8 rounded-lg bg-[var(--bg-card)] border border-[var(--border-color)] flex items-center justify-center text-[var(--text-dim)] group-hover:border-[var(--accent)] group-hover:text-[var(--accent)] transition-all shadow-sm">
      <Icon size={16} strokeWidth={2.5} />
    </div>
    <span className="text-[13px] font-bold tracking-wide text-[var(--text-main)] group-hover:text-[var(--accent)] transition-colors">{title}</span>
  </button>
);

const MaintenanceDashboard = () => {
  const { user, hasPermission } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await api.get('/dashboard/maintenance');
        setStats(response.data.data);
      } catch (error) {
        console.error('Error fetching maintenance dashboard stats:', error);
      }
    };
    fetchStats();
  }, []);

  return (
    <div className="flex flex-col h-[calc(100vh-92px)] overflow-y-auto overflow-x-hidden custom-scrollbar space-y-4 px-4 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-[1600px] mx-auto pb-4">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 flex-shrink-0 animate-entrance-down">
        <div className="flex items-center gap-5">
          <div className="p-3 md:p-4 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl shadow-sm group">
            <LayoutDashboard size={24} className="md:w-[28px] md:h-[28px] transition-transform duration-300 text-[var(--accent)]" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-[var(--text-main)] tracking-tight leading-none">
              Welcome back, {user?.full_name || 'Maintenance Team'}
            </h1>
          </div>
        </div>
      </div>

      {/* Core Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 flex-shrink-0 animate-entrance-up">
        <StatCard
          title="Open Tickets"
          value={stats?.openTickets ?? null}
          icon={LifeBuoy}
          path={hasPermission('support_tickets', 'view') ? "/admin/support-tickets" : null}
          accentBg="var(--badge-maint-bg)"
          accentText="var(--badge-maint-text)"
          navigate={navigate}
        />
        <StatCard
          title="Assigned To Me"
          value={stats?.assignedToMeTickets ?? null}
          icon={List}
          path={hasPermission('support_tickets', 'view') ? "/admin/support-tickets?filter=assigned" : null}
          accentBg="rgba(16, 185, 129, 0.1)"
          accentText="#10b981"
          navigate={navigate}
        />
        <StatCard
          title="Critical Tickets"
          value={stats?.criticalTickets ?? null}
          icon={AlertCircle}
          path={hasPermission('support_tickets', 'view') ? "/admin/support-tickets?filter=critical" : null}
          accentBg="rgba(239, 68, 68, 0.1)"
          accentText="#ef4444"
          navigate={navigate}
        />
        <StatCard
          title="Resolved This Week"
          value={stats?.resolvedThisWeekTickets ?? null}
          icon={CheckCircle}
          path={hasPermission('support_tickets', 'view') ? "/admin/support-tickets" : null}
          accentBg="rgba(59, 130, 246, 0.1)"
          accentText="#3b82f6"
          navigate={navigate}
        />
      </div>

      {/* Analytics Row */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch animate-entrance-up pb-2" style={{ animationDelay: '0.1s' }}>

        {/* Recent Unresolved Tickets Table */}
        <div className="workspace-card p-6 h-full flex flex-col lg:col-span-2">
          <h3 className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-[0.1em] mb-5 flex items-center gap-2">
            <LifeBuoy size={14} className="text-[var(--accent)]" /> Unresolved Tickets (Priority Sorted)
          </h3>
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            {stats?.recentUnresolvedTickets && stats.recentUnresolvedTickets.length > 0 ? (
              <div className="space-y-3">
                {stats.recentUnresolvedTickets.map(t => (
                  <div key={t.id} className="p-3 border border-[var(--border-color)] rounded-xl bg-[var(--bg-workspace)] flex justify-between items-center cursor-pointer hover:border-[var(--accent)]" onClick={() => navigate(\`/admin/support-tickets/\${t.id}\`)}>
                <div>
                  <div className="font-bold text-[13px] text-[var(--text-main)]">{t.ticket_id}</div>
                  <div className="text-[12px] text-[var(--text-muted)]">{t.issue_type}</div>
                  <div className="text-[10px] text-[var(--text-dim)] mt-1">{format(new Date(t.created_at), 'MMM d, yyyy')}</div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span className={\`px-2 py-0.5 rounded-full text-[10px] font-bold \${
                    t.priority === 'High' ? 'bg-red-500/10 text-red-500' :
                      t.priority === 'Medium' ? 'bg-amber-500/10 text-amber-500' : 'bg-green-500/10 text-green-500'
                  }\`}>
                  {t.priority}
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[var(--border-color)] text-[var(--text-main)]">
                  {t.status}
                </span>
              </div>
                  </div>
                ))}
        </div>
        ) : (
        <div className="text-[13px] text-[var(--text-muted)] italic text-center mt-10">No unresolved tickets found.</div>
            )}
      </div>
    </div>

        {/* Quick Actions */ }
  <div className="workspace-card p-6 h-full flex flex-col lg:col-span-1">
    <h3 className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-[0.1em] mb-5 flex items-center gap-2">
      <Plus size={14} className="text-[var(--accent)]" /> Quick actions
    </h3>
    <div className="space-y-3 flex-1 overflow-y-auto pr-1 custom-scrollbar">
      {hasPermission('support_tickets', 'create') && (
        <QuickAction title="Create Ticket" icon={LifeBuoy} path="/admin/support-tickets" navigate={navigate} />
      )}
      {hasPermission('support_tickets', 'view') && (
        <QuickAction title="View Assigned Tickets" icon={List} path="/admin/support-tickets?filter=assigned" navigate={navigate} />
      )}
    </div>
  </div>
      </div >
    </div >
  );
};

export default MaintenanceDashboard;
