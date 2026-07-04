import { 
  AlertCircle, AlertTriangle, ArrowDown, ArrowUp, ArrowRight,
  Bug, CheckCircle2, Circle, Clock, Loader2, Minus, PlayCircle,
  FileText, Code, TestTube, XCircle, PauseCircle, CheckSquare, Zap, BookOpen, Lightbulb, Users
} from 'lucide-react';

export const TASK_STATUSES = [
  { id: 'Backlog', label: 'Backlog', color: 'text-gray-400', bg: 'bg-gray-400/10', icon: Circle },
  { id: 'To Do', label: 'To Do', color: 'text-slate-400', bg: 'bg-slate-400/10', icon: CheckSquare },
  { id: 'In Progress', label: 'In Progress', color: 'text-blue-500', bg: 'bg-blue-500/10', icon: PlayCircle },
  { id: 'Code Review', label: 'Code Review', color: 'text-indigo-500', bg: 'bg-indigo-500/10', icon: Code },
  { id: 'Testing', label: 'Testing', color: 'text-purple-500', bg: 'bg-purple-500/10', icon: TestTube },
  { id: 'Completed', label: 'Completed', color: 'text-emerald-500', bg: 'bg-emerald-500/10', icon: CheckCircle2 },
  { id: 'Blocked', label: 'Blocked', color: 'text-rose-500', bg: 'bg-rose-500/10', icon: AlertTriangle },
  { id: 'On Hold', label: 'On Hold', color: 'text-amber-500', bg: 'bg-amber-500/10', icon: PauseCircle },
  { id: 'Cancelled', label: 'Cancelled', color: 'text-zinc-500', bg: 'bg-zinc-500/10', icon: XCircle }
];

export const TASK_PRIORITIES = [
  { id: 'Low', label: 'Low', color: 'text-blue-400', icon: ArrowDown },
  { id: 'Medium', label: 'Medium', color: 'text-emerald-500', icon: Minus },
  { id: 'High', label: 'High', color: 'text-amber-500', icon: ArrowUp },
  { id: 'Critical', label: 'Critical', color: 'text-rose-500', icon: AlertCircle }
];

export const TASK_TYPES = [
  { id: 'Task', label: 'Task', icon: CheckSquare, color: 'text-blue-500' },
  { id: 'Bug', label: 'Bug', icon: Bug, color: 'text-rose-500' },
  { id: 'Feature', label: 'Feature', icon: Zap, color: 'text-amber-500' },
  { id: 'Improvement', label: 'Improvement', icon: ArrowUp, color: 'text-emerald-500' },
  { id: 'Story', label: 'Story', icon: BookOpen, color: 'text-purple-500' },
  { id: 'Epic', label: 'Epic', icon: Zap, color: 'text-indigo-500' },
  { id: 'Research', label: 'Research', icon: Lightbulb, color: 'text-cyan-500' },
  { id: 'Documentation', label: 'Documentation', icon: FileText, color: 'text-slate-500' },
  { id: 'Meeting', label: 'Meeting', icon: Users, color: 'text-orange-500' },
  { id: 'Deployment', label: 'Deployment', icon: ArrowRight, color: 'text-teal-500' },
  { id: 'Maintenance', label: 'Maintenance', icon: Loader2, color: 'text-zinc-500' }
];

export const getStatusConfig = (status) => TASK_STATUSES.find(s => s.id === status) || TASK_STATUSES[0];
export const getPriorityConfig = (priority) => TASK_PRIORITIES.find(p => p.id === priority) || TASK_PRIORITIES[1];
export const getTypeConfig = (type) => TASK_TYPES.find(t => t.id === type) || TASK_TYPES[0];
