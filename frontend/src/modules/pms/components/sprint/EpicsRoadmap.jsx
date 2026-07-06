import React, { useState, useEffect } from 'react';
import { getProjectEpics, createEpic, deleteEpic } from '../../../../api/pms';
import { Loader2, Plus, Flag, MoreVertical, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';

const EpicsRoadmap = ({ projectId }) => {
  const [epics, setEpics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    if (projectId) fetchEpics();
  }, [projectId]);

  const fetchEpics = async () => {
    try {
      setLoading(true);
      const res = await getProjectEpics({ project_id: projectId });
      if (res.data?.success) {
        setEpics(res.data.data);
      }
    } catch (error) {
      toast.error('Failed to load epics');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const payload = {
      project_id: projectId,
      name: formData.get('name'),
      description: formData.get('description')
    };

    try {
      const res = await createEpic(payload);
      if (res.data?.success) {
        toast.success('Epic created');
        setIsCreating(false);
        fetchEpics();
      }
    } catch (err) {
      toast.error('Failed to create epic');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this epic? Tasks inside will not be deleted, just unlinked.')) return;
    try {
      await deleteEpic(id);
      toast.success('Epic deleted');
      fetchEpics();
    } catch (err) {
      toast.error('Failed to delete epic');
    }
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[var(--accent)] animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-full p-6 overflow-y-auto custom-scrollbar">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-xl font-black text-[var(--text-main)]">Epics Roadmap</h2>
            <p className="text-sm text-[var(--text-muted)] font-medium mt-1">High-level features spanning multiple tasks and sprints.</p>
          </div>
          <button 
            onClick={() => setIsCreating(true)}
            className="px-4 py-2 bg-[var(--accent)] text-white text-sm font-bold rounded-xl hover:bg-[var(--accent-hover)] transition-all shadow-md flex items-center gap-2"
          >
            <Plus size={16} strokeWidth={3} /> Create Epic
          </button>
        </div>

        {isCreating && (
          <form onSubmit={handleCreate} className="bg-[var(--bg-card)] border border-[var(--border-color)] p-5 rounded-2xl mb-6 shadow-sm">
            <h3 className="font-bold mb-4">New Epic</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1">Epic Name</label>
                <input name="name" required className="w-full px-4 py-2 bg-[var(--bg-workspace)] border border-[var(--border-color)] rounded-xl text-sm focus:border-[var(--accent)]" placeholder="e.g. Q3 Payment Gateway" />
              </div>
              <div>
                <label className="block text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1">Description</label>
                <textarea name="description" rows="2" className="w-full px-4 py-2 bg-[var(--bg-workspace)] border border-[var(--border-color)] rounded-xl text-sm focus:border-[var(--accent)]"></textarea>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setIsCreating(false)} className="px-4 py-2 text-sm font-bold text-[var(--text-muted)] hover:text-[var(--text-main)]">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-[var(--accent)] text-white text-sm font-bold rounded-xl hover:bg-[var(--accent-hover)]">Save Epic</button>
              </div>
            </div>
          </form>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {epics.map(epic => {
            const total = parseInt(epic.total_tasks) || 0;
            const completed = parseInt(epic.completed_tasks) || 0;
            const progress = total === 0 ? 0 : Math.round((completed / total) * 100);

            return (
              <div key={epic.epic_id} className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-5 shadow-sm hover:shadow-md transition-all group">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-2 text-purple-600">
                    <div className="p-1.5 bg-purple-100 rounded-lg"><Flag size={16} /></div>
                    <span className="font-bold text-sm tracking-wider uppercase">{epic.status}</span>
                  </div>
                  <button onClick={() => handleDelete(epic.epic_id)} className="text-[var(--text-muted)] hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Trash2 size={16} />
                  </button>
                </div>
                
                <h3 className="text-lg font-black text-[var(--text-main)] mb-2">{epic.name}</h3>
                <p className="text-sm text-[var(--text-muted)] mb-4 line-clamp-2">{epic.description || 'No description provided.'}</p>

                <div>
                  <div className="flex justify-between text-xs font-bold text-[var(--text-muted)] mb-1">
                    <span>{progress}% Completed</span>
                    <span>{completed} / {total} Tasks</span>
                  </div>
                  <div className="w-full bg-[var(--bg-workspace)] rounded-full h-2.5 overflow-hidden">
                    <div className="bg-purple-600 h-2.5 rounded-full transition-all duration-500" style={{ width: `${progress}%` }}></div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {!loading && epics.length === 0 && !isCreating && (
          <div className="text-center py-20 text-[var(--text-muted)] border-2 border-dashed border-[var(--border-color)] rounded-2xl">
            <Flag size={48} className="mx-auto mb-4 opacity-50" />
            <p className="font-black text-lg text-[var(--text-main)] mb-1">No Epics Found</p>
            <p className="font-medium text-sm">Create an epic to group massive features together.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default EpicsRoadmap;
