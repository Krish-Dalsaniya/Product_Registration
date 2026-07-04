import React, { useState } from 'react';
import { User, School, Award, ChevronDown } from 'lucide-react';

const CandidateTimeline = ({ educationRoute, documents = {}, extractedInfo = {}, compact = false }) => {
  const [selectedNode, setSelectedNode] = useState(null);

  // Helper to determine if a document exists
  const isFilled = (key) => !!documents[key];

  // Helper to generate details
  const generateDetails = (key, label) => {
    const details = [
      { key: 'Status', value: isFilled(key) ? 'Document Uploaded' : 'Pending Upload' }
    ];

    if (key === 'marksheet_10th' && extractedInfo?.tenth_percentage) {
        details.push({ key: 'Per', value: String(extractedInfo.tenth_percentage) });
    }
    if (key === 'marksheet_12th' && extractedInfo?.twelfth_percentage) {
        details.push({ key: 'Percentage', value: String(extractedInfo.twelfth_percentage) });
    }
    if ((key.startsWith('deg_sem_') || key.startsWith('dip_sem_')) && extractedInfo?.college_cgpa) {
        // Show CGPA on the degree/diploma semesters
        details.push({ key: 'CGPA', value: String(extractedInfo.college_cgpa) });
    }

    return details;
  };

  // Build timeline array based on educationRoute
  const timelineNodes = [];

  // Birth node
  timelineNodes.push({
    id: 'birth',
    label: 'Birth Date/Year',
    year: extractedInfo?.birth_date || extractedInfo?.birth_year || 'N/A',
    type: 'birth',
    filled: !!(extractedInfo?.birth_date || extractedInfo?.birth_year),
    details: [
        { key: 'Status', value: (extractedInfo?.birth_date || extractedInfo?.birth_year) ? 'Extracted' : 'Not Provided' },
        ...(extractedInfo?.birth_date ? [{ key: 'DOB', value: String(extractedInfo.birth_date) }] : []),
        ...(extractedInfo?.birth_year ? [{ key: 'Year', value: String(extractedInfo.birth_year) }] : [])
    ]
  });

  // 10th Node
  timelineNodes.push({
    id: '10th',
    label: '10th',
    year: 'N/A',
    type: 'school',
    filled: isFilled('marksheet_10th'),
    details: generateDetails('marksheet_10th', '10th')
  });

  // 12th or Diploma based on route
  if (educationRoute === 'REGULAR') {
    timelineNodes.push({
      id: '12th',
      label: '12th',
      year: 'N/A',
      type: 'school',
      filled: isFilled('marksheet_12th'),
      details: generateDetails('marksheet_12th', '12th')
    });

    // Semesters 1 to 8
    for (let i = 1; i <= 8; i++) {
      timelineNodes.push({
        id: `deg_sem_${i}`,
        label: `Sem ${i}`,
        year: 'Degree',
        type: 'degree',
        filled: isFilled(`deg_sem_${i}`),
        details: generateDetails(`deg_sem_${i}`, `Semester ${i}`)
      });
    }
  } else {
    // Diploma Route
    for (let i = 1; i <= 6; i++) {
      timelineNodes.push({
        id: `dip_sem_${i}`,
        label: `Dip Sem ${i}`,
        year: 'Diploma',
        type: 'degree',
        filled: isFilled(`dip_sem_${i}`),
        details: generateDetails(`dip_sem_${i}`, `Diploma Semester ${i}`)
      });
    }
  }

  const completedCount = timelineNodes.filter(n => n.filled).length;
  const totalCount = timelineNodes.length;
  const progressPercent = totalCount === 0 ? 0 : (completedCount / totalCount) * 100;

  const handleNodeClick = (node) => {
    if (selectedNode?.id === node.id) {
      setSelectedNode(null); // Collapse
    } else {
      setSelectedNode(node); // Expand
    }
  };

  const renderIcon = (type) => {
    switch (type) {
      case 'birth': return <User size={16} />;
      case 'school': return <School size={16} />;
      case 'degree': return <Award size={16} />;
      default: return <Award size={16} />;
    }
  };

  if (compact) {
    return (
      <div className="w-full">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[12px] font-black text-[var(--text-main)] uppercase tracking-wider">Timeline</h3>
          <div className="bg-[var(--bg-workspace)] border border-[var(--border-color)] px-2 py-0.5 rounded-full flex items-center gap-1.5 shadow-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)]"></span>
            <span className="text-[9px] font-bold text-[var(--text-muted)] tracking-wider">
              {completedCount} / {totalCount}
            </span>
          </div>
        </div>

        <div className="relative pl-3">
          {/* Vertical Background Line */}
          <div className="absolute top-[20px] bottom-[20px] left-[26px] w-[2px] bg-[var(--border-color)] z-0 pointer-events-none rounded-full"></div>
          
          {/* Vertical Fill Line */}
          <div 
            className="absolute top-[20px] left-[26px] w-[2px] bg-[var(--accent)] z-0 pointer-events-none transition-all duration-700 ease-out rounded-full" 
            style={{ height: `calc(${progressPercent}% - 40px)` }}
          ></div>

          <div className="flex flex-col gap-4 relative z-10 py-1">
            {timelineNodes.map((node) => {
              const isSelected = selectedNode?.id === node.id;
              return (
                <div key={node.id} className="flex items-start gap-4 group">
                  <div 
                    role="button"
                    tabIndex={0}
                    onClick={() => handleNodeClick(node)}
                    className={`w-[28px] h-[28px] shrink-0 rounded-full flex items-center justify-center cursor-pointer transition-all duration-300 shadow-sm
                      ${node.filled ? 'bg-[var(--text-main)] text-[var(--bg-workspace)]' : 'bg-[var(--bg-card)] border-2 border-[var(--border-color)] text-[var(--text-muted)] group-hover:border-[var(--accent)]'}
                      ${isSelected ? 'ring-2 ring-[var(--accent)] ring-opacity-50 scale-110' : 'hover:scale-110'}
                    `}
                  >
                    {React.cloneElement(renderIcon(node.type), { size: 12 })}
                  </div>
                  <div className="pt-1 flex-1 cursor-pointer" onClick={() => handleNodeClick(node)}>
                    <div className="flex items-center justify-between">
                      <p className={`text-[11px] font-bold transition-colors ${node.filled ? 'text-[var(--text-main)]' : 'text-[var(--text-muted)]'}`}>{node.label}</p>
                      <p className="text-[9px] text-[var(--text-muted)] font-semibold uppercase">{node.year}</p>
                    </div>
                    {isSelected && (
                      <div className="mt-2 text-[10px] bg-[var(--bg-workspace)] p-2.5 rounded-lg border border-[var(--border-color)] shadow-sm animate-in slide-in-from-top-2 duration-200">
                        {node.details.map((detail, idx) => (
                          <div key={idx} className="flex flex-col gap-0.5">
                            <span className="font-black text-[var(--text-muted)] uppercase tracking-wider text-[9px]">{detail.key}</span>
                            <span className="font-bold text-[var(--text-main)]">{detail.value}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full my-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 px-2">
        <h3 className="text-[14px] font-black text-[var(--text-main)] uppercase tracking-wider">Educational Timeline</h3>
        <div className="bg-[var(--bg-card)] border border-[var(--border-color)] px-3 py-1 rounded-full flex items-center gap-2 shadow-sm">
          <span className="w-2 h-2 rounded-full bg-[var(--accent)]"></span>
          <span className="text-[11px] font-bold text-[var(--text-muted)] tracking-wider">
            {completedCount} / {totalCount} MILESTONES
          </span>
        </div>
      </div>

      {/* Track Container */}
      <div className="w-full overflow-x-auto custom-scrollbar pb-6 pt-2 px-2">
        <div className="min-w-full relative">
          
          {/* Background Line */}
          <div className="absolute top-[20px] left-0 right-0 h-[2px] bg-[var(--border-color)] rounded-full z-0 pointer-events-none"></div>
          
          {/* Fill Line */}
          <div 
            className="absolute top-[20px] left-0 h-[2px] bg-[var(--accent)] rounded-full z-0 pointer-events-none transition-all duration-700 ease-out" 
            style={{ width: `${progressPercent}%` }}
          ></div>

          {/* Nodes */}
          <div className="flex items-start justify-between relative z-10">
            {timelineNodes.map((node) => {
              const isSelected = selectedNode?.id === node.id;
              
              return (
                <div key={node.id} className="flex flex-col items-center group flex-1">
                  <div 
                    role="button"
                    tabIndex={0}
                    aria-label={`${node.label} ${node.year}`}
                    onClick={() => handleNodeClick(node)}
                    onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && handleNodeClick(node)}
                    className={`w-[44px] h-[44px] rounded-full flex items-center justify-center cursor-pointer outline-none transition-all duration-300
                      ${node.filled ? 'bg-[var(--text-main)] text-[var(--bg-workspace)] shadow-md' : 'bg-[var(--bg-card)] border-2 border-[var(--border-color)] text-[var(--text-muted)] group-hover:border-[var(--accent)]'}
                      ${isSelected ? 'ring-4 ring-[var(--accent)] ring-opacity-50 scale-110' : 'hover:scale-105 hover:shadow-md focus:ring-2 focus:ring-[var(--accent)]'}
                    `}
                  >
                    {renderIcon(node.type)}
                  </div>
                  
                  <div className="mt-3 text-center cursor-pointer" onClick={() => handleNodeClick(node)}>
                    <p className={`text-[12px] font-bold transition-colors ${node.filled ? 'text-[var(--text-main)]' : 'text-[var(--text-muted)]'}`}>
                      {node.label}
                    </p>
                    <p className="text-[10px] text-[var(--text-muted)] font-semibold mt-0.5 uppercase tracking-wide">
                      {node.year}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Details Card */}
      {selectedNode && (
        <div className="mt-2 bg-[#f7f6f2] border border-[#e5e2da] rounded-[12px] p-6 animate-in slide-in-from-top-4 fade-in duration-300">
          <div className="flex items-center justify-between mb-4 border-b border-[#e5e2da] pb-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-[#1e1e1e] text-white flex items-center justify-center">
                {renderIcon(selectedNode.type)}
              </div>
              <div>
                <h4 className="text-[14px] font-black text-[var(--text-main)] tracking-tight">{selectedNode.label} Details</h4>
                <p className="text-[11px] text-[var(--text-muted)] font-semibold tracking-wide uppercase">{selectedNode.year}</p>
              </div>
            </div>
            <button 
              onClick={() => setSelectedNode(null)}
              className="p-1.5 hover:bg-black/5 rounded-full transition-colors text-[var(--text-muted)]"
            >
              <ChevronDown size={18} className="rotate-180" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {selectedNode.details.map((detail, idx) => (
              <div key={idx} className="flex flex-col gap-1">
                <span className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-wider">{detail.key}</span>
                <span className="text-[13px] font-bold text-[var(--text-main)]">
                  {detail.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default CandidateTimeline;
