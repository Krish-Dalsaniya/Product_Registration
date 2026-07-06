import React, { useState, useEffect } from 'react';
import { getPortfolioMetrics } from '../../../../api/pms';
import { Loader2, Activity, Calendar as CalendarIcon, Server, ShieldAlert, ChevronDown, ChevronRight, Filter, Search, ZoomIn } from 'lucide-react';

const PortfolioDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [portfolio, setPortfolio] = useState([]);
  
  // Professional Features State
  const [collapsedProjects, setCollapsedProjects] = useState(new Set());
  const [zoomLevel, setZoomLevel] = useState('months'); // 'weeks', 'months', 'quarters'
  const [healthFilter, setHealthFilter] = useState('All');
  
  // Modal State
  const [selectedItem, setSelectedItem] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    const fetchPortfolio = async () => {
      try {
        const res = await getPortfolioMetrics();
        if (res.data?.success) {
          setPortfolio(res.data.data);
        }
      } catch (error) {
        console.error('Failed to fetch portfolio metrics:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchPortfolio();
  }, []);

  if (loading) {
    return (
      <div className="h-64 flex flex-col items-center justify-center bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl shadow-sm mt-4">
        <Loader2 className="w-8 h-8 text-[var(--accent)] animate-spin mb-4" />
        <p className="text-[12px] font-bold text-[var(--text-muted)] uppercase tracking-widest">Compiling Portfolio Data...</p>
      </div>
    );
  }

  if (portfolio.length === 0) {
    return (
      <div className="h-64 flex flex-col items-center justify-center bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl shadow-sm mt-4">
        <Server className="w-8 h-8 text-[var(--text-muted)] opacity-50 mb-4" />
        <p className="text-[12px] font-bold text-[var(--text-muted)] uppercase tracking-widest">No Active Projects Found</p>
      </div>
    );
  }

  // Calculate timelines
  const minDate = new Date(Math.min(...portfolio.filter(p => p.start_date).map(p => new Date(p.start_date))));
  const maxDate = new Date();
  maxDate.setMonth(maxDate.getMonth() + (zoomLevel === 'quarters' ? 6 : zoomLevel === 'months' ? 3 : 1)); // Adjust buffer by zoom
  
  const totalDays = Math.ceil((maxDate - minDate) / (1000 * 60 * 60 * 24));

  const getPositionStyles = (start, end) => {
    if (!start) return { display: 'none' };
    const startDate = new Date(start);
    const endDate = end ? new Date(end) : new Date();
    
    const startOffset = Math.max(0, (startDate - minDate) / (1000 * 60 * 60 * 24));
    const duration = Math.max(1, (endDate - startDate) / (1000 * 60 * 60 * 24));
    
    const leftPercentage = (startOffset / totalDays) * 100;
    const widthPercentage = (duration / totalDays) * 100;

    return {
      left: `${Math.max(0, leftPercentage)}%`,
      width: `${Math.min(100 - leftPercentage, widthPercentage)}%`,
    };
  };

  const getHealthColor = (project) => {
    if (!project.end_date) return 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20';
    const endDate = new Date(project.end_date);
    const today = new Date();
    
    if (endDate < today) return 'text-rose-500 bg-rose-500/10 border-rose-500/20'; // Red
    if ((endDate - today) / (1000 * 60 * 60 * 24) < 14) return 'text-amber-500 bg-amber-500/10 border-amber-500/20'; // Yellow
    return 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20'; // Green
  };

  const getHealthCategory = (project) => {
    if (!project.end_date) return 'Green';
    const endDate = new Date(project.end_date);
    const today = new Date();
    
    if (endDate < today) return 'Red';
    if ((endDate - today) / (1000 * 60 * 60 * 24) < 14) return 'Yellow';
    return 'Green';
  };

  const toggleProject = (projectId) => {
    setCollapsedProjects(prev => {
      const next = new Set(prev);
      if (next.has(projectId)) next.delete(projectId);
      else next.add(projectId);
      return next;
    });
  };

  // Generate grid markers based on zoom level
  const gridMarkers = [];
  let currMarker = new Date(minDate);
  
  if (zoomLevel === 'weeks') {
    currMarker.setDate(currMarker.getDate() - currMarker.getDay()); // Start of week (Sunday)
    while (currMarker <= maxDate) {
      gridMarkers.push({ date: new Date(currMarker), label: `W${Math.ceil(currMarker.getDate()/7)} ${currMarker.toLocaleString('default', { month: 'short' })}` });
      currMarker.setDate(currMarker.getDate() + 7);
    }
  } else if (zoomLevel === 'months') {
    currMarker = new Date(minDate.getFullYear(), minDate.getMonth(), 1);
    while (currMarker <= maxDate) {
      gridMarkers.push({ date: new Date(currMarker), label: currMarker.toLocaleString('default', { month: 'short', year: 'numeric' }) });
      currMarker.setMonth(currMarker.getMonth() + 1);
    }
  } else if (zoomLevel === 'quarters') {
    const quarterMonth = Math.floor(minDate.getMonth() / 3) * 3;
    currMarker = new Date(minDate.getFullYear(), quarterMonth, 1);
    while (currMarker <= maxDate) {
      gridMarkers.push({ date: new Date(currMarker), label: `Q${Math.floor(currMarker.getMonth()/3)+1} ${currMarker.getFullYear()}` });
      currMarker.setMonth(currMarker.getMonth() + 3);
    }
  }

  const getMarkerPosition = (date) => {
    const offset = (date - minDate) / (1000 * 60 * 60 * 24);
    return Math.max(0, (offset / totalDays) * 100);
  };

  const filteredPortfolio = portfolio.filter(p => {
    if (healthFilter === 'All') return true;
    return getHealthCategory(p) === healthFilter;
  });

  const todayPosition = (() => {
    const today = new Date();
    if (today < minDate || today > maxDate) return null;
    const offset = (today - minDate) / (1000 * 60 * 60 * 24);
    return (offset / totalDays) * 100;
  })();


  return (
    <div className="space-y-6 mt-4 animate-in fade-in duration-500">
      
      {/* Overview KPI & Filters */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-6 shadow-sm col-span-1 md:col-span-1">
           <h3 className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-wider mb-2 flex items-center gap-2"><Activity size={12}/> Active Portfolio Health</h3>
           <div className="flex items-end gap-3">
              <span className="text-4xl font-black text-[var(--text-main)]">{filteredPortfolio.length}</span>
              <span className="text-[12px] font-bold text-[var(--text-muted)] mb-1 uppercase tracking-widest">Projects</span>
           </div>
        </div>
        
        <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-6 shadow-sm col-span-1 md:col-span-3 flex flex-wrap items-center gap-6">
           <div className="flex flex-col gap-2">
             <span className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-wider flex items-center gap-1"><Filter size={12}/> Health Filter</span>
             <div className="flex gap-2">
               {['All', 'Green', 'Yellow', 'Red'].map(f => (
                 <button 
                   key={f}
                   onClick={() => setHealthFilter(f)}
                   className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${healthFilter === f ? 'bg-[var(--accent)] text-white border-[var(--accent)]' : 'bg-[var(--bg-workspace)] text-[var(--text-muted)] border-[var(--border-color)] hover:border-[var(--accent)] hover:text-[var(--text-main)]'}`}
                 >
                   {f === 'All' ? 'All Projects' : f === 'Green' ? 'On Track' : f === 'Yellow' ? 'At Risk' : 'Off Track'}
                 </button>
               ))}
             </div>
           </div>

           <div className="flex flex-col gap-2 ml-auto">
             <span className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-wider flex items-center gap-1"><ZoomIn size={12}/> Zoom Level</span>
             <div className="flex bg-[var(--bg-workspace)] p-1 rounded-lg border border-[var(--border-color)]">
               {['weeks', 'months', 'quarters'].map(z => (
                 <button 
                   key={z}
                   onClick={() => setZoomLevel(z)}
                   className={`px-4 py-1 text-xs font-bold rounded-md transition-all ${zoomLevel === z ? 'bg-[var(--bg-card)] text-[var(--text-main)] shadow-sm' : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'}`}
                 >
                   {z.charAt(0).toUpperCase() + z.slice(1)}
                 </button>
               ))}
             </div>
           </div>
        </div>
      </div>

      {/* Gantt / Timeline Container */}
      <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl shadow-sm overflow-hidden flex flex-col">
        <div className="px-6 py-4 border-b border-[var(--border-color)] bg-[var(--bg-workspace)] flex justify-between items-center">
          <h3 className="text-lg font-black text-[var(--text-main)] tracking-tight">Timeline & Roadmap</h3>
          <span className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest flex items-center gap-2">
            <CalendarIcon size={12}/> {minDate.toLocaleDateString()} - {maxDate.toLocaleDateString()}
          </span>
        </div>
        
        <div className="p-6 overflow-x-auto custom-scrollbar">
          <div className="min-w-[900px]">
            {/* Header / Ruler */}
            <div className="relative h-8 border-b border-[var(--border-color)] mb-4 flex">
              {gridMarkers.map((m, i) => {
                 const left = getMarkerPosition(m.date);
                 return (
                   <div key={i} className="absolute top-0 text-[10px] font-black text-[var(--text-muted)] uppercase tracking-wider pl-1" style={{ left: `${left}%` }}>
                      {m.label}
                   </div>
                 );
              })}
              {todayPosition !== null && (
                <div className="absolute top-0 flex flex-col items-center z-10" style={{ left: `${todayPosition}%`, transform: 'translateX(-50%)' }}>
                   <div className="text-[9px] font-black text-red-500 uppercase tracking-widest bg-red-50 dark:bg-red-900/20 px-1.5 py-0.5 rounded-sm border border-red-200 dark:border-red-800">Today</div>
                </div>
              )}
            </div>

            {/* Projects */}
            {filteredPortfolio.length === 0 ? (
               <div className="flex flex-col items-center justify-center py-12 opacity-50">
                 <ShieldAlert size={32} className="text-[var(--text-muted)] mb-2" />
                 <p className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-widest">No Projects Match Filter</p>
               </div>
            ) : filteredPortfolio.map(p => {
              const isCollapsed = collapsedProjects.has(p.project_id);
              
              return (
              <div key={p.project_id} className="mb-6 border border-[var(--border-color)] rounded-xl bg-[var(--bg-card)] shadow-sm overflow-hidden group/project transition-all hover:shadow-md">
                
                {/* Project Header */}
                <div 
                  className="flex justify-between items-center p-4 bg-[var(--bg-workspace)]/50 border-b border-[var(--border-color)] cursor-pointer hover:bg-[var(--bg-workspace)] transition-colors"
                  onClick={() => toggleProject(p.project_id)}
                >
                  <div className="flex items-center gap-4">
                    <button className="text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors p-1">
                      {isCollapsed ? <ChevronRight size={18} /> : <ChevronDown size={18} />}
                    </button>
                    <div className="w-10 h-10 rounded-xl bg-[var(--bg-card)] border border-[var(--border-color)] flex items-center justify-center shadow-sm">
                       <Server size={18} className="text-[var(--accent)]" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-black text-[var(--text-main)] leading-none">{p.project_name}</h4>
                        <span className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-wider border border-[var(--border-color)] px-1.5 rounded bg-[var(--bg-card)]">{p.project_code}</span>
                      </div>
                      <span className="text-[10px] font-bold text-[var(--text-muted)] mt-1 flex items-center gap-1">
                        <CalendarIcon size={10}/>
                        {p.start_date ? new Date(p.start_date).toLocaleDateString() : 'TBD'} - {p.end_date ? new Date(p.end_date).toLocaleDateString() : 'TBD'}
                      </span>
                    </div>
                  </div>
                  <div className={`px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-widest border flex items-center gap-1.5 shadow-sm ${getHealthColor(p)}`}>
                    <ShieldAlert size={12} />
                    {p.status}
                  </div>
                </div>

                {/* Timeline Grid (Hidden if collapsed) */}
                {!isCollapsed && (
                  <div className="relative bg-[var(--bg-workspace)]/30 border-b border-[var(--border-color)] overflow-visible py-2" style={{ minHeight: '120px' }}>
                    {/* Grid Lines */}
                    {gridMarkers.map((m, i) => (
                      <div key={i} className="absolute top-0 bottom-0 w-px bg-[var(--border-color)] opacity-50" style={{ left: `${getMarkerPosition(m.date)}%` }} />
                    ))}
                    
                    {/* Today Line */}
                    {todayPosition !== null && (
                      <div className="absolute top-0 bottom-0 w-px bg-red-500/50 z-0" style={{ left: `${todayPosition}%` }} />
                    )}

                    {/* Epics Bar */}
                    {p.epics.map((epic, i) => (
                      <div 
                        key={epic.epic_id} 
                        className="absolute top-3 h-7 bg-gradient-to-r from-purple-500/20 to-purple-500/10 border border-purple-500/40 rounded-md shadow-sm transition-all hover:brightness-110 flex items-center px-2 overflow-visible cursor-pointer group/epic z-10 hover:z-50"
                        style={{ ...getPositionStyles(epic.start_date, epic.target_date), minWidth: '50px' }}
                        onClick={() => { setSelectedItem({ type: 'epic', data: epic, project: p }); setIsModalOpen(true); }}
                      >
                        <div className="absolute left-0 bottom-0 top-0 w-1 bg-purple-500 rounded-l-sm" />
                        <span className="text-[10px] font-bold text-purple-700 dark:text-purple-300 truncate uppercase tracking-widest pl-1 drop-shadow-sm">
                          {epic.name}
                        </span>
                        
                        {/* Tooltip */}
                        <div className="absolute hidden group-hover/epic:block bottom-full mb-2 left-1/2 -translate-x-1/2 w-48 bg-[var(--bg-card)] border border-[var(--border-color)] shadow-xl rounded-xl p-3 z-50 animate-in zoom-in-95 duration-200">
                           <div className="text-[9px] font-black text-purple-500 uppercase tracking-widest mb-1">Epic</div>
                           <h5 className="text-[12px] font-bold text-[var(--text-main)] leading-tight mb-2">{epic.name}</h5>
                           <div className="flex justify-between items-center text-[10px] text-[var(--text-muted)] font-medium">
                              <span>Status:</span>
                              <span className="font-bold text-[var(--text-main)]">{epic.status}</span>
                           </div>
                           <div className="flex justify-between items-center text-[10px] text-[var(--text-muted)] font-medium mt-1">
                              <span>Dates:</span>
                              <span className="font-bold text-[var(--text-main)]">{new Date(epic.start_date).toLocaleDateString()} - {new Date(epic.target_date).toLocaleDateString()}</span>
                           </div>
                           <div className="text-[9px] text-[var(--accent)] font-bold text-center mt-3 border-t border-[var(--border-color)] pt-2 opacity-50">Click to view details</div>
                        </div>
                      </div>
                    ))}

                    {/* Sprints Bar */}
                    {p.sprints.map((sprint, i) => (
                      <div 
                        key={sprint.sprint_id} 
                        className="absolute top-14 h-7 bg-gradient-to-r from-blue-500/20 to-blue-500/10 border border-blue-500/40 rounded-md shadow-sm transition-all hover:brightness-110 flex items-center px-2 overflow-visible cursor-pointer group/sprint z-10 hover:z-50"
                        style={{ ...getPositionStyles(sprint.start_date, sprint.end_date), minWidth: '40px' }}
                        onClick={() => { setSelectedItem({ type: 'sprint', data: sprint, project: p }); setIsModalOpen(true); }}
                      >
                        <div className="absolute left-0 bottom-0 top-0 w-1 bg-blue-500 rounded-l-sm" />
                        <span className="text-[10px] font-bold text-blue-700 dark:text-blue-300 truncate uppercase tracking-widest pl-1 drop-shadow-sm">
                          {sprint.sprint_name}
                        </span>
                        
                        {/* Tooltip */}
                        <div className="absolute hidden group-hover/sprint:block bottom-full mb-2 left-1/2 -translate-x-1/2 w-48 bg-[var(--bg-card)] border border-[var(--border-color)] shadow-xl rounded-xl p-3 z-50 animate-in zoom-in-95 duration-200">
                           <div className="text-[9px] font-black text-blue-500 uppercase tracking-widest mb-1">Sprint</div>
                           <h5 className="text-[12px] font-bold text-[var(--text-main)] leading-tight mb-2">{sprint.sprint_name}</h5>
                           <div className="flex justify-between items-center text-[10px] text-[var(--text-muted)] font-medium">
                              <span>Status:</span>
                              <span className="font-bold text-[var(--text-main)]">{sprint.status}</span>
                           </div>
                           <div className="flex justify-between items-center text-[10px] text-[var(--text-muted)] font-medium mt-1">
                              <span>Dates:</span>
                              <span className="font-bold text-[var(--text-main)]">{new Date(sprint.start_date).toLocaleDateString()} - {new Date(sprint.end_date).toLocaleDateString()}</span>
                           </div>
                           <div className="text-[9px] text-[var(--accent)] font-bold text-center mt-3 border-t border-[var(--border-color)] pt-2 opacity-50">Click to view details</div>
                        </div>
                      </div>
                    ))}
                    
                    {p.epics.length === 0 && p.sprints.length === 0 && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-[11px] font-bold text-[var(--text-muted)] italic">No scheduled Epics or Sprints</span>
                      </div>
                    )}
                  </div>
                )}
                
                <div className="flex gap-5 px-4 py-2 bg-[var(--bg-card)]">
                   <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded shadow-sm bg-purple-500"></div><span className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">Epics ({p.epics.length})</span></div>
                   <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded shadow-sm bg-blue-500"></div><span className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">Sprints ({p.sprints.length})</span></div>
                </div>

              </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Detail Modal */}
      {isModalOpen && selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setIsModalOpen(false)}>
          <div 
            className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200"
            onClick={e => e.stopPropagation()}
          >
            <div className={`p-5 border-b border-[var(--border-color)] bg-gradient-to-r ${selectedItem.type === 'epic' ? 'from-purple-500/10 to-transparent' : 'from-blue-500/10 to-transparent'}`}>
              <div className="flex justify-between items-start mb-2">
                <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-md border ${selectedItem.type === 'epic' ? 'text-purple-600 bg-purple-500/10 border-purple-500/20' : 'text-blue-600 bg-blue-500/10 border-blue-500/20'}`}>
                  {selectedItem.type === 'epic' ? 'Epic' : 'Sprint'}
                </span>
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="w-6 h-6 rounded-full bg-[var(--bg-workspace)] flex items-center justify-center text-[var(--text-muted)] hover:text-red-500 hover:bg-red-50 transition-colors"
                >
                  ✕
                </button>
              </div>
              <h2 className="text-xl font-black text-[var(--text-main)] leading-tight mb-1">
                {selectedItem.type === 'epic' ? selectedItem.data.name : selectedItem.data.sprint_name}
              </h2>
              <p className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider">
                {selectedItem.project.project_name} ({selectedItem.project.project_code})
              </p>
            </div>
            
            <div className="p-5 space-y-4 bg-[var(--bg-workspace)]/50">
              <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl p-3 shadow-sm flex items-center gap-3">
                <CalendarIcon size={16} className="text-[var(--accent)]" />
                <div>
                  <div className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">Schedule</div>
                  <div className="text-[13px] font-bold text-[var(--text-main)]">
                    {new Date(selectedItem.data.start_date).toLocaleDateString()} - {new Date(selectedItem.type === 'epic' ? selectedItem.data.target_date : selectedItem.data.end_date).toLocaleDateString()}
                  </div>
                </div>
              </div>
              
              <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl p-3 shadow-sm flex justify-between items-center">
                <div>
                  <div className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">Current Status</div>
                  <div className="text-[13px] font-bold text-[var(--text-main)]">
                    {selectedItem.data.status}
                  </div>
                </div>
                <div className={`px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-widest border shadow-sm ${selectedItem.data.status === 'Completed' ? 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20' : 'text-[var(--text-muted)] bg-[var(--bg-workspace)] border-[var(--border-color)]'}`}>
                   {selectedItem.data.status === 'Completed' ? 'Closed' : 'Active'}
                </div>
              </div>
            </div>
            
            <div className="p-4 border-t border-[var(--border-color)] bg-[var(--bg-card)] flex justify-end">
              <button 
                onClick={() => setIsModalOpen(false)}
                className="px-5 py-2 text-sm font-bold text-white bg-[var(--accent)] hover:bg-[var(--accent-hover)] rounded-xl shadow-sm transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PortfolioDashboard;
