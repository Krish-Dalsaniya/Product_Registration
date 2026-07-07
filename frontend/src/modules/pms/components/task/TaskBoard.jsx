import React from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { Calendar, MessageSquare, Paperclip } from 'lucide-react';
import { TASK_STATUSES, getPriorityConfig, getTypeConfig, getStatusConfig } from '../../utils/taskConstants';
import { format } from 'date-fns';

const TaskBoard = ({ tasks, onStatusChange, onTaskClick }) => {
  
  // Group tasks by status
  const columns = TASK_STATUSES.reduce((acc, status) => {
    acc[status.id] = tasks.filter(t => t.status === status.id);
    return acc;
  }, {});

  const onDragEnd = (result) => {
    const { destination, source, draggableId } = result;

    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    onStatusChange(draggableId, destination.droppableId);
  };

  return (
    <div className="h-full overflow-x-auto custom-scrollbar pb-4">
      <DragDropContext onDragEnd={onDragEnd}>
        <div className="flex h-full gap-4 items-start min-w-max">
          {TASK_STATUSES.map(status => {
            const columnTasks = columns[status.id] || [];
            const StatusIcon = status.icon;
            
            // Only show columns that are active in MVP (or maybe all)
            // Let's hide Cancelled by default unless there are tasks, to save space
            if ((status.id === 'Cancelled' || status.id === 'On Hold') && columnTasks.length === 0) return null;

            return (
              <div key={status.id} className="bg-[#ebecf0] dark:bg-[#1a1a1c] rounded-[10px] flex flex-col min-w-[260px] w-[260px] max-h-full shrink-0 shadow-sm transition-all duration-300 border border-transparent">
                <div className="p-3 pb-2 border-transparent flex items-center justify-between sticky top-0 bg-[#ebecf0] dark:bg-[#1a1a1c] z-10 rounded-t-[10px]">
                  <div className="flex items-center gap-2 cursor-pointer group">
                    <StatusIcon size={14} className={status.color} strokeWidth={3} />
                    <h3 className="font-bold text-[14px] text-gray-800 dark:text-gray-200 pl-1 group-hover:text-blue-600 transition-colors uppercase tracking-wide">{status.label}</h3>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="bg-gray-200 dark:bg-gray-800 text-gray-600 dark:text-gray-400 text-[11px] font-bold px-2 py-0.5 rounded-full">
                      {columnTasks.length}
                    </span>
                  </div>
                </div>
                
                <Droppable droppableId={status.id}>
                  {(provided, snapshot) => (
                    <div 
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`p-2.5 flex-1 overflow-y-auto min-h-[150px] custom-scrollbar flex flex-col transition-colors ${snapshot.isDraggingOver ? 'bg-black/5 dark:bg-white/5 rounded-b-[10px]' : ''}`}
                    >
                      {columnTasks.map((task, index) => (
                        <Draggable key={task.task_id} draggableId={task.task_id} index={index}>
                          {(provided, snapshot) => (
                            <TaskCard 
                              task={task} 
                              provided={provided} 
                              snapshot={snapshot} 
                              onClick={() => onTaskClick(task.task_id)}
                            />
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </div>
            );
          })}
        </div>
      </DragDropContext>
    </div>
  );
};

const TaskCard = ({ task, provided, snapshot, onClick }) => {
  const Priority = getPriorityConfig(task.priority);
  const Type = getTypeConfig(task.task_type);
  const Status = getStatusConfig(task.status);
  const PIcon = Priority.icon;
  const TIcon = Type.icon;

  return (
    <div
      ref={provided.innerRef}
      {...provided.draggableProps}
      {...provided.dragHandleProps}
      onClick={onClick}
      className={`bg-white dark:bg-[#252528] rounded-[8px] p-3 mb-2 shadow-sm border border-gray-200 dark:border-gray-700 cursor-pointer hover:border-blue-400 hover:shadow-md transition-all active:cursor-grabbing group relative ${snapshot.isDragging ? 'shadow-2xl scale-[1.02] rotate-1 z-50 ring-2 ring-blue-500' : ''}`}
    >
      {/* Header Tags */}
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-center gap-1.5 flex-wrap">
          <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded bg-[var(--bg-workspace)] border border-[var(--border-color)] text-[var(--text-secondary)]">
            <TIcon size={12} className={Type.color} />
            {task.task_type}
          </div>
          {task.project_code && (
            <div className="text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded bg-[var(--accent)]/10 text-[var(--accent)] border border-[var(--accent)]/20">
              {task.project_code}
            </div>
          )}
          {task.tags && task.tags.map(tag => (
            <div key={tag} className="text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded bg-blue-500/10 text-blue-500 border border-blue-500/20">
              #{tag}
            </div>
          ))}
        </div>
        <div className="flex items-center gap-1" title={`Priority: ${task.priority}`}>
          <PIcon size={14} className={Priority.color} strokeWidth={3} />
        </div>
      </div>

      {/* Title */}
      <h4 className="text-sm font-bold text-[var(--text-main)] mb-3 leading-tight group-hover:text-[var(--accent)] transition-colors line-clamp-2">
        {task.task_title}
      </h4>

      {/* Meta Footer */}
      <div className="flex items-center justify-between mt-auto pt-3 border-t border-[var(--border-color)]">
        <div className="flex items-center gap-3">
          {task.due_date && (
            <div className={`flex items-center gap-1 text-xs font-semibold ${new Date(task.due_date) < new Date() && task.status !== 'Completed' ? 'text-rose-500' : 'text-[var(--text-muted)]'}`}>
              <Calendar size={12} />
              {format(new Date(task.due_date), 'MMM d')}
            </div>
          )}
          {/* Mock counts for MVP since we don't fetch joined counts yet, can implement later */}
          <div className="flex items-center gap-2 text-[var(--text-muted)]">
            {task.attachments?.length > 0 && (
              <div className="flex items-center gap-1 text-xs"><Paperclip size={12} /> {task.attachments.length}</div>
            )}
          </div>
        </div>

        {/* Assignee Avatar */}
        <div className="flex -space-x-2">
          {task.assignee_id ? (
            <div className="w-6 h-6 rounded-full overflow-hidden border-2 border-[var(--bg-card)] bg-[var(--bg-workspace)] flex items-center justify-center shadow-sm relative group/avatar">
              {task.assignee_image ? (
                <img src={task.assignee_image.startsWith('http') ? task.assignee_image : `${import.meta.env.VITE_API_BASE_URL?.replace(/\/api$/, '') || 'http://localhost:3000'}${task.assignee_image}`} alt={task.assignee_name} className="w-full h-full object-cover" />
              ) : (
                <span className="text-[9px] font-black text-[var(--accent)]">{task.assignee_name.substring(0,2).toUpperCase()}</span>
              )}
              <div className="absolute hidden group-hover/avatar:block bottom-full mb-1 w-max text-xs bg-black text-white px-2 py-1 rounded z-50">{task.assignee_name}</div>
            </div>
          ) : (
            <div className="w-6 h-6 rounded-full border-2 border-[var(--border-color)] border-dashed flex items-center justify-center text-[var(--text-muted)] bg-[var(--bg-workspace)]" title="Unassigned">
              <span className="text-[10px] font-bold">?</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TaskBoard;
