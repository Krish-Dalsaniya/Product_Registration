import React from 'react';
import { format } from 'date-fns';
import { Edit2, Trash2 } from 'lucide-react';
import { getPriorityConfig, getTypeConfig, getStatusConfig } from '../../utils/taskConstants';

const TaskList = ({ tasks, onTaskClick, onDelete }) => {
  return (
    <div className="h-full bg-[var(--bg-card)] rounded-2xl border border-[var(--border-color)] shadow-sm overflow-hidden flex flex-col">
      <div className="overflow-x-auto flex-1 custom-scrollbar">
        <table className="w-full text-left border-collapse min-w-[800px]">
          <thead className="sticky top-0 z-10">
            <tr className="border-b-2 border-[var(--border-color)] bg-[var(--bg-workspace)]">
              <th className="px-4 py-2.5 text-[10px] font-bold text-[var(--text-muted)] hover:text-[var(--text-main)] uppercase tracking-wider">Task</th>
              <th className="px-4 py-2.5 text-[10px] font-bold text-[var(--text-muted)] hover:text-[var(--text-main)] uppercase tracking-wider">Project</th>
              <th className="px-4 py-2.5 text-[10px] font-bold text-[var(--text-muted)] hover:text-[var(--text-main)] uppercase tracking-wider">Assignee</th>
              <th className="px-4 py-2.5 text-[10px] font-bold text-[var(--text-muted)] hover:text-[var(--text-main)] uppercase tracking-wider">Status</th>
              <th className="px-4 py-2.5 text-[10px] font-bold text-[var(--text-muted)] hover:text-[var(--text-main)] uppercase tracking-wider">Priority</th>
              <th className="px-4 py-2.5 text-[10px] font-bold text-[var(--text-muted)] hover:text-[var(--text-main)] uppercase tracking-wider">Due Date</th>
              <th className="px-4 py-2.5 text-[10px] font-bold text-[var(--text-muted)] hover:text-[var(--text-main)] uppercase tracking-wider text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border-color)]">
            {tasks.length === 0 ? (
              <tr>
                <td colSpan="7" className="px-4 py-8 text-center text-[var(--text-muted)] font-medium">
                  No tasks found. Create a new task to get started.
                </td>
              </tr>
            ) : (
              tasks.map((task, index) => {
                const Priority = getPriorityConfig(task.priority);
                const Type = getTypeConfig(task.task_type);
                const Status = getStatusConfig(task.status);
                const PIcon = Priority.icon;
                const TIcon = Type.icon;
                const SIcon = Status.icon;

                return (
                  <tr key={task.task_id} className={`transition-colors duration-200 group ${index % 2 === 1 ? 'bg-gray-100 dark:bg-gray-800/60 hover:bg-gray-200 dark:hover:bg-gray-700/50' : 'bg-transparent hover:bg-gray-50 dark:hover:bg-gray-800/30'}`}>
                    <td className="px-4 py-2">
                      <div className="flex items-center gap-3">
                        <TIcon size={16} className={Type.color} />
                        <div>
                          <div 
                            className="text-sm font-bold text-[var(--text-main)] cursor-pointer group-hover:text-[var(--accent)] transition-colors"
                            onClick={() => onTaskClick(task.task_id)}
                          >
                            {task.task_title}
                          </div>
                          <div className="text-xs text-[var(--text-muted)] mt-0.5">{task.task_type}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-2">
                      {task.project_name ? (
                        <div className="text-xs font-bold px-2 py-1 bg-[var(--bg-workspace)] border border-[var(--border-color)] rounded inline-block text-[var(--text-secondary)]">
                          {task.project_code}
                        </div>
                      ) : (
                        <span className="text-xs text-[var(--text-muted)]">-</span>
                      )}
                    </td>
                    <td className="px-4 py-2">
                      {task.assignee_id ? (
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full overflow-hidden bg-[var(--bg-workspace)] flex items-center justify-center border border-[var(--border-color)]">
                            {task.assignee_image ? (
                               <img src={task.assignee_image.startsWith('http') ? task.assignee_image : `${import.meta.env.VITE_API_BASE_URL?.replace(/\/api$/, '') || 'http://localhost:3000'}${task.assignee_image}`} alt={task.assignee_name} className="w-full h-full object-cover" />
                            ) : (
                               <span className="text-[9px] font-black text-[var(--accent)]">{task.assignee_name.substring(0,2).toUpperCase()}</span>
                            )}
                          </div>
                          <span className="text-xs font-semibold text-[var(--text-main)]">{task.assignee_name}</span>
                        </div>
                      ) : (
                        <span className="text-xs text-[var(--text-muted)] italic">Unassigned</span>
                      )}
                    </td>
                    <td className="px-4 py-2">
                      <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold ${Status.bg} ${Status.color}`}>
                        <SIcon size={12} />
                        {Status.label}
                      </div>
                    </td>
                    <td className="px-4 py-2">
                      <div className="flex items-center gap-1.5 text-xs font-bold">
                        <PIcon size={14} className={Priority.color} />
                        <span className={Priority.color}>{Priority.label}</span>
                      </div>
                    </td>
                    <td className="px-4 py-2">
                      {task.due_date ? (
                        <span className={`text-xs font-bold ${new Date(task.due_date) < new Date() && task.status !== 'Completed' ? 'text-rose-500' : 'text-[var(--text-main)]'}`}>
                          {format(new Date(task.due_date), 'MMM d, yyyy')}
                        </span>
                      ) : (
                        <span className="text-xs text-[var(--text-muted)]">-</span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-right">
                      <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => onTaskClick(task.task_id)}
                          className="p-1.5 text-[var(--text-muted)] hover:text-[var(--accent)] hover:bg-[var(--accent)]/10 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button 
                          onClick={() => onDelete(task.task_id)}
                          className="p-1.5 text-[var(--text-muted)] hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default TaskList;
