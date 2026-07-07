import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { KanbanSquare, ListTodo, Plus, Loader2, FolderTree, BarChart3, Flag } from 'lucide-react';
import toast from 'react-hot-toast';
import { getProjects, getProjectSprints, createSprint } from '../../../api/pms';
import SprintPlanning from '../components/sprint/SprintPlanning';
import ActiveSprint from '../components/sprint/ActiveSprint';
import SprintAnalytics from '../components/sprint/SprintAnalytics';
import EpicsRoadmap from '../components/sprint/EpicsRoadmap';

const ScrumsSprints = () => {
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState(() => {
    return localStorage.getItem('pms_selected_project_id') || '';
  });
  
  const [sprints, setSprints] = useState([]);
  const [activeTab, setActiveTab] = useState('planning'); // planning, active
  const [isCreatingSprint, setIsCreatingSprint] = useState(false);

  useEffect(() => {
    fetchProjects();
  }, []);

  useEffect(() => {
    if (selectedProjectId) {
      localStorage.setItem('pms_selected_project_id', selectedProjectId);
      fetchSprints();
    } else {
      setSprints([]);
    }
  }, [selectedProjectId]);

  const fetchProjects = async () => {
    try {
      const res = await getProjects({ limit: 100 });
      if (res.data?.success) {
        const fetchedProjects = res.data.data;
        setProjects(fetchedProjects);
        
        const savedProjectId = localStorage.getItem('pms_selected_project_id');
        if (savedProjectId && fetchedProjects.some(p => p.project_id === savedProjectId)) {
          setSelectedProjectId(savedProjectId);
        } else if (fetchedProjects.length > 0) {
          setSelectedProjectId(fetchedProjects[0].project_id);
        }
      }
    } catch (err) {
      toast.error('Failed to load projects');
    } finally {
      setLoading(false);
    }
  };

  const fetchSprints = async () => {
    try {
      const res = await getProjectSprints({ project_id: selectedProjectId });
      if (res.data?.success) {
        setSprints(res.data.data);
        
        // Auto-switch to active if there is an active sprint
        const hasActive = res.data.data.some(s => s.status === 'Active');
        if (hasActive) setActiveTab('active');
        else setActiveTab('planning');
      }
    } catch (err) {
      toast.error('Failed to load sprints');
    }
  };

  const handleCreateSprint = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const payload = {
      project_id: selectedProjectId,
      sprint_name: formData.get('sprint_name'),
      goal: formData.get('goal'),
      start_date: formData.get('start_date'),
      end_date: formData.get('end_date')
    };

    try {
      const res = await createSprint(payload);
      if (res.data?.success) {
        toast.success('Sprint created!');
        setIsCreatingSprint(false);
        fetchSprints();
      }
    } catch (err) {
      toast.error('Failed to create sprint');
    }
  };

  if (loading) {
    return (
      <div className="flex-1 h-full flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-[var(--accent)]" />
      </div>
    );
  }

  const activeSprint = sprints.find(s => s.status === 'Active');

  return (
    <div className="flex flex-col h-[calc(100vh-80px)] bg-[var(--bg-main)]">
      {/* Header */}
      <div className="px-8 py-4 flex flex-col lg:flex-row lg:items-center justify-between gap-6 bg-[var(--bg-card)] border-b border-[var(--border-color)]">
        <div className="flex items-center gap-5">
          <div className="p-3 md:p-4 bg-[var(--bg-workspace)] border border-[var(--border-color)] rounded-2xl shadow-sm group animate-float">
            <KanbanSquare size={24} className="md:w-[28px] md:h-[28px] text-[var(--accent)] group-hover:scale-110 transition-transform duration-300" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-black text-[var(--text-main)] tracking-tight leading-none">
              Scrums & Sprints
            </h1>
            <p className="text-[13px] text-[var(--text-muted)] font-medium mt-2">
              Agile Sprint Planning & Execution
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center bg-[var(--bg-workspace)] border border-[var(--border-color)] rounded-xl px-3 h-[42px] focus-within:border-[var(--accent)] transition-colors shadow-sm">
            <FolderTree size={16} className="text-[var(--text-muted)] mr-2" />
            <select 
              value={selectedProjectId} 
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className="bg-transparent border-none outline-none text-sm font-black text-[var(--text-main)] py-1 cursor-pointer w-[180px]"
            >
              <option value="" disabled>Select a Project</option>
              {projects.map(p => (
                <option key={p.project_id} value={p.project_id}>{p.project_code} - {p.project_name}</option>
              ))}
            </select>
          </div>

          <button 
            onClick={() => setIsCreatingSprint(true)}
            disabled={!selectedProjectId}
            className="btn-primary shadow-lg px-6 h-[42px] group flex items-center gap-2 rounded-xl bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)] transition-all disabled:opacity-50"
          >
            <Plus size={16} strokeWidth={3} className="group-hover:rotate-90 transition-transform duration-300" />
            <span className="text-[12px] font-black uppercase tracking-widest">New Sprint</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      {selectedProjectId && (
        <div className="px-8 pt-4 bg-[var(--bg-card)] border-b border-[var(--border-color)] flex gap-2">
          <button
            onClick={() => setActiveTab('planning')}
            className={`px-5 py-3 text-sm font-black tracking-wider uppercase transition-all flex items-center border-b-[3px] ${
              activeTab === 'planning' ? 'text-[var(--accent)] border-[var(--accent)] bg-[var(--bg-workspace)]' : 'text-[var(--text-muted)] border-transparent hover:text-[var(--text-main)] hover:bg-[var(--bg-workspace)]'
            }`}
          >
            <ListTodo size={16} className="mr-2" strokeWidth={2.5} />
            Sprint Planning
          </button>
          <button
            onClick={() => setActiveTab('active')}
            className={`px-5 py-3 text-sm font-black tracking-wider uppercase transition-all flex items-center border-b-[3px] ${
              activeTab === 'active' ? 'text-[var(--accent)] border-[var(--accent)] bg-[var(--bg-workspace)]' : 'text-[var(--text-muted)] border-transparent hover:text-[var(--text-main)] hover:bg-[var(--bg-workspace)]'
            }`}
          >
            <KanbanSquare size={16} className="mr-2" strokeWidth={2.5} />
            Active Sprint
            {activeSprint && (
              <span className="ml-2 bg-[var(--accent)] text-white text-[10px] px-2 py-0.5 rounded-full font-black animate-pulse">
                LIVE
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('epics')}
            className={`px-5 py-3 text-sm font-black tracking-wider uppercase transition-all flex items-center border-b-[3px] ${
              activeTab === 'epics' ? 'text-[var(--accent)] border-[var(--accent)] bg-[var(--bg-workspace)]' : 'text-[var(--text-muted)] border-transparent hover:text-[var(--text-main)] hover:bg-[var(--bg-workspace)]'
            }`}
          >
            <Flag size={16} className="mr-2" strokeWidth={2.5} />
            Epics Roadmap
          </button>
          {activeSprint && (
            <button
              onClick={() => setActiveTab('analytics')}
              className={`px-5 py-3 text-sm font-black tracking-wider uppercase transition-all flex items-center border-b-[3px] ${
                activeTab === 'analytics' ? 'text-[var(--accent)] border-[var(--accent)] bg-[var(--bg-workspace)]' : 'text-[var(--text-muted)] border-transparent hover:text-[var(--text-main)] hover:bg-[var(--bg-workspace)]'
              }`}
            >
              <BarChart3 size={16} className="mr-2" strokeWidth={2.5} />
              Sprint Analytics
            </button>
          )}
        </div>
      )}

      {/* Workspace */}
      <div className="flex-1 overflow-hidden relative">
        {!selectedProjectId ? (
          <div className="h-full flex flex-col items-center justify-center">
            <FolderTree size={64} className="text-[var(--border-color)] mb-4" />
            <p className="text-[var(--text-muted)] font-black text-lg">Select a project to view sprints</p>
          </div>
        ) : (
          <AnimatePresence mode="wait">
            {activeTab === 'planning' && (
              <motion.div
                key="planning"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="absolute inset-0"
              >
                <SprintPlanning 
                  projectId={selectedProjectId} 
                  sprints={sprints} 
                  refreshSprints={fetchSprints}
                />
              </motion.div>
            )}
            {activeTab === 'active' && (
              <motion.div
                key="active"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="absolute inset-0"
              >
                {activeSprint ? (
                  <ActiveSprint 
                    sprint={activeSprint} 
                    projectId={selectedProjectId} 
                    refreshSprints={fetchSprints}
                  />
                ) : (
                  <div className="h-full flex flex-col items-center justify-center">
                    <KanbanSquare size={64} className="text-[var(--border-color)] mb-4" />
                    <p className="text-[var(--text-main)] font-black text-xl mb-2">No Active Sprint</p>
                    <p className="text-[var(--text-muted)] font-medium text-sm">Go to Sprint Planning to start a sprint.</p>
                    <button 
                      onClick={() => setActiveTab('planning')}
                      className="mt-6 px-6 py-2 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl font-bold text-[var(--text-main)] shadow-sm hover:border-[var(--accent)] transition-colors"
                    >
                      Go to Planning
                    </button>
                  </div>
                )}
              </motion.div>
            )}
            {activeTab === 'epics' && (
              <motion.div
                key="epics"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="absolute inset-0"
              >
                <EpicsRoadmap projectId={selectedProjectId} />
              </motion.div>
            )}
            {activeTab === 'analytics' && activeSprint && (
              <motion.div
                key="analytics"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="absolute inset-0"
              >
                <SprintAnalytics sprintId={activeSprint.sprint_id} />
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </div>

      {/* Create Sprint Modal */}
      {isCreatingSprint && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[var(--bg-card)] rounded-2xl shadow-2xl w-full max-w-md flex flex-col border border-[var(--border-color)] overflow-hidden">
            <div className="px-6 py-4 border-b border-[var(--border-color)] flex justify-between items-center bg-[var(--bg-workspace)]">
              <h2 className="text-lg font-black tracking-tight text-[var(--text-main)]">Create Sprint</h2>
            </div>
            <form onSubmit={handleCreateSprint} className="p-6 space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2">Sprint Name *</label>
                <input 
                  type="text" 
                  name="sprint_name" 
                  required
                  className="w-full px-4 py-2.5 bg-[var(--bg-workspace)] border border-[var(--border-color)] rounded-xl text-sm font-semibold text-[var(--text-main)] focus:border-[var(--accent)] transition-colors"
                  placeholder="e.g., Sprint 1 - MVP Core"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2">Goal</label>
                <textarea 
                  name="goal" 
                  rows={3}
                  className="w-full px-4 py-3 bg-[var(--bg-workspace)] border border-[var(--border-color)] rounded-xl text-sm text-[var(--text-main)] focus:border-[var(--accent)] transition-colors custom-scrollbar"
                  placeholder="What is the main objective?"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2">Start Date</label>
                  <input type="date" name="start_date" className="w-full px-3 py-2 bg-[var(--bg-workspace)] border border-[var(--border-color)] rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2">End Date</label>
                  <input type="date" name="end_date" className="w-full px-3 py-2 bg-[var(--bg-workspace)] border border-[var(--border-color)] rounded-lg text-sm" />
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button type="button" onClick={() => setIsCreatingSprint(false)} className="px-5 py-2 bg-[var(--bg-workspace)] border border-[var(--border-color)] text-sm font-bold rounded-xl hover:bg-[var(--border-color)]">Cancel</button>
                <button type="submit" className="px-5 py-2 bg-[var(--accent)] text-white text-sm font-bold rounded-xl hover:bg-[var(--accent-hover)]">Create</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ScrumsSprints;
