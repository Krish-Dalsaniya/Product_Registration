import React, { useEffect, useState } from 'react';
import { Loader2, User, ChevronDown, ChevronUp } from 'lucide-react';
import { fetchEmployeeHierarchyApi } from '../../../api/hr';
import toast from 'react-hot-toast';

const buildTree = (employees) => {
  const map = {};
  const roots = [];
  
  employees.forEach(emp => {
    map[emp.employee_id] = { ...emp, children: [] };
  });

  employees.forEach(emp => {
    if (emp.manager_id && map[emp.manager_id]) {
      map[emp.manager_id].children.push(map[emp.employee_id]);
    } else {
      roots.push(map[emp.employee_id]);
    }
  });

  return roots;
};

const OrgNode = ({ node, isRoot = false }) => {
  const hasChildren = node.children && node.children.length > 0;
  // By default, nodes are collapsed so only the root is visible initially.
  const [isOpen, setIsOpen] = useState(false);
  const childCount = hasChildren ? node.children.length : 0;

  return (
    <li className={`relative text-center list-none transition-all duration-500 org-tree-li ${isRoot ? 'pt-0' : 'pt-5 px-1'} pb-4`}>
      <div className="inline-block relative z-10 group">
        <div className="bg-[var(--bg-card)] border-t-4 border-t-[var(--accent)] border border-[var(--border-color)] rounded-xl shadow-md p-3 min-w-[220px] max-w-[260px] text-left hover:-translate-y-1 transition-transform cursor-default relative">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full overflow-hidden bg-[var(--bg-workspace)] border-2 border-[var(--border-color)] flex-shrink-0 flex items-center justify-center">
              {node.image_url ? (
                <img 
                  src={node.image_url.startsWith('http') ? node.image_url : `${import.meta.env.VITE_API_BASE_URL?.replace(/\/api$/, '') || 'http://localhost:3000'}/${node.image_url.startsWith('/') ? node.image_url.substring(1) : node.image_url}`} 
                  alt={node.name} 
                  className="w-full h-full object-cover"
                />
              ) : (
                <User size={20} className="text-[var(--text-muted)]" />
              )}
            </div>
            <div className="overflow-hidden">
              <h4 className="text-[13px] font-black text-[var(--text-main)] truncate">{node.name}</h4>
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
          className={`transition-all duration-500 ease-in-out origin-top grid`}
          style={{ gridTemplateRows: isOpen ? '1fr' : '0fr', opacity: isOpen ? 1 : 0, pointerEvents: isOpen ? 'auto' : 'none' }}
        >
          <div className="overflow-hidden">
             <ul className="flex justify-center pt-5 relative transition-all duration-500 org-tree-ul">
               {node.children.map(child => (
                 <OrgNode key={child.employee_id} node={child} />
               ))}
             </ul>
          </div>
        </div>
      )}
    </li>
  );
};

const OrganizationChart = () => {
  const [treeData, setTreeData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchOrgChart = async () => {
      try {
        setIsLoading(true);
        const res = await fetchEmployeeHierarchyApi();
        if (res.data?.success) {
          const hierarchy = buildTree(res.data.data);
          setTreeData(hierarchy);
        }
      } catch (error) {
        toast.error('Failed to load organization chart');
        console.error(error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchOrgChart();
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <Loader2 className="animate-spin text-[var(--accent)] w-10 h-10" />
      </div>
    );
  }

  if (treeData.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] text-[var(--text-muted)]">
        <User size={48} className="mb-4 opacity-50" />
        <h3 className="text-xl font-bold">No Employees Found</h3>
        <p className="text-sm mt-2">Add employees to generate an organization chart.</p>
      </div>
    );
  }

  return (
    <div className="w-full h-[calc(100vh-100px)] overflow-auto custom-scrollbar relative px-8 py-10 bg-[var(--bg-workspace)]">
      
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
        /* Only children don't get the top horizontal lines */
        .org-tree-li:only-child::after, .org-tree-li:only-child::before {
          display: none;
        }
        .org-tree-li:only-child {
          padding-top: 0;
        }
        .org-tree-li:first-child::before, .org-tree-li:last-child::after {
          border: 0 none;
        }
        .org-tree-li:last-child::before {
          border-right: 2px solid var(--border-color);
          border-radius: 0 10px 0 0;
        }
        .org-tree-li:first-child::after {
          border-radius: 10px 0 0 0;
        }
      `}} />

      <div className="flex justify-center min-w-max pb-32">
        {treeData.map((rootNode) => (
          <ul key={rootNode.employee_id} className="flex justify-center m-0 p-0">
            <OrgNode node={rootNode} isRoot={true} />
          </ul>
        ))}
      </div>
    </div>
  );
};

export default OrganizationChart;
