import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Award } from 'lucide-react';

const SGPABarChart = ({ eduDetails, educationRoute }) => {
  const data = useMemo(() => {
    const chartData = [];
    if (educationRoute === 'REGULAR') {
      for (let i = 1; i <= 8; i++) {
        const val = parseFloat(eduDetails[`degree_sgpa_${i}`]);
        if (!isNaN(val) && val > 0) {
          chartData.push({ name: `Sem ${i}`, sgpa: val });
        }
      }
    } else {
      // Diploma
      for (let i = 1; i <= 6; i++) {
        const val = parseFloat(eduDetails[`diploma_sgpa_${i}`]);
        if (!isNaN(val) && val > 0) {
          chartData.push({ name: `Dip ${i}`, sgpa: val });
        }
      }
      for (let i = 1; i <= 6; i++) {
        const val = parseFloat(eduDetails[`degree_sgpa_${i}`]);
        if (!isNaN(val) && val > 0) {
          chartData.push({ name: `Deg ${i}`, sgpa: val });
        }
      }
    }
    return chartData;
  }, [eduDetails, educationRoute]);

  if (data.length === 0) {
    return (
      <div className="h-full min-h-[300px] flex flex-col items-center justify-center text-[var(--text-muted)] bg-[var(--bg-workspace)] border border-[var(--border-color)] rounded-xl border-dashed animate-in fade-in duration-500">
        <Award size={32} className="mb-3 opacity-20" />
        <p className="text-[12px] font-bold uppercase tracking-widest">No SGPA Data</p>
        <p className="text-[10px] mt-1 text-center max-w-[200px] font-medium opacity-70">Fill in semester SGPA to see performance chart</p>
      </div>
    );
  }

  return (
    <div className="p-5 bg-[var(--bg-workspace)] border border-[var(--border-color)] rounded-xl animate-in slide-in-from-top-2 fade-in duration-500 shadow-sm h-full flex flex-col">
      <div className="flex items-center justify-between mb-6 border-b border-[var(--border-color)] pb-3">
        <div className="flex items-center gap-2">
          <Award size={16} className="text-[var(--accent)]" />
          <h3 className="text-[12px] font-black uppercase tracking-widest text-[var(--text-main)] m-0">Performance Overview</h3>
        </div>
        <div className="text-[10px] font-bold text-[var(--text-muted)] uppercase bg-[var(--bg-card)] px-2 py-0.5 rounded-md border border-[var(--border-color)]">
          College SGPA
        </div>
      </div>
      <div className="flex-1 w-full min-h-[250px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" opacity={0.5} />
            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: 'var(--text-muted)', fontWeight: 600 }} dy={10} />
            <YAxis domain={[0, 10]} axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: 'var(--text-muted)', fontWeight: 600 }} />
            <Tooltip 
              cursor={{ fill: 'var(--border-color)', opacity: 0.3 }}
              contentStyle={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)', borderRadius: '8px', fontSize: '11px', fontWeight: '900', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
              itemStyle={{ color: 'var(--accent)' }}
              formatter={(value) => [`${value} SGPA`, 'Score']}
            />
            <Bar dataKey="sgpa" radius={[4, 4, 0, 0]} maxBarSize={40} animationDuration={1500}>
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill="var(--accent)" fillOpacity={0.6 + (index * (0.4 / data.length))} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default SGPABarChart;
