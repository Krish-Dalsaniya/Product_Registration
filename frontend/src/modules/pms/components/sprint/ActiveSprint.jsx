import React, { useState, useEffect, useMemo } from 'react';
import { getTasks, updateTaskStatus, updateSprint } from '../../../../api/pms';
import toast from 'react-hot-toast';
import { Loader2, CheckCircle2, TrendingUp } from 'lucide-react';
import { TASK_STATUSES, getPriorityConfig, getTypeConfig } from '../../utils/taskConstants';
import { format } from 'date-fns';

const ActiveSprint = ({ sprint, projectId, refreshSprints }) => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [collapsedColumns, setCollapsedColumns] = useState([]);

  // Native DND State
  const [draggedTask, setDraggedTask] = useState(null);
  const [dragOverCol, setDragOverCol] = useState(null);

  useEffect(() => {
    fetchSprintTasks();
  }, [sprint.sprint_id]);

  const fetchSprintTasks = async () => {
    try {
      setLoading(true);
      const res = await getTasks({ sprint_id: sprint.sprint_id });
      if (res.data?.success) {
        setTasks(res.data.data);
      }
    } catch (err) {
      toast.error('Failed to load sprint tasks');
    } finally {
      setLoading(false);
    }
  };

  const columns = useMemo(() => {
    const cols = {};
    TASK_STATUSES.forEach(status => {
      cols[status.id] = { ...status, tasks: [] };
    });
    tasks.forEach(task => {
      if (cols[task.status]) {
        cols[task.status].tasks.push(task);
      }
    });
    return Object.values(cols);
  }, [tasks]);

  const handleCompleteSprint = async () => {
    if (!window.confirm("Are you sure you want to complete this sprint? Unfinished tasks will be moved to the backlog.")) return;
    
    try {
      await updateSprint(sprint.sprint_id, { status: 'Completed' });
      toast.success('Sprint completed!');
      refreshSprints();
    } catch (err) {
      toast.error('Failed to complete sprint');
    }
  };

  const toggleCollapse = (colId) => {
    setCollapsedColumns(prev => 
      prev.includes(colId) ? prev.filter(c => c !== colId) : [...prev, colId]
    );
  };

  // ----------------------------------------------------
  // NATIVE HTML5 DRAG AND DROP
  // ----------------------------------------------------
  const handleDragStart = (e, task) => {
    setDraggedTask(task);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', task.task_id);
    setTimeout(() => {
        if (e.target) e.target.style.opacity = '0.4';
    }, 0);
  };

  const handleDragEnd = (e) => {
    if (e.target) e.target.style.opacity = '1';
    setDraggedTask(null);
    setDragOverCol(null);
  };

  const handleDragOver = (e, colId) => {
    e.preventDefault(); 
    e.dataTransfer.dropEffect = 'move';
    if (dragOverCol !== colId) {
        setDragOverCol(colId);
    }
  };

  const handleDragLeave = (e, colId) => {
    e.preventDefault();
    if (dragOverCol === colId) {
        setDragOverCol(null);
    }
  };

  const handleDrop = async (e, colId) => {
    e.preventDefault();
    setDragOverCol(null);
    if (!draggedTask) return;
    if (draggedTask.status === colId) return;

    const taskId = draggedTask.task_id;
    setTasks(prev => prev.map(t => t.task_id === taskId ? { ...t, status: colId } : t));

    try {
      await updateTaskStatus(taskId, colId);
    } catch (err) {
      toast.error('Failed to update status');
      fetchSprintTasks();
    }
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--accent)]" />
      </div>
    );
  }

  const totalPoints = tasks.reduce((sum, t) => sum + (Number(t.story_points) || 0), 0);
  const completedPoints = tasks.filter(t => t.status === 'Completed').reduce((sum, t) => sum + (Number(t.story_points) || 0), 0);
  const progressPercent = totalPoints > 0 ? Math.round((completedPoints / totalPoints) * 100) : 0;

  return (
    <div className="h-full flex flex-col p-6">
      <div className="bg-[var(--bg-card)] rounded-2xl p-5 mb-6 border border-[var(--border-color)] shadow-sm flex justify-between items-center shrink-0">
        <div>
          <h2 className="text-xl font-black text-[var(--text-main)] flex items-center gap-3">
            {sprint.sprint_name}
            <span className="bg-[var(--accent)] text-white text-[10px] px-2 py-0.5 rounded-full font-black animate-pulse">ACTIVE</span>
          </h2>
          <div className="text-sm font-bold text-[var(--text-muted)] mt-1 flex items-center gap-4">
            <span>{sprint.start_date ? format(new Date(sprint.start_date), 'MMM d, yyyy') : 'No Start Date'} - {sprint.end_date ? format(new Date(sprint.end_date), 'MMM d, yyyy') : 'No End Date'}</span>
            <span>•</span>
            <span className="flex items-center gap-1.5"><TrendingUp size={14} className="text-[var(--accent)]"/> {progressPercent}% Completed</span>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="text-right">
            <div className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1">Sprint Points</div>
            <div className="text-xl font-black text-[var(--text-main)]">
              <span className="text-emerald-500">{completedPoints}</span> / {totalPoints}
            </div>
          </div>
          
          <button 
            onClick={handleCompleteSprint}
            className="flex items-center gap-2 px-6 py-3 bg-emerald-500 text-white rounded-xl font-black text-sm hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-500/20 hover:-translate-y-0.5"
          >
            <CheckCircle2 size={18} strokeWidth={3} /> Complete Sprint
          </button>
        </div>
      </div>

      <div className="flex-1 flex gap-6 overflow-x-auto pb-4 custom-scrollbar items-start">
        {columns.map(column => {
          const isCollapsed = collapsedColumns.includes(column.id);

          if (isCollapsed) {
            return (
              <div 
                key={column.id}
                onClick={() => toggleCollapse(column.id)}
                onDragOver={(e) => handleDragOver(e, column.id)}
                onDragLeave={(e) => handleDragLeave(e, column.id)}
                onDrop={(e) => handleDrop(e, column.id)}
                className={`rounded-[10px] w-12 min-w-[48px] max-h-full shrink-0 flex flex-col items-center py-4 cursor-pointer transition-all duration-300 shadow-sm ${dragOverCol === column.id ? 'bg-black/10 dark:bg-white/10 ring-2 ring-blue-500 transform scale-110 shadow-lg z-10' : 'bg-[#ebecf0] dark:bg-[#1a1a1c] hover:bg-gray-200 dark:hover:bg-gray-800'}`}
              >
                <div className="bg-gray-300 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-[11px] font-bold px-2 py-0.5 rounded-full mb-4 shrink-0">
                  {column.tasks.length}
                </div>
                <div className="font-bold text-[14px] text-gray-600 dark:text-gray-400 [writing-mode:vertical-lr] rotate-180 flex-1 flex items-center justify-center tracking-wider uppercase">
                  {column.label}
                </div>
              </div>
            );
          }

          return (
            <div 
              key={column.id} 
              className={`bg-[#ebecf0] dark:bg-[#1a1a1c] rounded-[10px] flex flex-col min-w-[260px] w-[260px] max-h-full shrink-0 shadow-sm transition-all duration-300 border border-transparent ${dragOverCol === column.id ? 'transform scale-[1.02] ring-2 ring-blue-500 shadow-xl z-10' : ''}`}
              onDragOver={(e) => handleDragOver(e, column.id)}
              onDragLeave={(e) => handleDragLeave(e, column.id)}
              onDrop={(e) => handleDrop(e, column.id)}
            >
              <div 
                className="p-3 pb-2 border-transparent flex items-center justify-between sticky top-0 bg-[#ebecf0] dark:bg-[#1a1a1c] z-10 rounded-t-[10px]"
                onClick={() => toggleCollapse(column.id)}
              >
                <div className="flex items-center gap-2 cursor-pointer group">
                  <div className={`w-3 h-3 rounded-full border-2 ${column.color}`} />
                  <h3 className="font-bold text-[14px] text-gray-800 dark:text-gray-200 pl-1 group-hover:text-blue-600 transition-colors uppercase tracking-wide">
                    {column.label}
                  </h3>
                </div>
                <div className="flex items-center gap-1">
                  <span className="bg-gray-200 dark:bg-gray-800 text-gray-600 dark:text-gray-400 text-[11px] font-bold px-2 py-0.5 rounded-full">
                    {column.tasks.length}
                  </span>
                </div>
              </div>
              
              <div className={`p-2.5 flex-1 overflow-y-auto min-h-[150px] custom-scrollbar flex flex-col transition-colors ${dragOverCol === column.id ? 'bg-black/5 dark:bg-white/5 rounded-b-[10px]' : ''}`}>
                {column.tasks.map((task) => (
                  <SprintTaskCard 
                    key={task.task_id} 
                    task={task} 
                    onDragStart={handleDragStart}
                    onDragEnd={handleDragEnd}
                  />
                ))}
                {column.tasks.length === 0 && dragOverCol !== column.id && (
                  <div className="h-full border-2 border-dashed border-[var(--border-color)] rounded-xl flex items-center justify-center text-xs font-bold text-[var(--text-muted)] opacity-50">
                    Drop task here
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const SprintTaskCard = ({ task, onDragStart, onDragEnd }) => {
  const Priority = getPriorityConfig(task.priority);
  const Type = getTypeConfig(task.task_type);
  const PIcon = Priority.icon;
  const TIcon = Type.icon;

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, task)}
      onDragEnd={onDragEnd}
      className="bg-white dark:bg-[#252528] rounded-[8px] p-3 mb-2 shadow-sm border border-gray-200 dark:border-gray-700 cursor-grab active:cursor-grabbing hover:border-blue-400 hover:shadow-md transition-all group relative"
    >
      <div className="flex justify-between items-start mb-3 pointer-events-none">
        <div className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-secondary)]" title={`Task Type: ${task.task_type || 'Task'}`}>
          <TIcon size={10} className={Type.color} />
          {task.task_type || 'Task'}
        </div>
        <div className="shrink-0">
          <span className="text-[10px] font-black text-[var(--accent)] bg-[var(--accent)]/10 px-2 py-1 rounded-md border border-[var(--accent)]/20 whitespace-nowrap" title="Story Points">
            {task.story_points || 0} pts
          </span>
        </div>
      </div>
      
      <h4 className="font-bold text-[var(--text-main)] text-sm mb-3 line-clamp-2 leading-snug pointer-events-none">
        {task.task_title}
      </h4>

      <div className="flex items-center justify-between mt-auto pointer-events-none">
        <div className="flex items-center gap-1.5" title={`Priority: ${task.priority || 'Medium'}`}>
          <PIcon size={14} className={Priority.color} strokeWidth={3} />
          <span className="text-[10px] font-bold text-[var(--text-muted)] tracking-wide">{task.priority || 'Medium'}</span>
        </div>

        <div className="flex items-center gap-3">
          {task.assignee_image ? (
            <img src={task.assignee_image.startsWith('http') ? task.assignee_image : `${import.meta.env.VITE_API_BASE_URL?.replace(/\/api$/, '') || 'http://localhost:3000'}${task.assignee_image}`} alt={task.assignee_name} className="w-6 h-6 rounded-full object-cover border border-[var(--border-color)]" title={`Assignee: ${task.assignee_name}`} />
          ) : (
            <div className="w-6 h-6 rounded-full bg-[var(--bg-card)] border border-[var(--border-color)] flex items-center justify-center shrink-0" title={task.assignee_name ? `Assignee: ${task.assignee_name}` : 'Unassigned'}>
              <span className="text-[9px] font-black text-[var(--accent)]">{task.assignee_name ? task.assignee_name.substring(0,2).toUpperCase() : '?'}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ActiveSprint;
