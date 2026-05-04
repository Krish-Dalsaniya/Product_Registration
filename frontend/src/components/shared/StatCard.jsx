import React from 'react';

const StatCard = ({ title, value, icon: Icon, trend }) => {
  return (
    <div
      className="relative p-6 flex items-center justify-between group cursor-pointer overflow-hidden rounded-2xl transition-all duration-300"
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border-color)',
        boxShadow: 'var(--card-shadow)',
        borderLeft: '3px solid var(--accent)',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = 'var(--border-hover)';
        e.currentTarget.style.boxShadow = 'var(--card-shadow-hover)';
        e.currentTarget.style.transform = 'translateY(-2px)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = 'var(--border-color)';
        e.currentTarget.style.boxShadow = 'var(--card-shadow)';
        e.currentTarget.style.transform = '';
      }}
    >
      <div className="space-y-1 relative z-10">
        <p className="text-[12px] font-black uppercase" style={{ color: 'var(--text-muted)', letterSpacing: '0.12em' }}>{title}</p>
        <div className="flex flex-col gap-2">
          <h3 className="text-3xl font-black tracking-tight" style={{ color: 'var(--text-main)' }}>{value}</h3>
          {trend && (
            <div
              className="inline-flex items-center self-start px-2 py-0.5 rounded-full text-[10px] font-bold"
              style={{
                background: trend.startsWith('+') ? 'rgba(52,211,153,0.1)' : 'rgba(239,68,68,0.1)',
                color: trend.startsWith('+') ? '#34d399' : '#f87171',
              }}
            >
              {trend}
            </div>
          )}
        </div>
      </div>

      <div
        className="p-4 rounded-2xl transition-all duration-400 relative z-10 group-hover:scale-110 group-hover:rotate-6"
        style={{ background: 'var(--nav-hover)' }}
      >
        {Icon && <Icon size={24} style={{ color: 'var(--accent)' }} strokeWidth={2.5} />}
      </div>

      {/* Background glow on hover */}
      <div
        className="absolute -right-4 -bottom-4 w-24 h-24 rounded-full blur-3xl opacity-0 group-hover:opacity-10 transition-opacity duration-500"
        style={{ background: 'var(--accent)' }}
      />
    </div>
  );
};

export default StatCard;
