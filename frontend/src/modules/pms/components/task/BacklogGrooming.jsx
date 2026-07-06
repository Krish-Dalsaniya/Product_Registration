import React, { useState, useEffect } from 'react';
import { getProjectSprints, getTasks, updateTask } from '../../../../api/pms';
import { Loader2, Plus, GripVertical, AlertCircle, Calendar } from 'lucide-react';
import toast from 'react-hot-toast';

const BacklogGrooming = ({ onTaskClick }) => {
  const [tasks, setTasks] = useState([]);
  const [sprints, setSprints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [draggedTask, setDraggedTask] = useState(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [tasksRes, sprintsRes] = await Promise.all([
        getTasks({}), // fetch all tasks
        getProjectSprints({})   // fetch all sprints
      ]);
      if (tasksRes.data?.success) setTasks(tasksRes.data.data);
      if (sprintsRes.data?.success) setSprints(sprintsRes.data.data);
    } catch (err) {
      toast.error('Failed to load grooming data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const backlogTasks = tasks.filter(t => !t.sprint_id && t.status !== 'Completed' && t.status !== 'Cancelled');
  
  // Filter for Active and Planned Sprints
  const activeSprints = sprints.filter(s => s.status !== 'Completed' && s.status !== 'Cancelled');

  const handleDragStart = (e, task) => {
    setDraggedTask(task);
    e.dataTransfer.setData('text/plain', task.task_id);
    e.dataTransfer.effectAllowed = 'move';
    
    // Ghost image logic (optional but good for UX)
    const ghost = e.target.cloneNode(true);
    ghost.style.position = "absolute";
    ghost.style.top = "-1000px";
    ghost.style.opacity = "0.8";
    document.body.appendChild(ghost);
    e.dataTransfer.setDragImage(ghost, 20, 20);
    setTimeout(() => document.body.removeChild(ghost), 0);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    e.currentTarget.classList.add('bg-[var(--nav-hover)]');
  };

  const handleDragLeave = (e) => {
    e.currentTarget.classList.remove('bg-[var(--nav-hover)]');
  };

  const handleDrop = async (e, targetSprintId) => {
    e.preventDefault();
    e.currentTarget.classList.remove('bg-[var(--nav-hover)]');
    if (!draggedTask) return;
    
    if (draggedTask.sprint_id === targetSprintId) return; // No change

    // Optimistic UI Update
    const oldSprintId = draggedTask.sprint_id;
    setTasks(prev => prev.map(t => 
      t.task_id === draggedTask.task_id ? { ...t, sprint_id: targetSprintId } : t
    ));
    setDraggedTask(null);

    try {
      const res = await updateTask(draggedTask.task_id, { sprint_id: targetSprintId || '' });
      if (!res.data?.success) throw new Error('Update failed');
      toast.success('Task moved successfully');
    } catch (err) {
      toast.error('Failed to move task');
      // Revert optimism
      setTasks(prev => prev.map(t => 
        t.task_id === draggedTask.task_id ? { ...t, sprint_id: oldSprintId } : t
      ));
    }
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[var(--accent)] animate-spin" />
      </div>
    );
  }

  const renderTaskCard = (task) => (
    <div 
      key={task.task_id}
      draggable
      onDragStart={(e) => handleDragStart(e, task)}
      onClick={() => onTaskClick(task.task_id)}
      className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl p-3 shadow-sm hover:border-[var(--accent)] cursor-grab active:cursor-grabbing group transition-all"
    >
      <div className="flex justify-between items-start gap-2 mb-2">
        <div className="flex items-start gap-2">
           <GripVertical size={14} className="text-[var(--text-muted)] opacity-0 group-hover:opacity-100 transition-opacity mt-0.5" />
           <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">{task.project_code || 'TSK'}-{task.task_id.substring(0,4)}</span>
        </div>
        {task.story_points > 0 && (
          <span className="px-1.5 py-0.5 rounded-md bg-[var(--bg-workspace)] border border-[var(--border-color)] text-[9px] font-bold text-[var(--text-main)]">
            {task.story_points} pt
          </span>
        )}
      </div>
      <h4 className="text-[13px] font-bold text-[var(--text-main)] leading-snug pl-5 group-hover:text-[var(--accent)] transition-colors">{task.task_title}</h4>
      <div className="flex justify-between items-center mt-3 pl-5">
        <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-md border ${
            task.priority === 'Critical' ? 'bg-red-50 text-red-600 border-red-200' :
            task.priority === 'High' ? 'bg-orange-50 text-orange-600 border-orange-200' :
            task.priority === 'Medium' ? 'bg-blue-50 text-blue-600 border-blue-200' :
            'bg-gray-50 text-gray-600 border-gray-200'
        }`}>
            {task.priority}
        </span>
        {task.assignee_name && (
          <div className="w-6 h-6 rounded-full bg-[var(--bg-workspace)] border border-[var(--border-color)] flex items-center justify-center text-[9px] font-black text-[var(--text-muted)] overflow-hidden shadow-sm" title={task.assignee_name}>
            {task.assignee_image ? <img src={task.assignee_image} alt="" className="w-full h-full object-cover" /> : task.assignee_name.charAt(0)}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="h-full flex gap-4 animate-in fade-in slide-in-from-bottom-2 duration-500 overflow-hidden">
      
      {/* Backlog Pane */}
      <div className="w-1/3 flex flex-col bg-[var(--bg-workspace)] rounded-2xl border border-[var(--border-color)] shadow-sm overflow-hidden min-h-0">
        <div className="p-4 border-b border-[var(--border-color)] bg-[var(--bg-card)] flex justify-between items-center shrink-0">
          <div className="flex items-center gap-2">
            <h3 className="text-[14px] font-black text-[var(--text-main)] uppercase tracking-wider">Product Backlog</h3>
            <span className="px-2 py-0.5 bg-[var(--accent)]/10 text-[var(--accent)] rounded-full text-[11px] font-bold">{backlogTasks.length}</span>
          </div>
        </div>
        
        <div 
          className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar transition-all duration-300 relative"
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, null)}
        >
          {backlogTasks.length > 0 ? (
            backlogTasks.map(renderTaskCard)
          ) : (
            <div className="h-full min-h-[200px] flex flex-col items-center justify-center opacity-50 pointer-events-none border-2 border-dashed border-transparent rounded-xl">
              <AlertCircle size={32} className="text-[var(--text-muted)] mb-2" />
              <p className="text-[12px] font-bold text-[var(--text-muted)] uppercase tracking-widest">Backlog is Empty</p>
              <p className="text-[10px] text-[var(--text-muted)] mt-1">Drag tasks here to unassign them</p>
            </div>
          )}
        </div>
      </div>

      {/* Sprints Pane */}
      <div className="flex-1 flex flex-col gap-4 overflow-y-auto custom-scrollbar pr-2 min-h-0">
        {activeSprints.map(sprint => {
          const sprintTasks = tasks.filter(t => t.sprint_id === sprint.sprint_id);
          const totalPoints = sprintTasks.reduce((acc, t) => acc + (t.story_points || 0), 0);
          
          return (
            <div key={sprint.sprint_id} className="bg-[var(--bg-workspace)] rounded-2xl border border-[var(--border-color)] shadow-sm flex flex-col min-h-[300px]">
              <div className="p-4 border-b border-[var(--border-color)] bg-[var(--bg-card)] rounded-t-2xl flex justify-between items-center">
                <div>
                  <h3 className="text-[14px] font-black text-[var(--text-main)]">{sprint.sprint_name} <span className="text-[11px] text-[var(--text-muted)] uppercase ml-2 tracking-wider">({sprint.project_name})</span></h3>
                  <div className="flex items-center gap-3 mt-1 text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-widest">
                    <span className="flex items-center gap-1"><Calendar size={12}/> {sprint.start_date ? new Date(sprint.start_date).toLocaleDateString() : 'TBD'} - {sprint.end_date ? new Date(sprint.end_date).toLocaleDateString() : 'TBD'}</span>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="text-right">
                    <span className="block text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">Issues</span>
                    <span className="text-[14px] font-black text-[var(--text-main)]">{sprintTasks.length}</span>
                  </div>
                  <div className="text-right">
                    <span className="block text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">Story Points</span>
                    <span className="text-[14px] font-black text-[var(--text-main)]">{totalPoints}</span>
                  </div>
                </div>
              </div>
              
              <div 
                className="flex-1 p-4 grid grid-cols-1 lg:grid-cols-2 gap-3 transition-all duration-300 relative min-h-[150px]"
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, sprint.sprint_id)}
              >
                {sprintTasks.length > 0 ? (
                  sprintTasks.map(renderTaskCard)
                ) : (
                  <div className="col-span-full absolute inset-4 flex flex-col items-center justify-center opacity-50 border-2 border-dashed border-[var(--border-color)] rounded-xl pointer-events-none bg-[var(--bg-card)]/50">
                    <p className="text-[12px] font-bold text-[var(--text-muted)] uppercase tracking-widest">Drag tasks here</p>
                    <p className="text-[10px] text-[var(--text-muted)] mt-1">Assign backlog tasks to this sprint</p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
        
        {activeSprints.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center bg-[var(--bg-workspace)] rounded-2xl border border-[var(--border-color)]">
             <AlertCircle size={32} className="text-[var(--text-muted)] mb-4" />
             <p className="text-[12px] font-bold text-[var(--text-muted)] uppercase tracking-widest">No Active or Planned Sprints Found</p>
          </div>
        )}
      </div>

    </div>
  );
};

export default BacklogGrooming;
