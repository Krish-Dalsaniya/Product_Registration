import React, { useEffect, useState } from 'react';
import { Tree, TreeNode } from 'react-organizational-chart';
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

const OrgNode = ({ node, isOpen, onToggle, hasChildren }) => {
  const childCount = node.children ? node.children.length : 0;
  
  return (
    <div className="inline-block relative">
      <div className="bg-[var(--bg-card)] border-t-4 border-t-[var(--accent)] border border-[var(--border-color)] rounded-xl shadow-md p-3 min-w-[200px] text-left hover:-translate-y-1 transition-transform cursor-default relative group z-10 animate-in fade-in zoom-in-95 slide-in-from-top-2 duration-300">
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
          <div>
            <h4 className="text-[13px] font-black text-[var(--text-main)] truncate">{node.name}</h4>
            <p className="text-[10px] font-bold text-[var(--text-muted)] truncate">{node.designation_name || 'Employee'}</p>
            <p className="text-[10px] font-medium text-[var(--text-secondary)] mt-0.5">{node.emp_code}</p>
          </div>
        </div>
        
        {/* Child count badge & Expand Toggle */}
        {hasChildren && (
          <button 
            onClick={onToggle}
            className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-full px-2.5 py-0.5 text-[10px] font-bold text-[var(--text-main)] shadow-sm z-20 flex items-center gap-1 hover:border-[var(--accent)] hover:text-[var(--accent)] transition-colors cursor-pointer"
          >
            {childCount} {childCount === 1 ? 'Report' : 'Reports'}
            {isOpen ? <ChevronUp size={12} strokeWidth={3} /> : <ChevronDown size={12} strokeWidth={3} />}
          </button>
        )}
      </div>
    </div>
  );
};

const ExpandableNode = ({ node }) => {
  const [isOpen, setIsOpen] = useState(true);
  const hasChildren = node.children && node.children.length > 0;

  if (!isOpen || !hasChildren) {
    return (
      <TreeNode 
        label={
          <OrgNode 
            node={node} 
            isOpen={isOpen} 
            onToggle={() => setIsOpen(!isOpen)} 
            hasChildren={hasChildren} 
          />
        }
      />
    );
  }

  return (
    <TreeNode 
      label={
        <OrgNode 
          node={node} 
          isOpen={isOpen} 
          onToggle={() => setIsOpen(!isOpen)} 
          hasChildren={hasChildren} 
        />
      }
    >
      {node.children.map(child => (
        <ExpandableNode key={child.employee_id} node={child} />
      ))}
    </TreeNode>
  );
};

const RootExpandableNode = ({ node }) => {
  const [isOpen, setIsOpen] = useState(true);
  const hasChildren = node.children && node.children.length > 0;

  if (!isOpen || !hasChildren) {
    return (
      <Tree
        lineWidth="2px"
        lineColor="var(--border-color)"
        lineBorderRadius="10px"
        label={
          <OrgNode 
            node={node} 
            isOpen={isOpen} 
            onToggle={() => setIsOpen(!isOpen)} 
            hasChildren={hasChildren} 
          />
        }
        nodePadding="20px"
      />
    );
  }

  return (
    <Tree
      lineWidth="2px"
      lineColor="var(--border-color)"
      lineBorderRadius="10px"
      label={
        <OrgNode 
          node={node} 
          isOpen={isOpen} 
          onToggle={() => setIsOpen(!isOpen)} 
          hasChildren={hasChildren} 
        />
      }
      nodePadding="20px"
    >
      {node.children.map(child => (
        <ExpandableNode key={child.employee_id} node={child} />
      ))}
    </Tree>
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
    <div className="w-full overflow-x-auto custom-scrollbar pb-16 pt-8 px-4 flex justify-center">
      <div className="min-w-max">
        {treeData.map((rootNode) => (
          <div key={rootNode.employee_id} className="mb-16">
            <RootExpandableNode node={rootNode} />
          </div>
        ))}
      </div>
    </div>
  );
};

export default OrganizationChart;
