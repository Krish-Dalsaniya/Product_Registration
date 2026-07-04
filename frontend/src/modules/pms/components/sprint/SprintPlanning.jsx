import React, { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { getTasks, updateTask, updateSprint } from '../../../../api/pms';
import toast from 'react-hot-toast';
import { Loader2, Calendar, GripVertical, AlertCircle, Play } from 'lucide-react';
import { format } from 'date-fns';

const SprintPlanning = ({ projectId, sprints, refreshSprints }) => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTasks();
  }, [projectId]);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      // Fetch all tasks for project, regardless of sprint
      const res = await getTasks({ project_id: projectId });
      if (res.data?.success) {
        setTasks(res.data.data);
      }
    } catch (err) {
      toast.error('Failed to load tasks');
    } finally {
      setLoading(false);
    }
  };

  // Group tasks by sprint
  const backlogTasks = tasks.filter(t => !t.sprint_id);
  
  // Sort sprints: Active first, then Planning by date, then Completed
  const sortedSprints = [...sprints].sort((a, b) => {
    if (a.status === 'Active') return -1;
    if (b.status === 'Active') return 1;
    if (a.status === 'Completed') return 1;
    if (b.status === 'Completed') return -1;
    return new Date(a.start_date || 0) - new Date(b.start_date || 0);
  });

  const onDragEnd = async (result) => {
    const { destination, source, draggableId } = result;

    if (!destination) return;
    if (destination.droppableId === source.droppableId) return; // Reordering within same list not implemented yet

    const taskId = draggableId;
    const newSprintId = destination.droppableId === 'backlog' ? null : destination.droppableId;

    // Optimistic UI update
    setTasks(prev => prev.map(t => t.task_id === taskId ? { ...t, sprint_id: newSprintId } : t));

    try {
      await updateTask(taskId, { sprint_id: newSprintId });
      refreshSprints(); // Update sprint metrics (total points, etc)
    } catch (err) {
      toast.error('Failed to move task');
      fetchTasks(); // Revert on failure
    }
  };

  const handleStartSprint = async (sprintId) => {
    try {
      await updateSprint(sprintId, { status: 'Active' });
      toast.success('Sprint started!');
      refreshSprints();
    } catch (err) {
      toast.error('Failed to start sprint');
    }
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--accent)]" />
      </div>
    );
  }

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="h-full flex gap-6 p-6 overflow-hidden">
        
        {/* Backlog Column */}
        <div className="w-1/3 bg-[var(--bg-card)] rounded-2xl border border-[var(--border-color)] flex flex-col shadow-sm">
          <div className="p-4 border-b border-[var(--border-color)] bg-[var(--bg-workspace)] rounded-t-2xl flex justify-between items-center">
            <h3 className="font-black tracking-tight text-[var(--text-main)] text-lg">Backlog</h3>
            <span className="text-xs font-bold text-[var(--text-muted)] bg-[var(--bg-card)] px-2 py-1 rounded-md border border-[var(--border-color)]">
              {backlogTasks.length} Issues
            </span>
          </div>
          
          <Droppable droppableId="backlog">
            {(provided, snapshot) => (
              <div 
                {...provided.droppableProps} 
                ref={provided.innerRef}
                className={`flex-1 p-4 overflow-y-auto custom-scrollbar space-y-3 ${snapshot.isDraggingOver ? 'bg-[var(--accent)]/5' : ''}`}
              >
                {backlogTasks.length === 0 && !snapshot.isDraggingOver && (
                  <div className="h-32 flex flex-col items-center justify-center text-[var(--text-muted)] border-2 border-dashed border-[var(--border-color)] rounded-xl">
                    <AlertCircle size={24} className="mb-2 opacity-50" />
                    <span className="text-sm font-semibold">Backlog is empty</span>
                  </div>
                )}
                {backlogTasks.map((task, index) => (
                  <TaskItem key={task.task_id} task={task} index={index} />
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </div>

        {/* Sprints Column */}
        <div className="w-2/3 flex flex-col space-y-6 overflow-y-auto custom-scrollbar pr-2">
          {sortedSprints.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-[var(--text-muted)] border border-[var(--border-color)] rounded-2xl bg-[var(--bg-card)] shadow-sm">
              <span className="text-lg font-black text-[var(--text-main)]">No Sprints Created</span>
              <span className="text-sm font-medium mt-1">Create a sprint to start planning</span>
            </div>
          ) : (
            sortedSprints.map(sprint => (
              <SprintBox 
                key={sprint.sprint_id} 
                sprint={sprint} 
                tasks={tasks.filter(t => t.sprint_id === sprint.sprint_id)} 
                onStart={() => handleStartSprint(sprint.sprint_id)}
                hasActiveSprint={sortedSprints.some(s => s.status === 'Active')}
              />
            ))
          )}
        </div>

      </div>
    </DragDropContext>
  );
};

const SprintBox = ({ sprint, tasks, onStart, hasActiveSprint }) => {
  const isPlanning = sprint.status === 'Planning';
  const isActive = sprint.status === 'Active';
  const isCompleted = sprint.status === 'Completed';

  return (
    <div className={`bg-[var(--bg-card)] rounded-2xl border flex flex-col shadow-sm transition-colors ${isActive ? 'border-[var(--accent)] shadow-[var(--accent)]/10' : 'border-[var(--border-color)]'}`}>
      {/* Sprint Header */}
      <div className={`p-4 border-b flex justify-between items-center rounded-t-2xl ${isActive ? 'bg-[var(--accent)]/5 border-[var(--accent)]/20' : 'bg-[var(--bg-workspace)] border-[var(--border-color)]'}`}>
        <div>
          <div className="flex items-center gap-3">
            <h3 className="font-black tracking-tight text-[var(--text-main)] text-lg">{sprint.sprint_name}</h3>
            {isActive && <span className="bg-[var(--accent)] text-white text-[10px] px-2 py-0.5 rounded-full font-black animate-pulse">ACTIVE</span>}
            {isCompleted && <span className="bg-emerald-500/20 text-emerald-500 text-[10px] px-2 py-0.5 rounded-full font-black">COMPLETED</span>}
          </div>
          <div className="flex items-center gap-4 mt-1 text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider">
            {sprint.start_date && sprint.end_date ? (
              <span className="flex items-center gap-1.5"><Calendar size={12}/> {format(new Date(sprint.start_date), 'MMM d')} - {format(new Date(sprint.end_date), 'MMM d, yyyy')}</span>
            ) : (
              <span className="flex items-center gap-1.5"><Calendar size={12}/> Dates not set</span>
            )}
            <span>•</span>
            <span>{tasks.length} Issues</span>
            <span>•</span>
            <span className="text-[var(--accent)]">{sprint.total_points || 0} Points</span>
          </div>
          {sprint.goal && <p className="text-sm text-[var(--text-secondary)] mt-2 font-medium">{sprint.goal}</p>}
        </div>
        
        {isPlanning && (
          <button 
            onClick={onStart}
            disabled={hasActiveSprint || tasks.length === 0}
            className="flex items-center gap-1.5 px-4 py-2 bg-[var(--accent)] text-white rounded-xl font-bold text-sm hover:bg-[var(--accent-hover)] transition-all shadow-md disabled:opacity-50"
          >
            <Play size={14} /> {hasActiveSprint ? 'Another Sprint Active' : 'Start Sprint'}
          </button>
        )}
      </div>

      {/* Sprint Tasks Dropzone */}
      <Droppable droppableId={sprint.sprint_id} isDropDisabled={isCompleted}>
        {(provided, snapshot) => (
          <div 
            {...provided.droppableProps} 
            ref={provided.innerRef}
            className={`p-4 space-y-3 min-h-[120px] transition-colors ${snapshot.isDraggingOver ? 'bg-[var(--accent)]/5' : ''}`}
          >
            {tasks.length === 0 && !snapshot.isDraggingOver && (
              <div className="h-20 flex flex-col items-center justify-center text-[var(--text-muted)] border-2 border-dashed border-[var(--border-color)] rounded-xl">
                <span className="text-sm font-semibold">Drag tasks here to plan this sprint</span>
              </div>
            )}
            {tasks.map((task, index) => (
              <TaskItem key={task.task_id} task={task} index={index} isCompleted={isCompleted} />
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </div>
  );
};

const TaskItem = ({ task, index, isCompleted }) => {
  return (
    <Draggable draggableId={task.task_id} index={index} isDragDisabled={isCompleted}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className={`group flex items-center gap-3 p-3 bg-[var(--bg-workspace)] border rounded-xl transition-all shadow-sm ${
            snapshot.isDragging ? 'border-[var(--accent)] shadow-lg rotate-2 z-50' : 'border-[var(--border-color)] hover:border-[var(--text-muted)]'
          } ${isCompleted ? 'opacity-70 grayscale' : ''}`}
        >
          <GripVertical size={16} className="text-[var(--text-muted)] opacity-50 group-hover:opacity-100 transition-opacity" />
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-4">
              <span className="text-sm font-bold text-[var(--text-main)] truncate">{task.task_title}</span>
              <div className="flex items-center gap-3 shrink-0">
                {task.status !== 'Backlog' && (
                  <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase bg-[var(--bg-card)] px-2 py-0.5 rounded border border-[var(--border-color)]">
                    {task.status}
                  </span>
                )}
                {task.assignee_image ? (
                  <img src={task.assignee_image.startsWith('http') ? task.assignee_image : `${import.meta.env.VITE_API_BASE_URL?.replace(/\/api$/, '') || 'http://localhost:3000'}${task.assignee_image}`} alt={task.assignee_name} className="w-6 h-6 rounded-full object-cover border border-[var(--border-color)]" title={task.assignee_name} />
                ) : (
                  <div className="w-6 h-6 rounded-full bg-[var(--bg-card)] border border-[var(--border-color)] flex items-center justify-center shrink-0" title={task.assignee_name || 'Unassigned'}>
                    <span className="text-[9px] font-black text-[var(--accent)]">{task.assignee_name ? task.assignee_name.substring(0,2).toUpperCase() : '?'}</span>
                  </div>
                )}
                <div className="w-8 text-center shrink-0">
                  <span className="text-xs font-black text-[var(--accent)] bg-[var(--accent)]/10 px-2 py-1 rounded-md border border-[var(--accent)]/20" title="Story Points">
                    {task.story_points || 0}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </Draggable>
  );
};

export default SprintPlanning;
