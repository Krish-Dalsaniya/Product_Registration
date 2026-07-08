import React, { useState, useEffect } from 'react';
import { Settings, Shield, Sliders, Laptop, Smartphone, Loader } from 'lucide-react';
import AuditLogsPage from '../admin/AuditLogsPage';
import { useAuth } from '../../context/AuthContext';
import { updateProfileApi, changePasswordApi } from '../../api/auth';
import toast from 'react-hot-toast';

const SettingsPage = () => {
  const { user } = useAuth();
  const isAdmin = user?.role_name === 'Admin';
  
  const [activeTab, setActiveTab] = useState('general');

  // Profile Form State
  const [profileData, setProfileData] = useState({
    fullName: user?.full_name || user?.first_name || '',
    email: user?.email || ''
  });
  const [isProfileLoading, setIsProfileLoading] = useState(false);

  // Password Form State
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [isPasswordLoading, setIsPasswordLoading] = useState(false);

  useEffect(() => {
    if (user) {
      setProfileData({
        fullName: user.full_name || user.first_name || '',
        email: user.email || ''
      });
    }
  }, [user]);

  const handleProfileUpdate = async () => {
    if (!profileData.fullName || !profileData.email) return toast.error("Name and email are required");
    setIsProfileLoading(true);
    try {
      await updateProfileApi(profileData.fullName, profileData.email);
      toast.success("Profile updated successfully!");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update profile");
    } finally {
      setIsProfileLoading(false);
    }
  };

  const handlePasswordChange = async () => {
    if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
      return toast.error("All password fields are required");
    }
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      return toast.error("New passwords do not match");
    }
    setIsPasswordLoading(true);
    try {
      await changePasswordApi(passwordData.currentPassword, passwordData.newPassword);
      toast.success("Password updated successfully!");
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update password");
    } finally {
      setIsPasswordLoading(false);
    }
  };

  useEffect(() => {
    // We could read an ?tab= query param here, but for now default to general
  }, []);

  return (
    <div className="w-full max-w-7xl mx-auto flex gap-6 h-[calc(100vh-120px)] animate-in fade-in slide-in-from-bottom-4 duration-500 pt-8">
      {/* Sidebar Navigation for Settings */}
      <div className="w-64 bg-[var(--bg-card)] rounded-2xl border border-[var(--border-color)] shadow-lg p-4 flex flex-col gap-2 h-fit">
        <h2 className="px-4 pt-2 pb-1 text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-3">
          Account Settings
        </h2>
        
        <button 
          onClick={() => setActiveTab('general')}
          className={`flex items-center gap-3 px-4 py-3 rounded-full text-xs font-bold transition-all ${activeTab === 'general' ? 'bg-[#333] text-white shadow-md' : 'text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-workspace)] hover:translate-x-1'}`}
        >
          <Settings size={16} />
          General
        </button>

        <button 
          onClick={() => setActiveTab('security')}
          className={`flex items-center gap-3 px-4 py-3 rounded-full text-xs font-bold transition-all ${activeTab === 'security' ? 'bg-[#333] text-white shadow-md' : 'text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-workspace)] hover:translate-x-1'}`}
        >
          <Shield size={16} />
          Security
        </button>

        {isAdmin && (
          <button 
            onClick={() => setActiveTab('advanced')}
            className={`flex items-center gap-3 px-4 py-3 rounded-full text-xs font-bold transition-all ${activeTab === 'advanced' ? 'bg-[#333] text-white shadow-md' : 'text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-workspace)] hover:translate-x-1'}`}
          >
            <Sliders size={16} />
            Advanced Settings
          </button>
        )}
      </div>

      {/* Main Content Area */}
      <div className="flex-1 bg-[var(--bg-card)] rounded-2xl border border-[var(--border-color)] shadow-lg overflow-hidden flex flex-col relative">
        {activeTab === 'general' && (
          <div className="p-6 md:p-8 overflow-y-auto custom-scrollbar h-full">
            <h1 className="text-2xl font-black text-[var(--text-main)] mb-6">General Settings</h1>
            
            <div className="space-y-6 max-w-3xl pb-10">
              {/* Profile Section */}
              <div className="bg-[var(--bg-workspace)]/50 rounded-2xl p-5 md:p-6 border border-[var(--border-color)] shadow-sm">
                <h3 className="text-xs font-black uppercase tracking-widest text-[var(--text-main)] mb-5">Profile Information</h3>
                
                <div className="flex flex-col md:flex-row gap-6 md:gap-8">
                  {/* Avatar */}
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-gradient-to-br from-[#333] to-gray-600 text-white flex items-center justify-center text-3xl font-black border-4 border-white shadow-md relative overflow-hidden">
                      {user?.first_name?.charAt(0) || user?.email?.charAt(0)?.toUpperCase() || 'U'}
                    </div>
                    <button className="px-4 py-1.5 bg-white border border-[var(--border-color)] rounded-full text-[9px] font-black uppercase tracking-widest hover:bg-[var(--bg-workspace)] transition-colors shadow-sm text-gray-700">
                      Change Avatar
                    </button>
                  </div>
                  
                  {/* Form */}
                  <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-5">
                    <div className="space-y-1.5 sm:col-span-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Full Name</label>
                      <input 
                        type="text" 
                        value={profileData.fullName} 
                        onChange={(e) => setProfileData({...profileData, fullName: e.target.value})}
                        className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-full text-xs font-bold text-gray-800 focus:border-gray-400 outline-none shadow-sm transition-all" 
                      />
                    </div>
                    <div className="space-y-1.5 sm:col-span-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Email Address</label>
                      <input 
                        type="email" 
                        value={profileData.email}
                        onChange={(e) => setProfileData({...profileData, email: e.target.value})}
                        className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-full text-xs font-bold text-gray-800 focus:border-gray-400 outline-none shadow-sm transition-all" 
                      />
                    </div>
                  </div>
                </div>
                
                <div className="mt-6 flex justify-end pt-5 border-t border-gray-200 dark:border-gray-800">
                  <button 
                    onClick={handleProfileUpdate}
                    disabled={isProfileLoading}
                    className="px-6 py-2.5 bg-[#333] text-white flex items-center justify-center gap-2 rounded-full text-[11px] font-black uppercase tracking-widest shadow-md hover:scale-105 transition-transform disabled:opacity-70 disabled:hover:scale-100"
                  >
                    {isProfileLoading ? <Loader size={14} className="animate-spin" /> : null}
                    Save Changes
                  </button>
                </div>
              </div>

              {/* Preferences Section */}
              <div className="bg-[var(--bg-workspace)]/50 rounded-2xl p-5 md:p-6 border border-[var(--border-color)] shadow-sm">
                <h3 className="text-xs font-black uppercase tracking-widest text-[var(--text-main)] mb-5">Preferences</h3>
                
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-4 bg-white rounded-xl border border-gray-200 shadow-sm">
                    <div>
                      <h4 className="text-[12px] font-black text-gray-800">Email Notifications</h4>
                      <p className="text-[11px] font-bold text-gray-500 mt-0.5">Receive updates and alerts via email.</p>
                    </div>
                    <div className="w-11 h-6 bg-green-500 rounded-full relative cursor-pointer shadow-inner">
                      <div className="w-4 h-4 bg-white rounded-full absolute right-1 top-1 shadow-sm"></div>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between p-4 bg-white rounded-xl border border-gray-200 shadow-sm">
                    <div>
                      <h4 className="text-[12px] font-black text-gray-800">Dark Mode</h4>
                      <p className="text-[11px] font-bold text-gray-500 mt-0.5">Switch between light and dark themes.</p>
                    </div>
                    <div className="w-11 h-6 bg-gray-200 rounded-full relative cursor-pointer shadow-inner border border-gray-300">
                      <div className="w-4 h-4 bg-white rounded-full absolute left-1 top-1 shadow-sm"></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {activeTab === 'security' && (
          <div className="p-6 md:p-8 overflow-y-auto custom-scrollbar h-full">
            <h1 className="text-2xl font-black text-[var(--text-main)] mb-6">Security</h1>
            
            <div className="space-y-6 max-w-3xl pb-10">
              {/* Change Password */}
              <div className="bg-[var(--bg-workspace)]/50 rounded-2xl p-5 md:p-6 border border-[var(--border-color)] shadow-sm">
                <h3 className="text-xs font-black uppercase tracking-widest text-[var(--text-main)] mb-5">Change Password</h3>
                
                <div className="space-y-4 max-w-md">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Current Password</label>
                    <input 
                      type="password" 
                      value={passwordData.currentPassword}
                      onChange={(e) => setPasswordData({...passwordData, currentPassword: e.target.value})}
                      placeholder="••••••••" 
                      className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-full text-xs font-bold text-gray-800 focus:border-gray-400 outline-none shadow-sm transition-all" 
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">New Password</label>
                    <input 
                      type="password" 
                      value={passwordData.newPassword}
                      onChange={(e) => setPasswordData({...passwordData, newPassword: e.target.value})}
                      placeholder="••••••••" 
                      className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-full text-xs font-bold text-gray-800 focus:border-gray-400 outline-none shadow-sm transition-all" 
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Confirm Password</label>
                    <input 
                      type="password" 
                      value={passwordData.confirmPassword}
                      onChange={(e) => setPasswordData({...passwordData, confirmPassword: e.target.value})}
                      placeholder="••••••••" 
                      className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-full text-xs font-bold text-gray-800 focus:border-gray-400 outline-none shadow-sm transition-all" 
                    />
                  </div>
                </div>
                
                <div className="mt-6 pt-5 border-t border-gray-200 dark:border-gray-800">
                  <button 
                    onClick={handlePasswordChange}
                    disabled={isPasswordLoading}
                    className="px-6 py-2.5 bg-[#333] text-white flex items-center justify-center gap-2 rounded-full text-[11px] font-black uppercase tracking-widest shadow-md hover:scale-105 transition-transform disabled:opacity-70 disabled:hover:scale-100"
                  >
                    {isPasswordLoading ? <Loader size={14} className="animate-spin" /> : null}
                    Update Password
                  </button>
                </div>
              </div>

              {/* 2FA */}
              <div className="bg-[var(--bg-workspace)]/50 rounded-2xl p-5 md:p-6 border border-[var(--border-color)] shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-xs font-black uppercase tracking-widest text-[var(--text-main)] mb-1">Two-Factor Authentication</h3>
                    <p className="text-[11px] font-bold text-gray-500 mt-0.5">Add an extra layer of security to your account.</p>
                  </div>
                  <button className="px-6 py-2.5 bg-white border border-gray-200 text-gray-800 rounded-full text-[10px] font-black uppercase tracking-widest shadow-sm hover:bg-gray-50 transition-colors whitespace-nowrap">
                    Enable 2FA
                  </button>
                </div>
              </div>

              {/* Active Sessions */}
              <div className="bg-[var(--bg-workspace)]/50 rounded-2xl p-5 md:p-6 border border-[var(--border-color)] shadow-sm">
                <h3 className="text-xs font-black uppercase tracking-widest text-[var(--text-main)] mb-5">Active Sessions</h3>
                
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-4 bg-white rounded-xl border border-gray-200 shadow-sm">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-green-500/10 text-green-600 flex items-center justify-center shrink-0">
                        <Laptop size={18} />
                      </div>
                      <div>
                        <h4 className="text-[12px] font-black text-gray-800 flex items-center gap-2">
                          Windows • Chrome
                          <span className="px-2 py-0.5 bg-green-500/10 text-green-700 text-[8px] font-black uppercase tracking-widest rounded-full">Current</span>
                        </h4>
                        <p className="text-[10px] font-bold text-gray-500 mt-0.5">New York, USA • IP: 192.168.1.1</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between p-4 bg-white rounded-xl border border-gray-200 shadow-sm">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-gray-100 text-gray-500 flex items-center justify-center shrink-0">
                        <Smartphone size={18} />
                      </div>
                      <div>
                        <h4 className="text-[12px] font-black text-gray-800">iOS • Safari</h4>
                        <p className="text-[10px] font-bold text-gray-500 mt-0.5">New York, USA • Last active: 2 hours ago</p>
                      </div>
                    </div>
                    <button className="text-[9px] font-black text-red-500 hover:text-red-600 uppercase tracking-widest px-3 py-1.5 rounded-full hover:bg-red-50 transition-colors border border-transparent hover:border-red-200">
                      Revoke
                    </button>
                  </div>
                </div>
              </div>
            </div>
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
