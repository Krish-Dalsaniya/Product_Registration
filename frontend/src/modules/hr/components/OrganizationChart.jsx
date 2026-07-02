import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import {
  Loader2, ChevronDown, ChevronUp, ZoomIn, ZoomOut, Maximize2, Move,
  Plus, X, Pencil, Check, RotateCcw, Briefcase, HelpCircle, FileText, Upload, Save, User, ArrowRight
} from 'lucide-react';
import { fetchOrgProfilesApi, createOrgProfileApi, updateOrgProfileApi, deleteOrgProfileApi, fetchHREmployeesApi, updateHREmployeeApi } from '../../../api/hr';
import { useOutletContext } from 'react-router-dom';
import toast from 'react-hot-toast';

// ---- tree building ----------------------------------------------------
const buildTree = (profiles) => {
  const byId = {};
  profiles.forEach(p => {
    byId[p.designation_id] = { ...p, children: [] };
  });

  const roots = [];

  profiles.forEach(p => {
    const node = byId[p.designation_id];
    if (p.parent_id && byId[p.parent_id]) {
      byId[p.parent_id].children.push(node);
    } else {
      roots.push(node);
    }
  });

  return roots;
};

// ---- profile modal (same as before for Adding) -------------------------------------------
const ProfileModal = ({ allProfiles, onClose, onSuccess, initialParentId }) => {
  const [formData, setFormData] = useState({
    name: '',
    parent_id: initialParentId || '',
    child_id: '',
    job_description: '',
    perks: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      await createOrgProfileApi(formData);
      toast.success('Profile created successfully');
      onSuccess();
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Failed to create profile');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl shadow-xl w-full max-w-md max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-[var(--border-color)]">
          <h3 className="text-sm font-black text-[var(--text-main)]">Add New Profile</h3>
          <button onClick={onClose} className="p-1 rounded-md hover:bg-[var(--bg-workspace)]">
            <X size={16} className="text-[var(--text-muted)]" />
          </button>
        </div>

        <div className="overflow-y-auto custom-scrollbar p-4">
          <form id="profile-form" onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[11px] font-bold text-[var(--text-muted)] mb-1 uppercase tracking-wider">Profile Name *</label>
              <input
                required
                autoFocus
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                placeholder="e.g. CEO, Managing Director"
                className="w-full px-3 py-2 text-sm rounded-lg bg-[var(--bg-workspace)] border border-[var(--border-color)] text-[var(--text-main)] outline-none focus:border-[var(--accent)]"
              />
            </div>
            
            <div>
              <label className="block text-[11px] font-bold text-[var(--text-muted)] mb-1 uppercase tracking-wider">Below Which Profile?</label>
              <select
                value={formData.parent_id}
                onChange={(e) => setFormData({...formData, parent_id: e.target.value})}
                className="w-full px-3 py-2 text-sm rounded-lg bg-[var(--bg-workspace)] border border-[var(--border-color)] text-[var(--text-main)] outline-none focus:border-[var(--accent)]"
              >
                <option value="">None (Top Level)</option>
                {allProfiles.map(p => (
                  <option key={p.designation_id} value={p.designation_id}>{p.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-[var(--text-muted)] mb-1 uppercase tracking-wider">Above Which Profile?</label>
              <select
                value={formData.child_id}
                onChange={(e) => setFormData({...formData, child_id: e.target.value})}
                className="w-full px-3 py-2 text-sm rounded-lg bg-[var(--bg-workspace)] border border-[var(--border-color)] text-[var(--text-main)] outline-none focus:border-[var(--accent)]"
              >
                <option value="">None</option>
                {allProfiles.filter(p => {
                  if (formData.parent_id) {
                    return p.parent_id === formData.parent_id;
                  }
                  return !p.parent_id;
                }).map(p => (
                  <option key={p.designation_id} value={p.designation_id}>{p.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-[var(--text-muted)] mb-1 uppercase tracking-wider">What is my job?</label>
              <textarea
                rows={3}
                value={formData.job_description}
                onChange={(e) => setFormData({...formData, job_description: e.target.value})}
                placeholder="Job description..."
                className="w-full px-3 py-2 text-sm rounded-lg bg-[var(--bg-workspace)] border border-[var(--border-color)] text-[var(--text-main)] outline-none focus:border-[var(--accent)] resize-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-[var(--text-muted)] mb-1 uppercase tracking-wider">What are my perks?</label>
              <textarea
                rows={2}
                value={formData.perks}
                onChange={(e) => setFormData({...formData, perks: e.target.value})}
                placeholder="Perks, benefits..."
                className="w-full px-3 py-2 text-sm rounded-lg bg-[var(--bg-workspace)] border border-[var(--border-color)] text-[var(--text-main)] outline-none focus:border-[var(--accent)] resize-none"
              />
            </div>
          </form>
        </div>
        
        <div className="p-4 border-t border-[var(--border-color)] flex justify-end gap-2">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-bold text-[var(--text-muted)] hover:bg-[var(--bg-workspace)] rounded-lg">Cancel</button>
          <button type="submit" form="profile-form" disabled={isSubmitting} className="px-4 py-2 text-sm font-bold text-white bg-[var(--accent)] hover:opacity-90 rounded-lg flex items-center gap-2">
            {isSubmitting && <Loader2 size={14} className="animate-spin" />}
            Save Profile
          </button>
        </div>
      </div>
    </div>
  );
};

// ---- Side Panel component -----------------------------------------------
const SidePanel = ({ profile, allProfiles, onClose, onUpdate, onUpdateEmployee, editMode, employees = [] }) => {
  const [activeTab, setActiveTab] = useState('about');
  const [viewMode, setViewMode] = useState('profile');
  const [formData, setFormData] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState(null);
  
  const [activeEmpTab, setActiveEmpTab] = useState('overview');
  const [empFormData, setEmpFormData] = useState({});
  const [isEmpSaving, setIsEmpSaving] = useState(false);

  // Reset selected employee when profile or view mode changes
  useEffect(() => {
    setSelectedEmployeeId(null);
  }, [profile, viewMode]);

  useEffect(() => {
    if (selectedEmployeeId) {
      const emp = employees.find(e => e.employee_id === selectedEmployeeId);
      if (emp) {
        setEmpFormData({
          about: emp.job_info?.about || '',
          rcd: emp.job_info?.rcd || '',
          pre_requisites: emp.job_info?.pre_requisites || '',
          training: emp.job_info?.training || '',
          eligibility: emp.job_info?.eligibility || '',
          kpi: emp.job_info?.kpi || '',
          kra: emp.job_info?.kra || ''
        });
        setActiveEmpTab('overview');
      }
    }
  }, [selectedEmployeeId, employees]);

  useEffect(() => {
    if (profile) {
      setFormData({
        job_description: profile.job_description || '',
        perks: profile.perks || '',
        pre_requisites: profile.pre_requisites || '',
        training_requirements: profile.training_requirements || '',
        eligibility_criteria: profile.eligibility_criteria || '',
        kpi: profile.kpi || '',
        kra: profile.kra || '',
        parent_id: profile.parent_id || ''
      });
    }
  }, [profile]);

  if (!profile) return null;

  const tabs = [
    { id: 'about', label: 'About' },
    { id: 'rcd', label: 'RCD' },
    { id: 'pre_requisites', label: 'Pre-requisite' },
    { id: 'training', label: 'Training' },
    { id: 'eligibility', label: 'Eligibility' },
    { id: 'kpi', label: 'KPI' },
    { id: 'kra', label: 'KRA' }
  ];

  const parentProfile = allProfiles.find(p => p.designation_id === profile.parent_id);
  const childProfiles = allProfiles.filter(p => p.parent_id === profile.designation_id);
  const profileEmployees = employees.filter(e => e.designation_id === profile.designation_id);

  const handleSaveField = async (field) => {
    if (field === 'parent_id' && formData.parent_id) {
      let currentParent = allProfiles.find(p => p.designation_id === formData.parent_id);
      let isCycle = false;
      while (currentParent) {
        if (currentParent.designation_id === profile.designation_id) {
          isCycle = true;
          break;
        }
        currentParent = allProfiles.find(p => p.designation_id === currentParent.parent_id);
      }
      if (isCycle) {
        toast.error('Cannot save: This creates a circular reporting structure.');
        return;
      }
    }

    try {
      setIsSaving(true);
      await onUpdate(profile.designation_id, { [field]: formData[field] });
      toast.success('Updated successfully');
    } catch (err) {
      toast.error('Failed to update');
    } finally {
      setIsSaving(false);
    }
  };

  const handlePdfUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== 'application/pdf') {
      toast.error('Only PDF files are allowed');
      return;
    }
    
    // Check file size (e.g., max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size must be less than 5MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        setIsSaving(true);
        const base64 = event.target.result;
        await onUpdate(profile.designation_id, { rcd_base64: base64 });
        toast.success('RCD Document uploaded successfully');
      } catch (err) {
        toast.error('Failed to upload document');
      } finally {
        setIsSaving(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const renderTextArea = (field, label, placeholder) => (
    <div className="flex flex-col h-full space-y-3">
      <div className="flex justify-between items-center">
        <h4 className="text-sm font-bold text-[var(--text-main)]">{label}</h4>
        {editMode && (
          <button 
            onClick={() => handleSaveField(field)}
            disabled={isSaving}
            className="px-3 py-1.5 text-[11px] font-bold text-white bg-[var(--accent)] hover:opacity-90 rounded-md flex items-center gap-1.5 transition-opacity disabled:opacity-50"
          >
            {isSaving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
            Save Changes
          </button>
        )}
      </div>
      {editMode ? (
        <textarea
          value={formData[field]}
          onChange={(e) => setFormData({ ...formData, [field]: e.target.value })}
          placeholder={placeholder}
          className="flex-1 w-full p-4 text-sm rounded-xl bg-[var(--bg-workspace)] border border-[var(--border-color)] text-[var(--text-main)] outline-none focus:border-[var(--accent)] resize-none"
        />
      ) : (
        <div className="flex-1 w-full p-4 text-sm rounded-xl bg-[var(--bg-workspace)] border border-[var(--border-color)] text-[var(--text-main)] whitespace-pre-wrap overflow-y-auto custom-scrollbar">
          {formData[field] || <span className="text-[var(--text-muted)] italic">No information available.</span>}
        </div>
      )}
    </div>
  );

  const handleSaveEmpField = async (field) => {
    try {
      setIsEmpSaving(true);
      const emp = profileEmployees.find(e => e.employee_id === selectedEmployeeId);
      const updatedJobInfo = {
        ...emp.job_info,
        [field]: empFormData[field]
      };
      await onUpdateEmployee(selectedEmployeeId, { job_info: updatedJobInfo });
      toast.success('Employee updated successfully');
    } catch (err) {
      toast.error('Failed to update employee details');
    } finally {
      setIsEmpSaving(false);
    }
  };

  const renderEmpTextArea = (field, label, placeholder) => {
    const isOverride = !!empFormData[field];
    const fallbackValue = profile[field] || profile[field === 'training' ? 'training_requirements' : (field === 'eligibility' ? 'eligibility_criteria' : (field === 'about' ? 'job_description' : field))];

    return (
      <div className="flex flex-col h-full space-y-3">
        <div className="flex justify-between items-center">
          <h4 className="text-sm font-bold text-[var(--text-main)]">{label} <span className="text-[10px] text-[var(--text-muted)] font-normal ml-2">(Employee Specific Override)</span></h4>
          {editMode && (
            <button 
              onClick={() => handleSaveEmpField(field)}
              disabled={isEmpSaving}
              className="px-3 py-1.5 text-[11px] font-bold text-white bg-[var(--accent)] hover:opacity-90 rounded-md flex items-center gap-1.5 transition-opacity disabled:opacity-50"
            >
              {isEmpSaving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
              Save Override
            </button>
          )}
        </div>
        {editMode ? (
          <textarea
            value={empFormData[field]}
            onChange={(e) => setEmpFormData({ ...empFormData, [field]: e.target.value })}
            placeholder={placeholder}
            className="flex-1 w-full p-4 text-sm rounded-xl bg-[var(--bg-workspace)] border border-[var(--border-color)] text-[var(--text-main)] outline-none focus:border-[var(--accent)] resize-none"
          />
        ) : (
          <div className="flex-1 w-full p-4 text-sm rounded-xl bg-[var(--bg-workspace)] border border-[var(--border-color)] text-[var(--text-main)] whitespace-pre-wrap overflow-y-auto custom-scrollbar relative">
            {isOverride ? (
              empFormData[field]
            ) : (
              <div className="opacity-60 relative">
                <div className="absolute top-0 right-0 bg-[var(--bg-card)] px-2 py-0.5 rounded text-[10px] border border-[var(--border-color)] text-[var(--text-muted)]">Inherited from Role</div>
                {fallbackValue || <span className="text-[var(--text-muted)] italic">No information available.</span>}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="w-[40%] h-full bg-[var(--bg-card)] border-l border-[var(--border-color)] flex flex-col shadow-[-10px_0_30px_-15px_rgba(0,0,0,0.1)] transition-transform z-40">
      {/* Header */}
      <div className="p-6 border-b border-[var(--border-color)] flex justify-between items-start shrink-0">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-[var(--bg-workspace)] border border-[var(--border-color)] flex items-center justify-center text-[var(--accent)] shadow-sm">
            <Briefcase size={28} />
          </div>
          <div>
            <h2 className="text-xl font-black text-[var(--text-main)] leading-tight">{profile.name}</h2>
            <p className="text-xs font-bold text-[var(--text-muted)] mt-1">{profile.department_name || 'Organization'}</p>
          </div>
        </div>
        <button onClick={onClose} className="p-2 rounded-lg hover:bg-[var(--bg-workspace)] text-[var(--text-muted)] transition-colors">
          <X size={20} />
        </button>
      </div>

      {/* View Toggle */}
      <div className="p-4 border-b border-[var(--border-color)] shrink-0 flex justify-center bg-[var(--bg-workspace)]">
        <div className="flex w-full bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg p-1 shadow-sm">
          <button
            onClick={() => setViewMode('profile')}
            className={`flex-1 px-3 py-1.5 text-xs font-bold rounded-md transition-colors ${viewMode === 'profile' ? 'bg-[var(--accent)] text-white shadow-sm' : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'}`}
          >
            Role Details
          </button>
          <button
            onClick={() => setViewMode('employee')}
            className={`flex-1 px-3 py-1.5 text-xs font-bold rounded-md transition-colors ${viewMode === 'employee' ? 'bg-[var(--accent)] text-white shadow-sm' : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'}`}
          >
            Employees
          </button>
        </div>
      </div>

      {/* Tabs */}
      {viewMode === 'profile' && (
        <div className="px-6 flex gap-1 overflow-x-auto custom-scrollbar border-b border-[var(--border-color)] shrink-0 pt-2 pb-0">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2.5 text-[12px] font-bold rounded-t-lg transition-colors whitespace-nowrap relative ${
              activeTab === tab.id
                ? 'text-[var(--accent)] bg-[var(--bg-workspace)]'
                : 'text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-workspace)]'
            }`}
          >
            {tab.label}
            {activeTab === tab.id && (
              <div className="absolute bottom-0 left-0 w-full h-0.5 bg-[var(--accent)]" />
            )}
          </button>
        ))}
      </div>
      )}

      {/* Content */}
      <div className="flex-1 p-6 overflow-hidden">
        {viewMode === 'profile' ? (
          <div className="h-full overflow-y-auto custom-scrollbar pr-2">
            {activeTab === 'about' && (
              <div className="space-y-6">
              {/* Job Description */}
              <div className="bg-[var(--bg-workspace)] border border-[var(--border-color)] rounded-xl p-5">
                <div className="flex justify-between items-center mb-3">
                  <h4 className="text-sm font-black text-[var(--text-main)] flex items-center gap-2">
                    <Briefcase size={16} className="text-[var(--text-muted)]" /> What is my job?
                  </h4>
                  {editMode && (
                    <button onClick={() => handleSaveField('job_description')} className="text-[11px] font-bold text-[var(--accent)] hover:underline">Save</button>
                  )}
                </div>
                {editMode ? (
                  <textarea
                    value={formData.job_description}
                    onChange={(e) => setFormData({ ...formData, job_description: e.target.value })}
                    className="w-full p-3 text-sm rounded-lg bg-[var(--bg-card)] border border-[var(--border-color)] outline-none focus:border-[var(--accent)] min-h-[100px] resize-y"
                    placeholder="Describe the job role..."
                  />
                ) : (
                  <p className="text-sm text-[var(--text-secondary)] whitespace-pre-wrap">{profile.job_description || <span className="italic text-[var(--text-muted)]">No description provided.</span>}</p>
                )}
              </div>

              {/* Hierarchy Info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-[var(--bg-workspace)] border border-[var(--border-color)] rounded-xl p-5">
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="text-sm font-black text-[var(--text-main)] flex items-center gap-2">
                      <User size={16} className="text-[var(--text-muted)]" /> Who do I report to?
                    </h4>
                    {editMode && (
                      <button onClick={() => handleSaveField('parent_id')} className="text-[11px] font-bold text-[var(--accent)] hover:underline">Save</button>
                    )}
                  </div>
                  {editMode ? (
                    <select
                      value={formData.parent_id || ''}
                      onChange={(e) => setFormData({ ...formData, parent_id: e.target.value === '' ? null : e.target.value })}
                      className="w-full p-2.5 text-sm rounded-lg bg-[var(--bg-card)] border border-[var(--border-color)] outline-none focus:border-[var(--accent)]"
                    >
                      <option value="">Top of the organization</option>
                      {allProfiles.filter(p => p.designation_id !== profile.designation_id).map(p => (
                        <option key={p.designation_id} value={p.designation_id}>{p.name}</option>
                      ))}
                    </select>
                  ) : (
                    parentProfile ? (
                      <div className="flex items-center gap-3 p-3 bg-[var(--bg-card)] rounded-lg border border-[var(--border-color)]">
                        <div className="w-8 h-8 rounded-full bg-[var(--bg-workspace)] flex items-center justify-center">
                          <ArrowRight size={14} className="text-[var(--accent)] -rotate-45" />
                        </div>
                        <span className="text-sm font-bold text-[var(--text-main)]">{parentProfile.name}</span>
                      </div>
                    ) : (
                      <p className="text-sm text-[var(--text-muted)] italic">Top of the organization</p>
                    )
                  )}
                </div>

                <div className="bg-[var(--bg-workspace)] border border-[var(--border-color)] rounded-xl p-5">
                  <h4 className="text-sm font-black text-[var(--text-main)] flex items-center gap-2 mb-3">
                    <User size={16} className="text-[var(--text-muted)]" /> Who reports to me?
                  </h4>
                  {childProfiles.length > 0 ? (
                    <div className="space-y-2 max-h-[150px] overflow-y-auto custom-scrollbar pr-1">
                      {childProfiles.map(cp => (
                        <div key={cp.designation_id} className="flex items-center gap-3 p-2 bg-[var(--bg-card)] rounded-lg border border-[var(--border-color)]">
                           <div className="w-6 h-6 rounded-full bg-[var(--bg-workspace)] flex items-center justify-center">
                             <ArrowRight size={10} className="text-green-500 rotate-45" />
                           </div>
                           <span className="text-[13px] font-bold text-[var(--text-main)]">{cp.name}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-[var(--text-muted)] italic">No direct reports</p>
                  )}
                </div>
              </div>

              {/* Perks */}
              <div className="bg-[var(--bg-workspace)] border border-[var(--border-color)] rounded-xl p-5">
                <div className="flex justify-between items-center mb-3">
                  <h4 className="text-sm font-black text-[var(--text-main)] flex items-center gap-2">
                    <Check size={16} className="text-[var(--text-muted)]" /> What are my perks?
                  </h4>
                  {editMode && (
                    <button onClick={() => handleSaveField('perks')} className="text-[11px] font-bold text-[var(--accent)] hover:underline">Save</button>
                  )}
                </div>
                {editMode ? (
                  <textarea
                    value={formData.perks}
                    onChange={(e) => setFormData({ ...formData, perks: e.target.value })}
                    className="w-full p-3 text-sm rounded-lg bg-[var(--bg-card)] border border-[var(--border-color)] outline-none focus:border-[var(--accent)] min-h-[80px] resize-y"
                    placeholder="List the perks..."
                  />
                ) : (
                  <p className="text-sm text-[var(--text-secondary)] whitespace-pre-wrap">{profile.perks || <span className="italic text-[var(--text-muted)]">No perks listed.</span>}</p>
                )}
              </div>
            </div>
          )}

          {activeTab === 'rcd' && (
            <div className="h-full flex flex-col justify-center items-center text-center p-8 bg-[var(--bg-workspace)] border border-[var(--border-color)] rounded-xl border-dashed">
              <FileText size={48} className="text-[var(--accent)] opacity-80 mb-4" />
              <h3 className="text-lg font-black text-[var(--text-main)] mb-2">Role Clarity Document (RCD)</h3>
              <p className="text-sm text-[var(--text-secondary)] mb-6 max-w-sm">
                Upload a detailed PDF document that clearly outlines the responsibilities, expectations, and metrics for this role.
              </p>
              
              {profile.rcd_document_url ? (
                <div className="space-y-4 w-full max-w-xs">
                  <a 
                    href={profile.rcd_document_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-main)] font-bold text-sm rounded-xl hover:border-[var(--accent)] transition-colors shadow-sm"
                  >
                    View Current Document
                  </a>
                  {editMode && (
                    <div className="relative">
                      <input 
                        type="file" 
                        accept="application/pdf"
                        onChange={handlePdfUpload}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        disabled={isSaving}
                      />
                      <button disabled={isSaving} className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-[var(--accent)] text-white font-bold text-sm rounded-xl hover:opacity-90 transition-opacity shadow-sm">
                        {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
                        Replace Document
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                editMode ? (
                  <div className="relative w-full max-w-xs">
                    <input 
                      type="file" 
                      accept="application/pdf"
                      onChange={handlePdfUpload}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      disabled={isSaving}
                    />
                    <button disabled={isSaving} className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-[var(--accent)] text-white font-bold text-sm rounded-xl hover:opacity-90 transition-opacity shadow-sm">
                      {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
                      Upload PDF Document
                    </button>
                  </div>
                ) : (
                  <p className="text-sm text-[var(--text-muted)] italic">No document uploaded yet.</p>
                )
              )}
            </div>
          )}

          {activeTab === 'pre_requisites' && renderTextArea('pre_requisites', 'Pre-requisites', 'Enter the necessary qualifications or experience...')}
          {activeTab === 'training' && renderTextArea('training_requirements', 'Training Requirements', 'Enter training required for this role...')}
          {activeTab === 'eligibility' && renderTextArea('eligibility_criteria', 'Eligibility Criteria', 'Enter the eligibility criteria...')}
          {activeTab === 'kpi' && renderTextArea('kpi', 'Key Performance Indicators (KPI)', 'Define the KPIs...')}
          {activeTab === 'kra' && renderTextArea('kra', 'Key Result Areas (KRA)', 'Define the KRAs...')}
          </div>
        ) : (
          <div className="flex flex-col h-full">
            {selectedEmployeeId ? (() => {
              const emp = profileEmployees.find(e => e.employee_id === selectedEmployeeId);
              if (!emp) return null;
              
              const empTabsList = [
                { id: 'overview', label: 'Overview' },
                { id: 'about', label: 'About' },
                { id: 'rcd', label: 'RCD' },
                { id: 'pre_requisites', label: 'Pre-requisite' },
                { id: 'training', label: 'Training' },
                { id: 'eligibility', label: 'Eligibility' },
                { id: 'kpi', label: 'KPI' },
                { id: 'kra', label: 'KRA' }
              ];

              return (
                <div className="flex flex-col h-full">
                  <div className="flex px-6 pt-2 pb-2 gap-6 border-b border-[var(--border-color)] overflow-x-auto custom-scrollbar shrink-0">
                    {empTabsList.map(tab => (
                      <button
                        key={tab.id}
                        onClick={() => setActiveEmpTab(tab.id)}
                        className={`pb-3 text-sm font-bold transition-colors whitespace-nowrap relative ${
                          activeEmpTab === tab.id
                            ? 'text-[var(--text-main)]'
                            : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
                        }`}
                      >
                        {tab.label}
                        {activeEmpTab === tab.id && (
                          <div className="absolute bottom-0 left-0 right-0 h-1 bg-[var(--text-main)] rounded-t-full" />
                        )}
                      </button>
                    ))}
                  </div>

                  <div className="p-6 flex-1 overflow-y-auto custom-scrollbar">
                    {activeEmpTab === 'overview' ? (
                      <div className="space-y-6">
                        <button 
                          onClick={() => setSelectedEmployeeId(null)}
                          className="flex items-center gap-2 text-sm font-bold text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors"
                        >
                          <ChevronDown size={16} className="rotate-90" /> Back to Employees List
                        </button>
                        
                        <div className="bg-[var(--bg-workspace)] border border-[var(--border-color)] rounded-xl p-6 flex flex-col items-center text-center">
                          <img 
                            src={emp.image_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(emp.full_name)}&background=random`} 
                            alt={emp.full_name} 
                            className="w-24 h-24 rounded-2xl object-cover border-4 border-[var(--bg-card)] shadow-md mb-4"
                          />
                          <h3 className="text-xl font-black text-[var(--text-main)] mb-1">{emp.full_name}</h3>
                          <p className="text-sm font-bold text-[var(--accent)] mb-3">{emp.designation_name || profile.name}</p>
                          <span className="px-3 py-1 bg-green-500/10 text-green-500 font-bold text-[10px] uppercase tracking-wider rounded-full">
                            {emp.employment_status || 'Active'}
                          </span>
                        </div>

                        <div className="bg-[var(--bg-workspace)] border border-[var(--border-color)] rounded-xl p-5">
                          <h4 className="text-sm font-black text-[var(--text-main)] flex items-center gap-2 mb-4">
                            <Briefcase size={16} className="text-[var(--text-muted)]" /> Work Information
                          </h4>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1">Employee Code</p>
                              <p className="text-sm font-bold text-[var(--text-main)]">{emp.emp_code || 'N/A'}</p>
                            </div>
                            <div>
                              <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1">Date of Joining</p>
                              <p className="text-sm font-bold text-[var(--text-main)]">{emp.date_of_joining ? new Date(emp.date_of_joining).toLocaleDateString() : 'N/A'}</p>
                            </div>
                            <div>
                              <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1">Department</p>
                              <p className="text-sm font-bold text-[var(--text-main)]">{emp.department_name || 'N/A'}</p>
                            </div>
                            <div>
                              <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1">Work Location</p>
                              <p className="text-sm font-bold text-[var(--text-main)]">{emp.work_location || 'N/A'}</p>
                            </div>
                          </div>
                        </div>

                        <div className="bg-[var(--bg-workspace)] border border-[var(--border-color)] rounded-xl p-5">
                          <h4 className="text-sm font-black text-[var(--text-main)] flex items-center gap-2 mb-4">
                            <User size={16} className="text-[var(--text-muted)]" /> Contact Details
                          </h4>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1">Email Address</p>
                              <p className="text-sm font-bold text-[var(--text-main)] truncate" title={emp.email}>{emp.email || 'N/A'}</p>
                            </div>
                            <div>
                              <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1">Phone Number</p>
                              <p className="text-sm font-bold text-[var(--text-main)]">{emp.personal_info?.phone || 'N/A'}</p>
                            </div>
                          </div>
                        </div>

                        {emp.pay_info && (
                          <div className="bg-[var(--bg-workspace)] border border-[var(--border-color)] rounded-xl p-5">
                            <h4 className="text-sm font-black text-[var(--text-main)] flex items-center gap-2 mb-4">
                              <FileText size={16} className="text-[var(--text-muted)]" /> Compensation Info
                            </h4>
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1">Base Salary</p>
                                <p className="text-sm font-bold text-[var(--text-main)]">{emp.pay_info.base_salary ? `₹${emp.pay_info.base_salary}` : 'N/A'}</p>
                              </div>
                              <div>
                                <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1">Payment Type</p>
                                <p className="text-sm font-bold text-[var(--text-main)]">{emp.pay_info.payment_type || 'N/A'}</p>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="h-full">
                        {activeEmpTab === 'about' && renderEmpTextArea('about', 'About the Employee', 'Enter specific job duties for this employee...')}
                        {activeEmpTab === 'rcd' && renderEmpTextArea('rcd', 'Employee Specific RCD Notes', 'Enter specific role clarity notes...')}
                        {activeEmpTab === 'pre_requisites' && renderEmpTextArea('pre_requisites', 'Employee Pre-requisites', 'Enter specific qualifications...')}
                        {activeEmpTab === 'training' && renderEmpTextArea('training', 'Employee Training Requirements', 'Enter specific training needs...')}
                        {activeEmpTab === 'eligibility' && renderEmpTextArea('eligibility', 'Employee Eligibility Criteria', 'Enter specific criteria...')}
                        {activeEmpTab === 'kpi' && renderEmpTextArea('kpi', 'Employee Specific KPIs', 'Enter custom KPIs...')}
                        {activeEmpTab === 'kra' && renderEmpTextArea('kra', 'Employee Specific KRAs', 'Enter custom KRAs...')}
                      </div>
                    )}
                  </div>
                </div>
              );
            })() : (
              <div className="p-6 h-full overflow-y-auto custom-scrollbar">
                <div className="space-y-4">
                {profileEmployees.length > 0 ? profileEmployees.map((emp, index) => (
                  <div 
                    key={emp.employee_id} 
                    onClick={() => setSelectedEmployeeId(emp.employee_id)}
                    className="bg-[var(--bg-workspace)] border border-[var(--border-color)] rounded-xl p-4 cursor-pointer hover:border-[var(--accent)] hover:shadow-md transition-all group"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-sm font-black text-[var(--text-main)] flex items-center gap-2">
                        <User size={14} className="text-[var(--text-muted)]" /> Employee #{index + 1}
                      </h4>
                      <div className="w-6 h-6 rounded-full bg-[var(--bg-card)] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <ArrowRight size={12} className="text-[var(--accent)]" />
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-3">
                      <img 
                        src={emp.image_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(emp.full_name)}&background=random`} 
                        alt={emp.full_name} 
                        className="w-12 h-12 rounded-lg object-cover border-2 border-[var(--bg-card)] shadow-sm"
                      />
                      <div className="space-y-1 flex-1">
                        <p className="text-sm font-bold text-[var(--text-main)]">{emp.full_name}</p>
                        <p className="text-xs text-[var(--text-secondary)]">{emp.email || 'N/A'}</p>
                      </div>
                    </div>
                  </div>
                )) : (
                  <div className="bg-[var(--bg-workspace)] border border-[var(--border-color)] rounded-xl p-8 flex flex-col items-center justify-center text-center">
                    <User size={32} className="text-[var(--border-color)] mb-3" />
                    <h4 className="text-sm font-black text-[var(--text-main)] mb-1">No Employees</h4>
                    <p className="text-xs text-[var(--text-secondary)]">There are currently no employees assigned to this role.</p>
                  </div>
                )}
              </div>
            </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// ---- node ---------------------------------------------------------------
const OrgNode = ({ node, isRoot = false, editMode, onAddChild, onRemove, onClick, selectedProfileId, employees = [] }) => {
  const hasChildren = node.children && node.children.length > 0;
  const [isOpen, setIsOpen] = useState(true); 
  const isSelected = selectedProfileId === node.designation_id;
  const profileEmployees = employees.filter(e => e.designation_id === node.designation_id);

  return (
    <li className={`relative text-center list-none transition-all duration-500 org-tree-li ${isRoot ? 'pt-0' : 'pt-5 px-1'} pb-4`}>
      <div className="inline-block relative z-10 group">
        <div 
          onClick={() => onClick(node)}
          className={`bg-[var(--bg-card)] border-t-4 border-t-[var(--accent)] border ${isSelected ? 'border-[var(--accent)] ring-2 ring-[var(--accent)] ring-opacity-20' : 'border-[var(--border-color)]'} rounded-xl shadow-md p-4 min-w-[220px] max-w-[280px] text-left hover:-translate-y-1 transition-all cursor-pointer relative`}
        >

          {editMode && (
            <div className="absolute -top-2 -right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-50">
              <button
                onClick={(e) => { e.stopPropagation(); onAddChild(node.designation_id); }}
                title="Add profile below"
                className="bg-[var(--accent)] text-white rounded-full p-1 shadow-md hover:scale-110 transition-transform"
              >
                <Plus size={12} strokeWidth={3} />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onRemove(node.designation_id); }}
                title="Remove profile"
                className="bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-muted)] rounded-full p-1 shadow-md hover:text-red-500 hover:border-red-400 transition-colors"
              >
                <X size={12} strokeWidth={3} />
              </button>
            </div>
          )}

          <div className="flex flex-col gap-2 pointer-events-none">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 overflow-hidden flex-1">
                <div className="w-10 h-10 rounded-xl overflow-hidden bg-[var(--bg-workspace)] border-2 border-[var(--border-color)] flex-shrink-0 flex items-center justify-center text-[var(--accent)]">
                  <Briefcase size={20} />
                </div>
                <div className="overflow-hidden flex-1">
                  <h4 className="text-[14px] font-black text-[var(--text-main)] truncate" title={node.name}>{node.name}</h4>
                  <p className="text-[10px] font-bold text-[var(--text-muted)] truncate">{node.department_name || 'Organization'}</p>
                </div>
              </div>
              <div className="flex items-center justify-center bg-[var(--bg-workspace)] border border-[var(--border-color)] px-2 py-1 rounded-lg">
                <span className="text-[11px] font-black text-[var(--text-main)]">👥 {profileEmployees.length}</span>
              </div>
            </div>
            
            {node.job_description && (
              <div className="mt-2 text-[11px] text-[var(--text-secondary)] line-clamp-2" title={node.job_description}>
                <span className="font-bold text-[var(--text-muted)] mr-1">Job:</span> 
                {node.job_description}
              </div>
            )}
            
            {node.perks && (
              <div className="text-[11px] text-[var(--text-secondary)] line-clamp-1" title={node.perks}>
                <span className="font-bold text-[var(--text-muted)] mr-1">Perks:</span> 
                {node.perks}
              </div>
            )}
          </div>

          {hasChildren && (
            <button
              onClick={(e) => { e.stopPropagation(); setIsOpen(!isOpen); }}
              className={`absolute -bottom-3 left-1/2 -translate-x-1/2 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-full px-2.5 py-0.5 text-[10px] font-bold text-[var(--text-main)] shadow-sm z-20 flex items-center gap-1 hover:border-[var(--accent)] hover:text-[var(--accent)] transition-colors cursor-pointer whitespace-nowrap`}
            >
              <ChevronDown size={12} strokeWidth={3} className={`transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
            </button>
          )}
        </div>
      </div>

      {hasChildren && (
        <div
          className="transition-all duration-500 ease-in-out origin-top grid"
          style={{ gridTemplateRows: isOpen ? '1fr' : '0fr', opacity: isOpen ? 1 : 0, pointerEvents: isOpen ? 'auto' : 'none' }}
        >
          <div className="overflow-hidden">
            <ul className="flex justify-center pt-5 relative transition-all duration-500 org-tree-ul">
              {node.children.map(child => (
                <OrgNode
                  key={child.designation_id}
                  node={child}
                  editMode={editMode}
                  onAddChild={onAddChild}
                  onRemove={onRemove}
                  onClick={onClick}
                  selectedProfileId={selectedProfileId}
                  employees={employees}
                />
              ))}
            </ul>
          </div>
        </div>
      )}
    </li>
  );
};

const MIN_SCALE = 0.2;
const MAX_SCALE = 1.5;

const OrganizationChart = () => {
  const [profiles, setProfiles] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);

  const [selectedProfileId, setSelectedProfileId] = useState(null);

  // modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [initialParentId, setInitialParentId] = useState('');

  // zoom / pan state
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);

  const containerRef = useRef(null);
  const contentRef = useRef(null);
  const dragStart = useRef({ x: 0, y: 0, posX: 0, posY: 0 });

  const loadProfiles = async () => {
    try {
      setIsLoading(true);
      const [res, empRes] = await Promise.all([
        fetchOrgProfilesApi(),
        fetchHREmployeesApi()
      ]);
      setProfiles(res.data?.data || []);
      setEmployees(empRes.data?.data || []);
    } catch (error) {
      toast.error('Failed to load data');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadProfiles();
  }, []);

  const treeData = useMemo(() => buildTree(profiles), [profiles]);
  const selectedProfile = useMemo(() => profiles.find(p => p.designation_id === selectedProfileId), [profiles, selectedProfileId]);
  const outletContext = useOutletContext();

  useEffect(() => {
    if (outletContext?.setIsSidebarCollapsed) {
      outletContext.setIsSidebarCollapsed(!!selectedProfileId);
    }
    return () => {
      if (outletContext?.setIsSidebarCollapsed) {
        outletContext.setIsSidebarCollapsed(false);
      }
    };
  }, [selectedProfileId, outletContext]);

  const handleRemove = async (designationId) => {
    if (!window.confirm('Are you sure you want to remove this profile? Child profiles will be reassigned to the parent.')) return;
    try {
      await deleteOrgProfileApi(designationId);
      toast.success('Profile removed');
      if (selectedProfileId === designationId) setSelectedProfileId(null);
      loadProfiles();
    } catch (err) {
      console.error(err);
      toast.error('Failed to remove profile');
    }
  };

  const handleUpdateProfile = async (id, data) => {
    const res = await updateOrgProfileApi(id, data);
    setProfiles(prev => prev.map(p => p.designation_id === id ? res.data.data : p));
  };

  const handleUpdateEmployee = async (id, data) => {
    try {
      const res = await updateHREmployeeApi(id, data);
      if (res.data?.success) {
        // Find employee and update just that one
        setEmployees(prev => prev.map(e => e.employee_id === id ? { ...e, job_info: data.job_info } : e));
      }
    } catch (error) {
      console.error(error);
      throw error;
    }
  };

  const fitToScreen = useCallback(() => {
    const container = containerRef.current;
    const content = contentRef.current;
    if (!container || !content) return;
    content.style.transform = 'scale(1)';
    const contentWidth = content.scrollWidth;
    const contentHeight = content.scrollHeight;
    
    // adjust for side panel width if open
    const parentWidth = container.parentElement.clientWidth;
    const availableWidth = selectedProfileId ? (parentWidth * 0.6) - 64 : parentWidth - 64;
    const availableHeight = container.clientHeight - 64;
    
    let nextScale = Math.min(availableWidth / contentWidth, availableHeight / contentHeight, 1);
    nextScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, nextScale));
    setScale(nextScale);
    setPosition({ x: 0, y: 0 });
  }, [selectedProfileId]);

  useEffect(() => {
    if (!isLoading && treeData.length > 0) {
      const id = requestAnimationFrame(fitToScreen);
      return () => cancelAnimationFrame(id);
    }
  }, [isLoading, treeData, fitToScreen]);

  const handleZoom = (direction) => {
    setScale(prev => {
      const next = direction === 'in' ? prev + 0.1 : prev - 0.1;
      return Math.max(MIN_SCALE, Math.min(MAX_SCALE, next));
    });
  };

  const handleWheel = (e) => {
    if (!e.ctrlKey && !e.metaKey) return;
    e.preventDefault();
    setScale(prev => Math.max(MIN_SCALE, Math.min(MAX_SCALE, prev - e.deltaY * 0.001)));
  };

  const handleMouseDown = (e) => {
    setIsDragging(true);
    dragStart.current = { x: e.clientX, y: e.clientY, posX: position.x, posY: position.y };
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;
    setPosition({ x: dragStart.current.posX + dx, y: dragStart.current.posY + dy });
  };

  const stopDragging = () => setIsDragging(false);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <Loader2 className="animate-spin text-[var(--accent)] w-10 h-10" />
      </div>
    );
  }

  return (
    <div className="flex w-full h-[calc(100vh-100px)] overflow-hidden relative bg-[var(--bg-workspace)]">
      
      {/* Chart Area */}
      <div
        ref={containerRef}
        className={`relative transition-all duration-500 ease-in-out ${selectedProfile ? 'w-[60%]' : 'w-full'} h-full border-r border-[var(--border-color)]`}
      >
        <style dangerouslySetInnerHTML={{__html: `
          .org-tree-ul::before {
            content: '';
            position: absolute; top: 0; left: 50%;
            border-left: 2px solid var(--border-color);
            width: 0; height: 20px;
            transform: translateX(-1px);
          }
          .org-tree-li::before, .org-tree-li::after {
            content: '';
            position: absolute; top: 0; right: 50%;
            border-top: 2px solid var(--border-color);
            width: 50%; height: 20px;
          }
          .org-tree-li::after {
            right: auto; left: 50%;
            border-left: 2px solid var(--border-color);
          }
          .org-tree-li:only-child::after, .org-tree-li:only-child::before { display: none; }
          .org-tree-li:only-child { padding-top: 0; }
          .org-tree-li:first-child::before, .org-tree-li:last-child::after { border: 0 none; }
          .org-tree-li:last-child::before { border-right: 2px solid var(--border-color); border-radius: 0 10px 0 0; }
          .org-tree-li:first-child::after { border-radius: 10px 0 0 0; }
        `}} />

        {/* Top toolbar */}
        <div className="absolute top-4 left-4 z-30 flex items-center gap-2">
          <button
            onClick={() => setEditMode(prev => !prev)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold shadow-md border transition-colors ${
              editMode
                ? 'bg-[var(--accent)] text-white border-[var(--accent)]'
                : 'bg-[var(--bg-card)] text-[var(--text-main)] border-[var(--border-color)] hover:border-[var(--accent)]'
            }`}
          >
            {editMode ? <Check size={13} /> : <Pencil size={13} />}
            {editMode ? 'Done Editing' : 'Edit Structure'}
          </button>

          {editMode && (
            <button
              onClick={() => {
                setInitialParentId('');
                setIsModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold shadow-md border border-[var(--border-color)] bg-[var(--bg-card)] text-[var(--text-main)] hover:border-[var(--accent)]"
            >
              <Plus size={13} /> Add New Profile
            </button>
          )}
        </div>

        {/* Zoom controls */}
        <div className="absolute top-4 right-4 z-30 flex items-center gap-1 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg shadow-md p-1">
          <button onClick={() => handleZoom('out')} className="p-2 rounded-md hover:bg-[var(--bg-workspace)] text-[var(--text-main)]" title="Zoom out">
            <ZoomOut size={16} />
          </button>
          <span className="text-[11px] font-bold text-[var(--text-muted)] w-10 text-center select-none">{Math.round(scale * 100)}%</span>
          <button onClick={() => handleZoom('in')} className="p-2 rounded-md hover:bg-[var(--bg-workspace)] text-[var(--text-main)]" title="Zoom in">
            <ZoomIn size={16} />
          </button>
          <div className="w-px h-5 bg-[var(--border-color)] mx-1" />
          <button onClick={fitToScreen} className="p-2 rounded-md hover:bg-[var(--bg-workspace)] text-[var(--text-main)]" title="Fit to screen">
            <Maximize2 size={16} />
          </button>
        </div>

        <div className="absolute bottom-4 left-4 z-30 flex items-center gap-1.5 text-[11px] font-medium text-[var(--text-muted)] bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg shadow-sm px-2.5 py-1.5">
          <Move size={12} /> Drag to pan · Ctrl/Cmd + scroll to zoom
        </div>

        {/* Canvas */}
        <div
          className={`w-full h-full ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={stopDragging}
          onMouseLeave={stopDragging}
        >
          <div
            ref={contentRef}
            className="w-max flex justify-center pb-10 pt-10"
            style={{
              transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
              transformOrigin: 'top center',
              transition: isDragging ? 'none' : 'transform 0.15s ease-out',
            }}
          >
            {treeData.length === 0 ? (
              <div className="flex flex-col items-center justify-center text-[var(--text-muted)] py-20 w-[400px]">
                <HelpCircle size={48} className="mb-4 opacity-50" />
                <h3 className="text-lg font-bold text-center">Chart is empty</h3>
                <p className="text-sm mt-2 text-center">
                  {editMode ? 'Click "Add New Profile" to create your first role.' : 'Switch to "Edit Structure" to build the chart.'}
                </p>
              </div>
            ) : (
              treeData.map((rootNode) => (
                <ul key={rootNode.designation_id} className="flex justify-center m-0 p-0">
                  <OrgNode
                    node={rootNode}
                    isRoot={true}
                    editMode={editMode}
                    onAddChild={(parentId) => {
                      setInitialParentId(parentId);
                      setIsModalOpen(true);
                    }}
                    onRemove={handleRemove}
                    onClick={(node) => setSelectedProfileId(node.designation_id)}
                    selectedProfileId={selectedProfileId}
                    employees={employees}
                  />
                </ul>
              ))
            )}
          </div>
        </div>

        {isModalOpen && (
          <ProfileModal
            allProfiles={profiles}
            initialParentId={initialParentId}
            onClose={() => setIsModalOpen(false)}
            onSuccess={() => {
              setIsModalOpen(false);
              loadProfiles();
            }}
          />
        )}
      </div>

      {/* Side Panel Area */}
      {selectedProfile && (
        <SidePanel 
          profile={selectedProfile}
          allProfiles={profiles}
          onClose={() => setSelectedProfileId(null)}
          onUpdate={handleUpdateProfile}
          onUpdateEmployee={handleUpdateEmployee}
          editMode={editMode}
          employees={employees}
        />
      )}
      
    </div>
  );
};

export default OrganizationChart;