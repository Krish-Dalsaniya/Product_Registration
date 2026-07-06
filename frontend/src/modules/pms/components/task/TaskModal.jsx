import React, { useState, useEffect } from 'react';
import { X, Save, Clock, MessageSquare, Paperclip, Loader2, Link as LinkIcon, History, Tag, Activity, CheckSquare, ListTodo, Plus } from 'lucide-react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { useAuth } from '../../../../context/AuthContext';
import { getTaskById, createTask, updateTask, getTaskComments, addTaskComment, getTaskTimeLogs, addTaskTimeLog, getTaskActivityLogs, getTaskSubtasks } from '../../../../api/pms';
import { getProjects, getProjectSprints, getProjectEpics } from '../../../../api/pms';
import { getUsers, getTeams } from '../../../../api/admin';
import { TASK_STATUSES, TASK_PRIORITIES, TASK_TYPES } from '../../utils/taskConstants';
import { format } from 'date-fns';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';

const TaskModal = ({ taskId, onClose, onSaved }) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('details'); // details, comments, time, history
  const [loading, setLoading] = useState(false);
  
  // Data sources
  const [projects, setProjects] = useState([]);
  const [teams, setTeams] = useState([]);
  const [users, setUsers] = useState([]);
  const [sprints, setSprints] = useState([]);
  const [epics, setEpics] = useState([]);

  // Task related data
  const [subtasks, setSubtasks] = useState([]);
  const [comments, setComments] = useState([]);
  const [timeLogs, setTimeLogs] = useState([]);
  const [activityLogs, setActivityLogs] = useState([]);

  // Tags state
  const [tagInput, setTagInput] = useState('');

  const { register, handleSubmit, reset, formState: { errors }, watch, setValue } = useForm({
    defaultValues: {
      task_title: '',
      task_description: '',
      task_type: 'Task',
      priority: 'Medium',
      status: 'Backlog',
      project_id: '',
      team_id: '',
      assignee_id: '',
      start_date: '',
      due_date: '',
      estimated_hours: 0,
      remaining_hours: 0,
      actual_logged_hours: 0,
      tags: [],
      sprint_id: '',
      epic_id: '',
      story_points: 0
    }
  });

  const currentTags = watch('tags') || [];
  const watchedProjectId = watch('project_id');

  useEffect(() => {
    fetchFormData();
    if (taskId) {
      fetchTaskData();
    }
  }, [taskId]);

  useEffect(() => {
    if (watchedProjectId) {
      getProjectSprints({ project_id: watchedProjectId })
        .then(res => { if (res.data?.success) setSprints(res.data.data); })
        .catch(err => console.error(err));
      
      getProjectEpics({ project_id: watchedProjectId })
        .then(res => { if (res.data?.success) setEpics(res.data.data); })
        .catch(err => console.error(err));
    } else {
      setSprints([]);
      setEpics([]);
    }
  }, [watchedProjectId]);

  const fetchFormData = async () => {
    try {
      const [projRes, teamRes, userRes] = await Promise.all([
        getProjects(),
        getTeams(),
        getUsers({ limit: 1000 })
      ]);
      if (projRes.data?.success) setProjects(projRes.data.data);
      if (teamRes.data?.success) setTeams(teamRes.data.data);
      if (userRes.data?.success) setUsers(userRes.data.data);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load form data');
    }
  };

  const fetchTaskData = async () => {
    try {
      setLoading(true);
      const [taskRes, commentsRes, logsRes, activityRes, subtasksRes] = await Promise.all([
        getTaskById(taskId),
        getTaskComments(taskId),
        getTaskTimeLogs(taskId),
        getTaskActivityLogs(taskId),
        getTaskSubtasks(taskId)
      ]);

      if (taskRes.data?.success) {
        const task = taskRes.data.data;
        reset({
          ...task,
          project_id: task.project_id || '',
          team_id: task.team_id || '',
          assignee_id: task.assignee_id || '',
          start_date: task.start_date ? new Date(task.start_date).toISOString().split('T')[0] : '',
          due_date: task.due_date ? new Date(task.due_date).toISOString().split('T')[0] : '',
          tags: Array.isArray(task.tags) ? task.tags : [],
          sprint_id: task.sprint_id || '',
          epic_id: task.epic_id || '',
          story_points: task.story_points || 0
        });
      }
      if (commentsRes.data?.success) setComments(commentsRes.data.data);
      if (logsRes.data?.success) setTimeLogs(logsRes.data.data);
      if (activityRes.data?.success) setActivityLogs(activityRes.data.data);
      if (subtasksRes.data?.success) setSubtasks(subtasksRes.data.data);
    } catch (err) {
      toast.error('Failed to load task details');
      onClose();
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data) => {
    try {
      setLoading(true);
      const payload = {
        ...data,
        project_id: data.project_id || null,
        team_id: data.team_id || null,
        assignee_id: data.assignee_id || null,
        sprint_id: data.sprint_id || null,
        epic_id: data.epic_id || null
      };

      if (taskId) {
        await updateTask(taskId, payload);
        toast.success('Task updated');
      } else {
        await createTask(payload);
        toast.success('Task created');
      }
      onSaved();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Failed to save task');
    } finally {
      setLoading(false);
    }
  };

  // Subtasks
  const handleAddSubtask = async (e) => {
    e.preventDefault();
    const title = e.target.subtask_title.value.trim();
    if (!title) return;
    
    try {
      const payload = {
        task_title: title,
        project_id: watchedProjectId || null,
        parent_task_id: taskId,
        status: 'Backlog',
        task_type: 'Task'
      };
      const res = await createTask(payload);
      if (res.data?.success) {
        toast.success('Sub-task added');
        e.target.reset();
        const subRes = await getTaskSubtasks(taskId);
        if (subRes.data?.success) setSubtasks(subRes.data.data);
      }
    } catch (err) {
      toast.error('Failed to add sub-task');
    }
  };

  // Comments
  const [commentText, setCommentText] = useState('');
  const handleAddComment = async () => {
    // Check if empty or just empty html tags
    const plainText = commentText.replace(/<[^>]+>/g, '').trim();
    if (!plainText) return;

    try {
      await addTaskComment(taskId, { comment_text: commentText });
      setCommentText('');
      const [resComments, resActivity] = await Promise.all([
        getTaskComments(taskId),
        getTaskActivityLogs(taskId)
      ]);
      if (resComments.data?.success) setComments(resComments.data.data);
      if (resActivity.data?.success) setActivityLogs(resActivity.data.data);
    } catch (err) {
      toast.error('Failed to add comment');
    }
  };

  // Time logs
  const [timeLogHours, setTimeLogHours] = useState('');
  const [timeLogDate, setTimeLogDate] = useState(new Date().toISOString().split('T')[0]);
  const [timeLogDescription, setTimeLogDescription] = useState('');
  const handleAddTimeLog = async () => {
    if (!timeLogHours || !timeLogDate) return;
    if (parseFloat(timeLogHours) <= 0) {
      toast.error('Hours must be greater than 0');
      return;
    }
    try {
      await addTaskTimeLog(taskId, { hours_logged: timeLogHours, log_date: timeLogDate, description: timeLogDescription });
      setTimeLogHours('');
      setTimeLogDescription('');
      const [logsRes, taskRes, actRes] = await Promise.all([
        getTaskTimeLogs(taskId), 
        getTaskById(taskId),
        getTaskActivityLogs(taskId)
      ]);
      if (logsRes.data?.success) setTimeLogs(logsRes.data.data);
      if (actRes.data?.success) setActivityLogs(actRes.data.data);
      if (taskRes.data?.success) {
        reset((formValues) => ({
          ...formValues,
          remaining_hours: taskRes.data.data.remaining_hours,
          actual_logged_hours: taskRes.data.data.actual_logged_hours
        }));
      }
      toast.success('Time logged');
    } catch (err) {
      toast.error('Failed to log time');
    }
  };

  // Tags
  const handleAddTag = (e) => {
    if (e.key === 'Enter' && tagInput.trim()) {
      e.preventDefault();
      const newTag = tagInput.trim().toLowerCase();
      if (!currentTags.includes(newTag)) {
        setValue('tags', [...currentTags, newTag], { shouldDirty: true });
      }
      setTagInput('');
    }
  };
  const removeTag = (tagToRemove) => {
    setValue('tags', currentTags.filter(t => t !== tagToRemove), { shouldDirty: true });
  };

  // Quill config
  const modules = {
    toolbar: [
      ['bold', 'italic', 'underline', 'strike'],
      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
      ['link', 'code-block'],
      ['clean']
    ]
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[var(--bg-card)] rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col border border-[var(--border-color)] overflow-hidden">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-[var(--border-color)] flex justify-between items-center bg-[var(--bg-workspace)]">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-black tracking-tight text-[var(--text-main)]">
              {taskId ? 'Edit Task' : 'Create New Task'}
            </h2>
            {taskId && (
              <span className="text-[10px] font-bold text-[var(--text-muted)] bg-[var(--bg-card)] px-2 py-1 rounded border border-[var(--border-color)] uppercase tracking-wider">
                ID: {taskId.split('-')[0]}
              </span>
            )}
          </div>
          <button onClick={onClose} className="p-2 text-[var(--text-muted)] hover:text-rose-500 hover:bg-rose-500/10 rounded-xl transition-colors">
            <X size={20} strokeWidth={3} />
          </button>
        </div>

        {/* Tabs */}
        {taskId && (
          <div className="flex px-6 border-b border-[var(--border-color)] bg-[var(--bg-workspace)]">
            <TabButton active={activeTab === 'details'} onClick={() => setActiveTab('details')}>Details</TabButton>
            <TabButton active={activeTab === 'subtasks'} onClick={() => setActiveTab('subtasks')}>
              <ListTodo size={14} className="mr-1.5" /> Sub-tasks ({subtasks.length})
            </TabButton>
            <TabButton active={activeTab === 'comments'} onClick={() => setActiveTab('comments')}>
              <MessageSquare size={14} className="mr-1.5" /> Comments ({comments.length})
            </TabButton>
            <TabButton active={activeTab === 'time'} onClick={() => setActiveTab('time')}>
              <Clock size={14} className="mr-1.5" /> Time Logs
            </TabButton>
            <TabButton active={activeTab === 'history'} onClick={() => setActiveTab('history')}>
              <History size={14} className="mr-1.5" /> Activity History
            </TabButton>
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 bg-[var(--bg-card)]">
          {loading ? (
            <div className="h-full flex items-center justify-center">
              <Loader2 className="w-8 h-8 text-[var(--accent)] animate-spin" />
            </div>
          ) : (
            <>
              {activeTab === 'details' && (
                <form id="task-form" onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                  {/* Title */}
                  <div>
                    <input 
                      type="text" 
                      {...register('task_title', { required: 'Title is required' })}
                      className={`w-full px-4 py-3 bg-[var(--bg-workspace)] border rounded-xl text-lg font-black tracking-tight text-[var(--text-main)] transition-colors placeholder:text-[var(--text-muted)] ${errors.task_title ? 'border-rose-500 focus:border-rose-500' : 'border-[var(--border-color)] focus:border-[var(--accent)]'}`}
                      placeholder="Task Title *"
                    />
                    {errors.task_title && <p className="text-rose-500 text-xs mt-1">{errors.task_title.message}</p>}
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Main Content Area */}
                    <div className="lg:col-span-2 space-y-6">
                      
                      {/* Rich Text Description */}
                      <div className="border border-[var(--border-color)] rounded-xl overflow-hidden bg-[var(--bg-workspace)]">
                        <div className="px-4 py-2 bg-[var(--bg-workspace)] border-b border-[var(--border-color)] text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider">
                          Description
                        </div>
                        <div className="bg-[var(--bg-workspace)]">
                          <ReactQuill 
                            theme="snow"
                            value={watch('task_description')}
                            onChange={(content) => setValue('task_description', content, { shouldDirty: true })}
                            modules={modules}
                            className="bg-[var(--bg-workspace)] text-[var(--text-main)] border-none h-48 md:h-64 custom-quill"
                            placeholder="Add rich formatting, code snippets, and lists to your description..."
                          />
                        </div>
                      </div>

                      {/* Dynamic Tags UI */}
                      <div className="bg-[var(--bg-workspace)] p-4 rounded-xl border border-[var(--border-color)]">
                        <label className="block text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-3 flex items-center gap-1.5"><Tag size={12}/> Tags</label>
                        <div className="flex flex-wrap gap-2 items-center">
                          {currentTags.map(tag => (
                            <span key={tag} className="flex items-center gap-1 bg-[var(--accent)]/10 text-[var(--accent)] border border-[var(--accent)]/20 px-2.5 py-1 rounded-md text-xs font-bold">
                              #{tag}
                              <button type="button" onClick={() => removeTag(tag)} className="hover:text-rose-500 hover:bg-rose-500/10 rounded-full p-0.5 ml-1 transition-colors">
                                <X size={10} />
                              </button>
                            </span>
                          ))}
                          <input 
                            type="text" 
                            placeholder="Type a tag and press Enter" 
                            value={tagInput}
                            onChange={(e) => setTagInput(e.target.value)}
                            onKeyDown={handleAddTag}
                            className="bg-transparent border-none focus:outline-none text-sm text-[var(--text-main)] min-w-[150px]"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2">Project Linking</label>
                          <select {...register('project_id')} className="w-full px-4 py-2 bg-[var(--bg-workspace)] border border-[var(--border-color)] rounded-xl text-sm font-medium focus:border-[var(--accent)] transition-colors">
                            <option value="">No Project Assigned</option>
                            {projects.map(p => <option key={p.project_id} value={p.project_id}>{p.project_code} - {p.project_name}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2">Sprint Assignment</label>
                          <select {...register('sprint_id')} disabled={!watchedProjectId} className="w-full px-4 py-2 bg-[var(--bg-workspace)] border border-[var(--border-color)] rounded-xl text-sm font-medium focus:border-[var(--accent)] transition-colors disabled:opacity-50">
                            <option value="">Backlog (No Sprint)</option>
                            {sprints.map(s => <option key={s.sprint_id} value={s.sprint_id}>{s.sprint_name}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2">Epic Assignment</label>
                          <select {...register('epic_id')} disabled={!watchedProjectId} className="w-full px-4 py-2 bg-[var(--bg-workspace)] border border-[var(--border-color)] rounded-xl text-sm font-medium focus:border-[var(--accent)] transition-colors disabled:opacity-50">
                            <option value="">No Epic</option>
                            {epics.map(e => <option key={e.epic_id} value={e.epic_id}>{e.name}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2">Team Assignment</label>
                          <select {...register('team_id')} className="w-full px-4 py-2 bg-[var(--bg-workspace)] border border-[var(--border-color)] rounded-xl text-sm font-medium focus:border-[var(--accent)] transition-colors">
                            <option value="">No Team Assigned</option>
                            {teams.map(t => <option key={t.team_id} value={t.team_id}>{t.team_name}</option>)}
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* Sidebar Configuration */}
                    <div className="space-y-5 bg-[var(--bg-workspace)] p-5 rounded-2xl border border-[var(--border-color)] h-max">
                      
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1.5">Status</label>
                          <select {...register('status')} className="w-full px-3 py-2 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg text-sm font-bold shadow-sm cursor-pointer">
                            {TASK_STATUSES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1.5">Priority</label>
                          <select {...register('priority')} className="w-full px-3 py-2 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg text-sm font-bold shadow-sm cursor-pointer">
                            {TASK_PRIORITIES.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1.5">Task Type</label>
                        <select {...register('task_type')} className="w-full px-3 py-2 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg text-sm font-bold shadow-sm cursor-pointer">
                          {TASK_TYPES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                        </select>
                      </div>

                      <hr className="border-[var(--border-color)] my-2"/>

                      <div>
                        <label className="block text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1.5">Assignee</label>
                        <select {...register('assignee_id')} className="w-full px-3 py-2 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg text-sm font-medium shadow-sm cursor-pointer">
                          <option value="">Unassigned</option>
                          {users.map(u => <option key={u.user_id} value={u.user_id}>{u.full_name}</option>)}
                        </select>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1.5">Start Date</label>
                          <input type="date" {...register('start_date')} className="w-full px-2 py-2 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg text-xs font-medium shadow-sm cursor-text" />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1.5">Due Date</label>
                          <input type="date" {...register('due_date')} className="w-full px-2 py-2 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg text-xs font-medium shadow-sm cursor-text" />
                        </div>
                      </div>

                      <hr className="border-[var(--border-color)] my-2"/>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1.5">Story Points</label>
                          <input type="number" min="0" {...register('story_points')} className="w-full px-3 py-2 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg text-sm font-black text-[var(--accent)] shadow-sm" />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1.5">Estimated (Hours)</label>
                          <input type="number" step="0.5" min="0" {...register('estimated_hours')} className="w-full px-3 py-2 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg text-sm font-black text-[var(--text-main)] shadow-sm" />
                        </div>
                      </div>
                    </div>
                  </div>
                </form>
              )}

              {activeTab === 'subtasks' && (
                <div className="flex flex-col h-full">
                  <div className="mb-4">
                    <h3 className="font-bold text-[var(--text-main)] mb-1">Sub-tasks</h3>
                    <p className="text-sm text-[var(--text-muted)] font-medium">Break down this task into smaller chunks.</p>
                  </div>

                  <div className="flex-1 overflow-y-auto mb-4 space-y-2 custom-scrollbar pr-2">
                    {subtasks.length === 0 ? (
                      <div className="text-center py-8 text-[var(--text-muted)] font-medium text-sm border-2 border-dashed border-[var(--border-color)] rounded-xl">
                        No sub-tasks created yet.
                      </div>
                    ) : (
                      subtasks.map(sub => (
                        <div key={sub.task_id} className="flex items-center justify-between p-3 bg-[var(--bg-workspace)] border border-[var(--border-color)] rounded-xl group hover:border-[var(--accent)] transition-colors">
                          <div className="flex items-center gap-3">
                            <div className={`w-4 h-4 rounded flex items-center justify-center border ${sub.status === 'Completed' ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-[var(--text-muted)] bg-white'}`}>
                              {sub.status === 'Completed' && <CheckSquare size={12} />}
                            </div>
                            <span className={`text-sm font-bold ${sub.status === 'Completed' ? 'line-through text-[var(--text-muted)]' : 'text-[var(--text-main)]'}`}>
                              {sub.task_title}
                            </span>
                          </div>
                          <span className="text-[10px] font-black uppercase px-2 py-1 bg-[var(--bg-card)] rounded-md border border-[var(--border-color)] text-[var(--text-muted)]">
                            {sub.status}
                          </span>
                        </div>
                      ))
                    )}
                  </div>

                  <form onSubmit={handleAddSubtask} className="mt-auto">
                    <div className="relative flex items-center">
                      <input 
                        type="text" 
                        name="subtask_title"
                        placeholder="Add a new sub-task..." 
                        className="w-full pl-4 pr-12 py-3 bg-[var(--bg-workspace)] border border-[var(--border-color)] rounded-xl text-sm focus:border-[var(--accent)]"
                      />
                      <button type="submit" className="absolute right-2 p-1.5 bg-[var(--accent)] text-white rounded-lg hover:bg-[var(--accent-hover)] transition-colors">
                        <Plus size={16} />
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {activeTab === 'comments' && (
                <div className="flex flex-col h-full space-y-4">
                  <div className="flex-1 overflow-y-auto space-y-4 pr-2">
                    {comments.length === 0 ? (
                      <div className="text-center py-12 flex flex-col items-center">
                        <MessageSquare size={32} className="text-[var(--text-muted)] mb-3 opacity-50" />
                        <p className="text-[var(--text-muted)] font-medium">No discussions yet. Start the conversation!</p>
                      </div>
                    ) : (
                      comments.map(c => (
                        <div key={c.comment_id} className="flex gap-4">
                          <div className="w-10 h-10 rounded-full bg-[var(--bg-card)] border border-[var(--border-color)] flex items-center justify-center overflow-hidden flex-shrink-0 shadow-sm mt-1">
                            {c.author_image ? (
                              <img src={c.author_image.startsWith('http') ? c.author_image : `${import.meta.env.VITE_API_BASE_URL?.replace(/\/api$/, '') || 'http://localhost:3000'}${c.author_image}`} alt={c.author_name} className="w-full h-full object-cover" />
                            ) : (
                              <span className="text-[12px] font-black text-[var(--accent)]">{c.author_name.substring(0,2).toUpperCase()}</span>
                            )}
                          </div>
                          <div className="flex-1">
                            <div className="bg-[var(--bg-workspace)] border border-[var(--border-color)] rounded-2xl rounded-tl-sm p-4 shadow-sm">
                              <div className="flex items-baseline justify-between mb-2">
                                <span className="font-black text-[var(--text-main)] text-sm">{c.author_name}</span>
                                <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">{format(new Date(c.created_at), 'MMM d, h:mm a')}</span>
                              </div>
                              {/* Render Rich Text securely */}
                              <div className="text-sm text-[var(--text-secondary)] prose prose-sm dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: c.comment_text }} />
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                  
                  {/* Rich Text Comment Input */}
                  <div className="border border-[var(--border-color)] rounded-2xl overflow-hidden bg-[var(--bg-workspace)] focus-within:border-[var(--accent)] transition-colors shadow-sm">
                    <ReactQuill 
                      theme="snow"
                      value={commentText}
                      onChange={setCommentText}
                      modules={{ toolbar: [['bold', 'italic', 'underline', 'strike'], ['code-block'], ['clean']] }}
                      className="bg-[var(--bg-workspace)] text-[var(--text-main)] border-none h-24 custom-quill-comment"
                      placeholder="Add a comment... (Markdown supported)"
                    />
                    <div className="px-4 py-2 bg-[var(--bg-card)] border-t border-[var(--border-color)] flex justify-end">
                      <button 
                        onClick={handleAddComment}
                        disabled={!commentText.replace(/<[^>]+>/g, '').trim()}
                        className="px-5 py-1.5 bg-[var(--accent)] text-white rounded-lg font-bold text-sm hover:bg-[var(--accent-hover)] transition-all shadow-md disabled:opacity-50"
                      >
                        Send
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'time' && (
                <div className="flex flex-col h-full space-y-6">
                  {/* Progress Bar */}
                  <div className="bg-[var(--bg-workspace)] p-5 rounded-2xl border border-[var(--border-color)] shadow-sm">
                    <div className="flex justify-between items-end mb-3">
                      <span className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider flex items-center gap-1.5"><Activity size={14}/> Work Progress</span>
                      <span className="text-lg font-black text-[var(--text-main)]">
                        {watch('estimated_hours') > 0 ? Math.min(100, Math.round(((watch('actual_logged_hours') || 0) / watch('estimated_hours')) * 100)) : 0}%
                      </span>
                    </div>
                    <div className="w-full h-4 bg-[var(--bg-card)] rounded-full overflow-hidden border border-[var(--border-color)] shadow-inner">
                      <div 
                        className={`h-full transition-all duration-700 ease-out ${(watch('actual_logged_hours') || 0) > watch('estimated_hours') ? 'bg-rose-500' : 'bg-gradient-to-r from-[var(--accent)] to-blue-400'}`}
                        style={{ width: `${watch('estimated_hours') > 0 ? Math.min(100, ((watch('actual_logged_hours') || 0) / watch('estimated_hours')) * 100) : 0}%` }}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-6 mb-2">
                    <div className="bg-[var(--bg-workspace)] p-4 rounded-2xl border border-[var(--border-color)] text-center shadow-sm relative overflow-hidden">
                      <div className="absolute top-0 right-0 p-2 opacity-10"><Clock size={40}/></div>
                      <div className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1">Estimated</div>
                      <div className="text-3xl font-black text-[var(--text-main)]">{watch('estimated_hours') || 0}h</div>
                    </div>
                    <div className="bg-[var(--bg-workspace)] p-4 rounded-2xl border border-[var(--border-color)] text-center shadow-sm relative overflow-hidden">
                      <div className="absolute top-0 right-0 p-2 opacity-10 text-blue-500"><Save size={40}/></div>
                      <div className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1">Logged</div>
                      <div className="text-3xl font-black text-blue-500">{watch('actual_logged_hours') || 0}h</div>
                    </div>
                    <div className="bg-[var(--bg-workspace)] p-4 rounded-2xl border border-[var(--border-color)] text-center shadow-sm relative overflow-hidden">
                      <div className="absolute top-0 right-0 p-2 opacity-10 text-emerald-500"><Activity size={40}/></div>
                      <div className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1">Remaining</div>
                      <div className={`text-3xl font-black ${watch('remaining_hours') < 0 ? 'text-rose-500' : 'text-emerald-500'}`}>{watch('remaining_hours') || 0}h</div>
                    </div>
                  </div>

                  {/* Add Log Bar */}
                  <div className="flex gap-3 bg-[var(--bg-workspace)] p-4 rounded-2xl border border-[var(--border-color)] flex-wrap shadow-sm focus-within:border-[var(--accent)] transition-colors">
                    <input 
                      type="number" 
                      step="0.5"
                      min="0.1" 
                      placeholder="Hours" 
                      value={timeLogHours}
                      onChange={(e) => setTimeLogHours(e.target.value)}
                      className="w-24 px-4 py-2.5 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl text-sm font-bold focus:border-[var(--accent)] outline-none transition-colors"
                    />
                    <input 
                      type="date" 
                      value={timeLogDate}
                      onChange={(e) => setTimeLogDate(e.target.value)}
                      className="w-40 px-4 py-2.5 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl text-sm font-semibold focus:border-[var(--accent)] outline-none transition-colors"
                    />
                    <input 
                      type="text" 
                      placeholder="What did you work on? (optional)" 
                      value={timeLogDescription}
                      onChange={(e) => setTimeLogDescription(e.target.value)}
                      className="flex-1 min-w-[200px] px-4 py-2.5 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl text-sm focus:border-[var(--accent)] outline-none transition-colors"
                    />
                    <button 
                      onClick={handleAddTimeLog}
                      disabled={!timeLogHours || !timeLogDate}
                      className="px-6 bg-blue-500 text-white rounded-xl font-bold text-sm hover:bg-blue-600 transition-all shadow-md disabled:opacity-50 hover:shadow-lg hover:-translate-y-0.5"
                    >
                      Log Time
                    </button>
                  </div>

                  <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar pr-2 mt-4">
                    {timeLogs.length === 0 ? (
                      <p className="text-center text-[var(--text-muted)] text-sm py-8 font-medium">No time logged yet.</p>
                    ) : (
                      timeLogs.map(l => (
                        <div key={l.log_id} className="flex justify-between items-start bg-[var(--bg-workspace)] p-4 rounded-2xl border border-[var(--border-color)] group hover:border-[var(--accent)] transition-colors shadow-sm">
                          <div className="flex items-start gap-4">
                            <div className="w-10 h-10 mt-0.5 rounded-full bg-[var(--bg-card)] flex items-center justify-center overflow-hidden border border-[var(--border-color)] shadow-sm">
                              {l.logger_image ? (
                                <img src={l.logger_image.startsWith('http') ? l.logger_image : `${import.meta.env.VITE_API_BASE_URL?.replace(/\/api$/, '') || 'http://localhost:3000'}${l.logger_image}`} alt={l.logger_name} className="w-full h-full object-cover" />
                              ) : (
                                <span className="text-[12px] font-black text-[var(--accent)]">{l.logger_name.substring(0,2).toUpperCase()}</span>
                              )}
                            </div>
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-sm font-black text-[var(--text-main)]">{l.logger_name}</span>
                                <span className="text-xs font-bold text-[var(--text-muted)] bg-[var(--bg-card)] px-2 py-0.5 rounded-md border border-[var(--border-color)]">
                                  {format(new Date(l.log_date), 'MMM d, yyyy')}
                                </span>
                              </div>
                              {l.description ? (
                                <p className="text-sm text-[var(--text-secondary)] font-medium leading-relaxed">{l.description}</p>
                              ) : (
                                <p className="text-xs text-[var(--text-muted)] italic">No description provided</p>
                              )}
                            </div>
                          </div>
                          <div className="font-black text-sm text-blue-500 bg-blue-500/10 px-3 py-1.5 rounded-xl border border-blue-500/20">
                            {l.hours_logged}h
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* NEW: Activity History Tab */}
              {activeTab === 'history' && (
                <div className="h-full overflow-y-auto custom-scrollbar pr-2 py-2">
                  {activityLogs.length === 0 ? (
                    <div className="text-center py-12 flex flex-col items-center">
                      <History size={32} className="text-[var(--text-muted)] mb-3 opacity-50" />
                      <p className="text-[var(--text-muted)] font-medium">No activity history yet.</p>
                    </div>
                  ) : (
                    <div className="relative border-l-2 border-[var(--border-color)] ml-6 space-y-8 pb-4">
                      {activityLogs.map((log, index) => {
                        let details = null;
                        try {
                          details = typeof log.details === 'string' ? JSON.parse(log.details) : log.details;
                        } catch(e) {}

                        return (
                          <div key={log.log_id || index} className="relative pl-8">
                            {/* Dot on timeline */}
                            <div className="absolute -left-[9px] top-1.5 w-4 h-4 rounded-full bg-[var(--accent)] border-4 border-[var(--bg-card)] shadow-sm" />
                            
                            <div className="flex items-baseline gap-2 mb-1">
                              <span className="font-black text-[var(--text-main)] text-sm">{log.author_name}</span>
                              <span className="text-sm text-[var(--text-secondary)] font-medium">{log.action}</span>
                              <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider ml-auto bg-[var(--bg-workspace)] px-2 py-0.5 rounded border border-[var(--border-color)]">
                                {format(new Date(log.created_at), 'MMM d, h:mm a')}
                              </span>
                            </div>
                            
                            {/* Contextual Details */}
                            {details && details.old_status && details.new_status && (
                              <div className="mt-2 flex items-center gap-2 text-xs font-bold">
                                <span className="bg-[var(--bg-workspace)] border border-[var(--border-color)] text-[var(--text-muted)] px-2 py-1 rounded">{details.old_status}</span>
                                <span className="text-[var(--text-muted)]">→</span>
                                <span className="bg-[var(--accent)]/10 border border-[var(--accent)]/20 text-[var(--accent)] px-2 py-1 rounded">{details.new_status}</span>
                              </div>
                            )}
                            {details && details.hours && (
                              <div className="mt-2 text-xs font-bold text-blue-500 bg-blue-500/10 border border-blue-500/20 px-2 py-1 rounded w-max">
                                Logged {details.hours} hours
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

            </>
          )}
        </div>

        {/* Footer */}
        {activeTab === 'details' && (
          <div className="px-6 py-4 border-t border-[var(--border-color)] bg-[var(--bg-workspace)] flex justify-end gap-3 shadow-[0_-4px_10px_rgba(0,0,0,0.02)]">
            <button 
              type="button" 
              onClick={onClose}
              className="px-6 py-2.5 bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-main)] text-sm font-bold rounded-xl hover:bg-[var(--border-color)] transition-all"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              form="task-form"
              disabled={loading}
              className="px-6 py-2.5 bg-[var(--accent)] text-white text-sm font-black tracking-wide rounded-xl hover:bg-[var(--accent-hover)] transition-all shadow-lg shadow-[var(--accent)]/20 flex items-center gap-2 hover:-translate-y-0.5"
            >
              {loading ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} strokeWidth={2.5} />}
              {taskId ? 'Save Changes' : 'Create Task'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

const TabButton = ({ active, onClick, children }) => (
  <button
    onClick={onClick}
    className={`px-5 py-4 text-xs font-black tracking-wider uppercase transition-all flex items-center border-b-[3px] ${
      active ? 'text-[var(--accent)] border-[var(--accent)] bg-[var(--bg-card)]' : 'text-[var(--text-muted)] border-transparent hover:text-[var(--text-main)] hover:bg-[var(--bg-card)]/50'
    }`}
  >
    {children}
  </button>
);

export default TaskModal;
