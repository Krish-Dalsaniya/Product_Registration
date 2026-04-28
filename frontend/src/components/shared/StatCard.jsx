import React from 'react';

const StatCard = ({ title, value, icon: Icon, trend }) => {
  return (
    <div className="workspace-card p-7 workspace-card-hover group relative overflow-hidden bg-white">
      {/* Decorative accent */}
      <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/[0.03] rounded-full blur-3xl -translate-y-12 translate-x-12 group-hover:bg-blue-500/[0.08] transition-colors" />
      
      <div className="flex items-center justify-between relative z-10">
        <div>
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-1.5">{title}</p>
          <h3 className="text-3xl font-black text-gray-900 tracking-tight">{value}</h3>
          {trend && (
            <p className={`text-xs font-bold mt-2.5 flex items-center gap-1 ${trend.startsWith('+') ? 'text-blue-600' : 'text-red-500'}`}>
              {trend} <span className="text-gray-400 font-medium">vs last month</span>
            </p>
          )}
        </div>
        {Icon && (
          <div className="p-4 bg-blue-50 rounded-2xl text-blue-600 group-hover:scale-110 group-hover:rotate-6 transition-all border border-blue-100 shadow-sm">
            <Icon size={24} strokeWidth={2.5} />
          </div>
        )}
      </div>
    </div>
  );
};

export default StatCard;
