import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import {
  Loader2, User, ChevronDown, ChevronUp, ZoomIn, ZoomOut, Maximize2, Move,
  Plus, X, Search, Pencil, Check, RotateCcw, UserPlus
} from 'lucide-react';
import { fetchHREmployeesApi, updateOrgChartApi } from '../../../api/hr';
import toast from 'react-hot-toast';

// ---- tree building ----------------------------------------------------
const buildTree = (employees, placements) => {
  const byId = {};
  employees.forEach(emp => {
    byId[emp.employee_id] = { ...emp, children: [] };
  });

  const roots = [];

  Object.entries(placements).forEach(([empId, { parentId }]) => {
    const node = byId[empId];
    if (!node) return; // employee may have been deactivated/deleted
    if (parentId && byId[parentId]) {
      byId[parentId].children.push(node);
    } else {
      roots.push(node);
    }
  });

  return roots;
};

// Helper for image url
const getImageUrl = (url) => {
  if (!url) return null;
  return url.startsWith('http') 
    ? url 
    : `${import.meta.env.VITE_API_BASE_URL?.replace(/\/api$/, '') || 'http://localhost:3000'}/${url.startsWith('/') ? url.substring(1) : url}`;
};


// ---- employee picker modal -------------------------------------------
const EmployeePickerModal = ({ candidates, onPick, onClose, title }) => {
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return candidates;
    return candidates.filter(e =>
      (e.full_name || e.name)?.toLowerCase().includes(q) ||
      e.emp_code?.toLowerCase().includes(q) ||
      e.designation_name?.toLowerCase().includes(q)
    );
  }, [candidates, query]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl shadow-xl w-full max-w-md max-h-[70vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-[var(--border-color)]">
          <h3 className="text-sm font-black text-[var(--text-main)]">{title}</h3>
          <button onClick={onClose} className="p-1 rounded-md hover:bg-[var(--bg-workspace)]">
            <X size={16} className="text-[var(--text-muted)]" />
          </button>
        </div>

        <div className="p-3 border-b border-[var(--border-color)]">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search employees..."
              className="w-full pl-8 pr-3 py-2 text-sm rounded-lg bg-[var(--bg-workspace)] border border-[var(--border-color)] text-[var(--text-main)] outline-none focus:border-[var(--accent)]"
            />
          </div>
        </div>

        <div className="overflow-y-auto custom-scrollbar p-2">
          {filtered.length === 0 ? (
            <p className="text-xs text-[var(--text-muted)] text-center py-6">No matching employees</p>
          ) : (
            filtered.map(emp => (
              <button
                key={emp.employee_id}
                onClick={() => onPick(emp.employee_id)}
                className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-[var(--bg-workspace)] text-left"
              >
                <div className="w-8 h-8 rounded-full overflow-hidden bg-[var(--bg-workspace)] border border-[var(--border-color)] flex-shrink-0 flex items-center justify-center">
                  {emp.image_url ? (
                    <img src={getImageUrl(emp.image_url)} alt={emp.full_name || emp.name} className="w-full h-full object-cover" />
                  ) : (
                    <User size={14} className="text-[var(--text-muted)]" />
                  )}
                </div>
                <div className="overflow-hidden">
                  <p className="text-[12px] font-bold text-[var(--text-main)] truncate">{emp.full_name || emp.name}</p>
                  <p className="text-[10px] text-[var(--text-muted)] truncate">{emp.designation_name || 'Employee'} · {emp.emp_code}</p>
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

// ---- node ---------------------------------------------------------------
const OrgNode = ({ node, isRoot = false, editMode, onAddReport, onRemove }) => {
  const hasChildren = node.children && node.children.length > 0;
  const [isOpen, setIsOpen] = useState(false); // Default collapsed
  const childCount = hasChildren ? node.children.length : 0;

  return (
    <li className={`relative text-center list-none transition-all duration-500 org-tree-li ${isRoot ? 'pt-0' : 'pt-5 px-1'} pb-4`}>
      <div className="inline-block relative z-10 group">
        <div className="bg-[var(--bg-card)] border-t-4 border-t-[var(--accent)] border border-[var(--border-color)] rounded-xl shadow-md p-3 min-w-[220px] max-w-[260px] text-left hover:-translate-y-1 transition-transform cursor-default relative">

          {editMode && (
            <div className="absolute -top-2 -right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={() => onAddReport(node.employee_id)}
                title="Add direct report"
                className="bg-[var(--accent)] text-white rounded-full p-1 shadow-md hover:scale-110 transition-transform"
              >
                <Plus size={12} strokeWidth={3} />
              </button>
              <button
                onClick={() => onRemove(node.employee_id)}
                title="Remove from chart"
                className="bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-muted)] rounded-full p-1 shadow-md hover:text-red-500 hover:border-red-400 transition-colors"
              >
                <X size={12} strokeWidth={3} />
              </button>
            </div>
          )}

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full overflow-hidden bg-[var(--bg-workspace)] border-2 border-[var(--border-color)] flex-shrink-0 flex items-center justify-center">
              {node.image_url ? (
                <img src={getImageUrl(node.image_url)} alt={node.full_name || node.name} className="w-full h-full object-cover" />
              ) : (
                <User size={20} className="text-[var(--text-muted)]" />
              )}
            </div>
            <div className="overflow-hidden">
              <h4 className="text-[13px] font-black text-[var(--text-main)] truncate">{node.full_name || node.name}</h4>
              <p className="text-[10px] font-bold text-[var(--text-muted)] truncate">{node.designation_name || 'Employee'}</p>
              <p className="text-[10px] font-medium text-[var(--text-secondary)] mt-0.5 truncate">{node.emp_code}</p>
            </div>
          </div>

          {hasChildren && (
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-full px-2.5 py-0.5 text-[10px] font-bold text-[var(--text-main)] shadow-sm z-20 flex items-center gap-1 hover:border-[var(--accent)] hover:text-[var(--accent)] transition-colors cursor-pointer whitespace-nowrap"
            >
              {childCount} {childCount === 1 ? 'Report' : 'Reports'}
              {isOpen ? <ChevronUp size={12} strokeWidth={3} /> : <ChevronDown size={12} strokeWidth={3} />}
            </button>
          )}
        </div>
      </div>

      {hasChildren && (
        <div
          className="transition-all duration-500 ease-in-out origin-top grid"
          style={{ gridTemplateRows: isOpen ? '1fr' : '0fr', opacity: isOpen ? 1 : 0, pointerEvents: isOpen ? 'auto' : 'none' }}
        >
          <div className="overflow-hidden">
            <ul className="flex justify-center pt-5 relative transition-all duration-500 org-tree-ul">
              {node.children.map(child => (
                <OrgNode
                  key={child.employee_id}
                  node={child}
                  editMode={editMode}
                  onAddReport={onAddReport}
                  onRemove={onRemove}
                />
              ))}
            </ul>
          </div>
        </div>
      )}
    </li>
  );
};

const MIN_SCALE = 0.2;
const MAX_SCALE = 1.5;

const OrganizationChart = () => {
  const [employees, setEmployees] = useState([]);
  const [placements, setPlacements] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);

  // picker modal: null when closed, otherwise 'root' or a parentId string
  const [pickerFor, setPickerFor] = useState(null);

  // zoom / pan state
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);

  const containerRef = useRef(null);
  const contentRef = useRef(null);
  const dragStart = useRef({ x: 0, y: 0, posX: 0, posY: 0 });

  // ---- load employees (flat list, NOT the hierarchy endpoint) ----------
  useEffect(() => {
    const load = async () => {
      try {
        setIsLoading(true);
        const res = await fetchHREmployeesApi();
        const list = res.data?.data || res.data?.employees || [];
        setEmployees(list);

        const placed = {};
        list.forEach(emp => {
          if (emp.org_chart_parent_id) {
            placed[emp.employee_id] = { parentId: emp.org_chart_parent_id };
            if (!placed[emp.org_chart_parent_id]) {
               placed[emp.org_chart_parent_id] = { parentId: null };
            }
          }
        });
        setPlacements(placed);
      } catch (error) {
        toast.error('Failed to load employees');
        console.error(error);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, []);

  const treeData = useMemo(() => buildTree(employees, placements), [employees, placements]);

  const unassigned = useMemo(() => {
    return employees.filter(e => !placements[e.employee_id]);
  }, [employees, placements]);

  // ---- chart editing actions --------------------------------------------
  const handlePick = async (employeeId) => {
    const parentId = pickerFor === 'root' ? null : pickerFor;
    const next = {
      ...placements,
      [employeeId]: { parentId },
    };
    try {
      await updateOrgChartApi(next);
      setPlacements(next);
      setPickerFor(null);
      toast.success('Added to chart');
    } catch (err) {
      console.error(err);
      toast.error('Failed to save changes to database');
    }
  };

  const handleRemove = async (employeeId) => {
    const next = { ...placements };
    const removedParentId = next[employeeId]?.parentId ?? null;
    delete next[employeeId];
    
    Object.keys(next).forEach(id => {
      if (next[id].parentId === employeeId) {
        next[id] = { parentId: removedParentId };
      }
    });

    try {
      await updateOrgChartApi(next);
      setPlacements(next);
      toast.success('Removed from chart');
    } catch (err) {
      console.error(err);
      toast.error('Failed to save changes to database');
    }
  };

  const handleResetChart = async () => {
    if (!window.confirm('Clear the entire chart? Employees will move back to Unassigned.')) return;
    try {
      await updateOrgChartApi({});
      setPlacements({});
      toast.success('Chart reset');
    } catch (err) {
      console.error(err);
      toast.error('Failed to reset chart');
    }
  };

  // ---- zoom / pan (same as before) --------------------------------------
  const fitToScreen = useCallback(() => {
    const container = containerRef.current;
    const content = contentRef.current;
    if (!container || !content) return;
    content.style.transform = 'scale(1)';
    const contentWidth = content.scrollWidth;
    const contentHeight = content.scrollHeight;
    const containerWidth = container.clientWidth - 64;
    const containerHeight = container.clientHeight - 64;
    let nextScale = Math.min(containerWidth / contentWidth, containerHeight / contentHeight, 1);
    nextScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, nextScale));
    setScale(nextScale);
    setPosition({ x: 0, y: 0 });
  }, []);

  useEffect(() => {
    if (!isLoading && treeData.length > 0) {
      const id = requestAnimationFrame(fitToScreen);
      return () => cancelAnimationFrame(id);
    }
  }, [isLoading, treeData, fitToScreen]);

  const handleZoom = (direction) => {
    setScale(prev => {
      const next = direction === 'in' ? prev + 0.1 : prev - 0.1;
      return Math.max(MIN_SCALE, Math.min(MAX_SCALE, next));
    });
  };

  const handleWheel = (e) => {
    if (!e.ctrlKey && !e.metaKey) return;
    e.preventDefault();
    setScale(prev => Math.max(MIN_SCALE, Math.min(MAX_SCALE, prev - e.deltaY * 0.001)));
  };

  const handleMouseDown = (e) => {
    setIsDragging(true);
    dragStart.current = { x: e.clientX, y: e.clientY, posX: position.x, posY: position.y };
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;
    setPosition({ x: dragStart.current.posX + dx, y: dragStart.current.posY + dy });
  };

  const stopDragging = () => setIsDragging(false);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <Loader2 className="animate-spin text-[var(--accent)] w-10 h-10" />
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="w-full h-[calc(100vh-100px)] overflow-hidden relative bg-[var(--bg-workspace)]"
    >
      <style dangerouslySetInnerHTML={{__html: `
        .org-tree-ul::before {
          content: '';
          position: absolute; top: 0; left: 50%;
          border-left: 2px solid var(--border-color);
          width: 0; height: 20px;
          transform: translateX(-1px);
        }
        .org-tree-li::before, .org-tree-li::after {
          content: '';
          position: absolute; top: 0; right: 50%;
          border-top: 2px solid var(--border-color);
          width: 50%; height: 20px;
        }
        .org-tree-li::after {
          right: auto; left: 50%;
          border-left: 2px solid var(--border-color);
        }
        .org-tree-li:only-child::after, .org-tree-li:only-child::before { display: none; }
        .org-tree-li:only-child { padding-top: 0; }
        .org-tree-li:first-child::before, .org-tree-li:last-child::after { border: 0 none; }
        .org-tree-li:last-child::before { border-right: 2px solid var(--border-color); border-radius: 0 10px 0 0; }
        .org-tree-li:first-child::after { border-radius: 10px 0 0 0; }
      `}} />

      {/* Top toolbar */}
      <div className="absolute top-4 left-4 z-30 flex items-center gap-2">
        <button
          onClick={() => setEditMode(prev => !prev)}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-[11px] font-bold shadow-md border transition-colors ${
            editMode
              ? 'bg-[var(--accent)] text-white border-[var(--accent)]'
              : 'bg-[var(--bg-card)] text-[var(--text-main)] border-[var(--border-color)] hover:border-[var(--accent)]'
          }`}
        >
          {editMode ? <Check size={13} /> : <Pencil size={13} />}
          {editMode ? 'Done Editing' : 'Edit Structure'}
        </button>

        {editMode && (
          <>
            <button
              onClick={() => setPickerFor('root')}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[11px] font-bold shadow-md border border-[var(--border-color)] bg-[var(--bg-card)] text-[var(--text-main)] hover:border-[var(--accent)]"
            >
              <UserPlus size={13} /> Add Root
            </button>
            <button
              onClick={handleResetChart}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[11px] font-bold shadow-md border border-[var(--border-color)] bg-[var(--bg-card)] text-[var(--text-muted)] hover:text-red-500 hover:border-red-300"
            >
              <RotateCcw size={13} /> Reset
            </button>
          </>
        )}
      </div>

      {/* Zoom controls */}
      <div className="absolute top-4 right-4 z-30 flex items-center gap-1 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg shadow-md p-1">
        <button onClick={() => handleZoom('out')} className="p-2 rounded-md hover:bg-[var(--bg-workspace)] text-[var(--text-main)]" title="Zoom out">
          <ZoomOut size={16} />
        </button>
        <span className="text-[11px] font-bold text-[var(--text-muted)] w-10 text-center select-none">{Math.round(scale * 100)}%</span>
        <button onClick={() => handleZoom('in')} className="p-2 rounded-md hover:bg-[var(--bg-workspace)] text-[var(--text-main)]" title="Zoom in">
          <ZoomIn size={16} />
        </button>
        <div className="w-px h-5 bg-[var(--border-color)] mx-1" />
        <button onClick={fitToScreen} className="p-2 rounded-md hover:bg-[var(--bg-workspace)] text-[var(--text-main)]" title="Fit to screen">
          <Maximize2 size={16} />
        </button>
      </div>

      {/* Unassigned employees panel (edit mode only) */}
      {editMode && (
        <div className="absolute bottom-4 right-4 z-30 w-64 max-h-72 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg shadow-md flex flex-col overflow-hidden">
          <div className="px-3 py-2 border-b border-[var(--border-color)]">
            <p className="text-[11px] font-black text-[var(--text-main)]">Unassigned ({unassigned.length})</p>
            <p className="text-[10px] text-[var(--text-muted)]">Use "Add Root" or the + on a node to place them</p>
          </div>
          <div className="overflow-y-auto custom-scrollbar p-1.5">
            {unassigned.length === 0 ? (
              <p className="text-[10px] text-[var(--text-muted)] text-center py-4">Everyone is placed 🎉</p>
            ) : (
              unassigned.map(emp => (
                <div key={emp.employee_id} className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-[var(--bg-workspace)]">
                  <div className="w-6 h-6 rounded-full overflow-hidden bg-[var(--bg-workspace)] border border-[var(--border-color)] flex-shrink-0 flex items-center justify-center">
                    {emp.image_url ? <img src={getImageUrl(emp.image_url)} alt={emp.full_name || emp.name} className="w-full h-full object-cover" /> : <User size={11} className="text-[var(--text-muted)]" />}
                  </div>
                  <span className="text-[11px] font-semibold text-[var(--text-main)] truncate flex-1">{emp.full_name || emp.name}</span>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      <div className="absolute bottom-4 left-4 z-30 flex items-center gap-1.5 text-[11px] font-medium text-[var(--text-muted)] bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg shadow-sm px-2.5 py-1.5">
        <Move size={12} /> Drag to pan · Ctrl/Cmd + scroll to zoom
      </div>

      {/* Canvas */}
      <div
        className={`w-full h-full ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={stopDragging}
        onMouseLeave={stopDragging}
      >
        <div
          ref={contentRef}
          className="w-max flex justify-center pb-10 pt-10"
          style={{
            transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
            transformOrigin: 'top center',
            transition: isDragging ? 'none' : 'transform 0.15s ease-out',
          }}
        >
          {treeData.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-[var(--text-muted)] py-20 w-[400px]">
              <User size={48} className="mb-4 opacity-50" />
              <h3 className="text-lg font-bold text-center">Chart is empty</h3>
              <p className="text-sm mt-2 text-center">
                {editMode ? 'Click "Add Root" to place your first employee.' : 'Switch to "Edit Structure" to build the chart.'}
              </p>
            </div>
          ) : (
            treeData.map((rootNode) => (
              <ul key={rootNode.employee_id} className="flex justify-center m-0 p-0">
                <OrgNode
                  node={rootNode}
                  isRoot={true}
                  editMode={editMode}
                  onAddReport={(parentId) => setPickerFor(parentId)}
                  onRemove={handleRemove}
                />
              </ul>
            ))
          )}
        </div>
      </div>

      {pickerFor && (
        <EmployeePickerModal
          candidates={unassigned}
          title={pickerFor === 'root' ? 'Add a root (top of chart)' : 'Add direct report'}
          onPick={handlePick}
          onClose={() => setPickerFor(null)}
        />
      )}
    </div>
  );
};

export default OrganizationChart;