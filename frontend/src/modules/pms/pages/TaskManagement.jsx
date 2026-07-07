import React, { useState, useEffect } from 'react';
import { 
  KanbanSquare, List, Plus, Search, Filter,
  CheckCircle2, AlertCircle, Clock, LayoutDashboard, Loader2, ListTodo
} from 'lucide-react';
import toast from 'react-hot-toast';
import { getTasks, getTaskMetrics, updateTaskStatus, deleteTask } from '../../../api/pms';
import TaskBoard from '../components/task/TaskBoard';
import TaskList from '../components/task/TaskList';
import TaskModal from '../components/task/TaskModal';
import BacklogGrooming from '../components/task/BacklogGrooming';
import Swal from 'sweetalert2';

const TaskManagement = () => {
  const [view, setView] = useState('kanban'); // 'kanban' | 'list'
  const [tasks, setTasks] = useState([]);
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [filterAssignee, setFilterAssignee] = useState('');
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState(null);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const res = await getTasks({ 
          search, 
          status: filterStatus, 
          priority: filterPriority, 
          assignee_id: filterAssignee 
      });
      if (res.data?.success) {
        setTasks(res.data.data);
      }
    } catch (err) {
      toast.error('Failed to load tasks');
    } finally {
      setLoading(false);
    }
  };

  const fetchMetrics = async () => {
    try {
      const res = await getTaskMetrics();
      if (res.data?.success) {
        setMetrics(res.data.data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchTasks();
    fetchMetrics();
  }, [search, filterStatus, filterPriority, filterAssignee]);

  const handleStatusChange = async (taskId, newStatus) => {
    try {
      const res = await updateTaskStatus(taskId, newStatus);
      if (res.data?.success) {
        toast.success('Task status updated');
        fetchTasks();
        fetchMetrics();
      }
    } catch (err) {
      toast.error('Failed to update task status');
      fetchTasks(); // revert optimism
    }
  };

  const handleDeleteTask = async (taskId) => {
    const result = await Swal.fire({
      title: 'Delete Task?',
      text: "This action cannot be undone.",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: 'var(--bg-workspace)',
      confirmButtonText: 'Yes, delete it!'
    });
    
    if (result.isConfirmed) {
      try {
        await deleteTask(taskId);
        toast.success('Task deleted');
        fetchTasks();
        fetchMetrics();
      } catch (err) {
        toast.error('Failed to delete task');
      }
    }
  };

  const openTaskModal = (taskId = null) => {
    setSelectedTaskId(taskId);
    setIsModalOpen(true);
  };

  return (
    <div className="flex flex-col gap-4 h-[calc(100vh-100px)] pt-4">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-2">
        <div className="flex items-center gap-5">
          <div className="p-3 md:p-4 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl shadow-sm group animate-float">
            <ListTodo size={24} className="md:w-[28px] md:h-[28px] text-[var(--accent)] group-hover:scale-110 transition-transform duration-300" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-black text-[var(--text-main)] tracking-tight leading-none">
              Task Management
            </h1>
            <p className="text-[13px] text-[var(--text-muted)] font-medium mt-2">
              Manage, track, and assign internal work
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <button 
            onClick={() => openTaskModal()}
            className="btn-primary shadow-lg px-6 py-2.5 group flex items-center gap-2 rounded-xl bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)] transition-all"
          >
            <Plus size={16} strokeWidth={3} className="group-hover:rotate-90 transition-transform duration-300" />
            <span className="text-[12px] font-black uppercase tracking-widest">Create Task</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <KPICard title="Total Tasks" value={metrics?.totalTasks || 0} icon={LayoutDashboard} color="var(--accent)" />
        <KPICard title="My Tasks" value={metrics?.myTasks || 0} icon={List} color="#3b82f6" />
        <KPICard title="Completed" value={metrics?.completedTasks || 0} icon={CheckCircle2} color="#10b981" />
        <KPICard title="Due Today" value={metrics?.tasksDueToday || 0} icon={Clock} color="#f59e0b" />
        <KPICard title="Overdue" value={metrics?.overdueTasks || 0} icon={AlertCircle} color="#ef4444" />
      </div>

      {/* Toolbar */}
      <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] p-2 md:p-2 flex flex-col xl:flex-row items-start xl:items-center justify-between gap-3 shadow-sm z-10 relative">
        <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto">
          <div className="relative flex-1 min-w-[200px] xl:max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] w-4 h-4" />
            <input 
              type="text" 
              placeholder="Search tasks..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-[var(--bg-workspace)] border border-[var(--border-color)] rounded-lg text-xs text-[var(--text-main)] focus:border-[var(--accent)] focus:outline-none transition-colors"
            />
          </div>
          
          <select 
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-1.5 bg-[var(--bg-workspace)] border border-[var(--border-color)] rounded-lg text-xs font-medium text-[var(--text-main)] focus:border-[var(--accent)] focus:outline-none transition-colors appearance-none cursor-pointer"
          >
            <option value="">All Statuses</option>
            <option value="Backlog">Backlog</option>
            <option value="To Do">To Do</option>
            <option value="In Progress">In Progress</option>
            <option value="Code Review">Code Review</option>
            <option value="Testing">Testing</option>
            <option value="Completed">Completed</option>
          </select>

          <select 
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value)}
            className="px-3 py-1.5 bg-[var(--bg-workspace)] border border-[var(--border-color)] rounded-lg text-xs font-medium text-[var(--text-main)] focus:border-[var(--accent)] focus:outline-none transition-colors appearance-none cursor-pointer flex-1 min-w-[120px]"
          >
            <option value="">All Priorities</option>
            <option value="Low">Low</option>
            <option value="Medium">Medium</option>
            <option value="High">High</option>
            <option value="Critical">Critical</option>
          </select>
        </div>

        <div className="flex bg-[var(--bg-card)] p-1 rounded-full border border-[var(--border-color)] shadow-sm self-start xl:self-auto shrink-0 overflow-x-auto w-full xl:w-auto">
          <button 
            onClick={() => setView('grooming')}
            className={`px-5 py-1.5 text-xs font-bold uppercase tracking-wider rounded-full flex items-center gap-2 transition-all whitespace-nowrap ${view === 'grooming' ? 'bg-[#333] text-white shadow-sm' : 'text-[var(--text-muted)] hover:text-[var(--text-main)] bg-transparent'}`}
          >
            Grooming
          </button>
          <button 
            onClick={() => setView('kanban')}
            className={`px-5 py-1.5 text-xs font-bold uppercase tracking-wider rounded-full flex items-center gap-2 transition-all whitespace-nowrap ${view === 'kanban' ? 'bg-[#333] text-white shadow-sm' : 'text-[var(--text-muted)] hover:text-[var(--text-main)] bg-transparent'}`}
          >
            <KanbanSquare size={16} strokeWidth={2.5} /> Board
          </button>
          <button 
            onClick={() => setView('list')}
            className={`px-5 py-1.5 text-xs font-bold uppercase tracking-wider rounded-full flex items-center gap-2 transition-all whitespace-nowrap ${view === 'list' ? 'bg-[#333] text-white shadow-sm' : 'text-[var(--text-muted)] hover:text-[var(--text-main)] bg-transparent'}`}
          >
            <List size={16} strokeWidth={2.5} /> List
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-300">
        {loading ? (
          <div className="h-full flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-[var(--accent)] animate-spin" />
          </div>
        ) : (
          view === 'grooming' ? (
            <BacklogGrooming 
              onTaskClick={openTaskModal}
            />
          ) : view === 'kanban' ? (
            <TaskBoard 
              tasks={tasks} 
              onStatusChange={handleStatusChange} 
              onTaskClick={openTaskModal}
            />
          ) : (
            <TaskList 
              tasks={tasks} 
              onTaskClick={openTaskModal}
              onDelete={handleDeleteTask}
            />
          )
        )}
      </div>

      {isModalOpen && (
        <TaskModal 
          taskId={selectedTaskId} 
          onClose={() => { setIsModalOpen(false); setSelectedTaskId(null); }}
          onSaved={() => { fetchTasks(); fetchMetrics(); }}
        />
      )}
    </div>
  );
};

const KPICard = ({ title, value, icon: Icon, color }) => (
  <div className="bg-[var(--bg-card)] rounded-xl p-3 border border-[var(--border-color)] shadow-sm flex items-center justify-between hover:-translate-y-0.5 transition-transform cursor-default">
    <div>
      <span className="text-[9px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">{title}</span>
      <div className="text-lg font-black leading-none mt-1" style={{ color: 'var(--text-main)' }}>
        {value}
      </div>
    </div>
    <div className="p-1.5 rounded-lg shrink-0" style={{ backgroundColor: `${color}15`, color }}>
      <Icon size={14} strokeWidth={2.5} />
    </div>
  </div>
);

export default TaskManagement;
