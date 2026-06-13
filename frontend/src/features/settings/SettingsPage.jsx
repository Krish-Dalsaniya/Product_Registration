import React, { useState, useEffect } from 'react';
import { Settings, Shield, Sliders } from 'lucide-react';
import AuditLogsPage from '../admin/AuditLogsPage';
import { useAuth } from '../../context/AuthContext';

const SettingsPage = () => {
  const { user } = useAuth();
  const isAdmin = user?.role_name === 'Admin';
  
  const [activeTab, setActiveTab] = useState('general');

  useEffect(() => {
    // We could read an ?tab= query param here, but for now default to general
  }, []);

  return (
    <div className="w-full max-w-7xl mx-auto flex gap-6 h-[calc(100vh-120px)] animate-in fade-in slide-in-from-bottom-4 duration-500 pt-8">
      {/* Sidebar Navigation for Settings */}
      <div className="w-64 bg-[var(--bg-card)] rounded-2xl border border-[var(--border-color)] shadow-lg p-4 flex flex-col gap-2 h-fit">
        <h2 className="px-2 pb-4 text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] border-b border-[var(--border-color)] mb-2">
          Account Settings
        </h2>
        
        <button 
          onClick={() => setActiveTab('general')}
          className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${activeTab === 'general' ? 'bg-[var(--accent)] text-white shadow-md shadow-[var(--accent)]/20' : 'text-[var(--text-main)] hover:bg-[var(--bg-workspace)] hover:translate-x-1'}`}
        >
          <Settings size={16} />
          General
        </button>

        <button 
          onClick={() => setActiveTab('security')}
          className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${activeTab === 'security' ? 'bg-[var(--accent)] text-white shadow-md shadow-[var(--accent)]/20' : 'text-[var(--text-main)] hover:bg-[var(--bg-workspace)] hover:translate-x-1'}`}
        >
          <Shield size={16} />
          Security
        </button>

        {isAdmin && (
          <button 
            onClick={() => setActiveTab('advanced')}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${activeTab === 'advanced' ? 'bg-[var(--accent)] text-white shadow-md shadow-[var(--accent)]/20' : 'text-[var(--text-main)] hover:bg-[var(--bg-workspace)] hover:translate-x-1'}`}
          >
            <Sliders size={16} />
            Advanced Settings
          </button>
        )}
      </div>

      {/* Main Content Area */}
      <div className="flex-1 bg-[var(--bg-card)] rounded-2xl border border-[var(--border-color)] shadow-lg overflow-hidden flex flex-col relative">
        {activeTab === 'general' && (
          <div className="p-8">
            <h1 className="text-2xl font-black text-[var(--text-main)] mb-6">General Settings</h1>
            <p className="text-[var(--text-muted)] font-medium text-sm">General profile and application settings will appear here.</p>
          </div>
        )}
        
        {activeTab === 'security' && (
          <div className="p-8">
            <h1 className="text-2xl font-black text-[var(--text-main)] mb-6">Security</h1>
            <p className="text-[var(--text-muted)] font-medium text-sm">Manage your passwords, 2FA, and sessions here.</p>
          </div>
        )}

        {activeTab === 'advanced' && isAdmin && (
          <div className="flex-1 h-full overflow-hidden flex flex-col">
             {/* Render the Audit Logs Page embedded seamlessly */}
             <AuditLogsPage isEmbedded={true} />
          </div>
        )}
      </div>
    </div>
  );
};

export default SettingsPage;
