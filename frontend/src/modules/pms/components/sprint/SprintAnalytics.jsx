import React, { useState, useEffect } from 'react';
import { getSprintMetrics } from '../../../../api/pms';
import { Loader2, TrendingUp, TrendingDown } from 'lucide-react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar
} from 'recharts';
import toast from 'react-hot-toast';

const SprintAnalytics = ({ sprintId }) => {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (sprintId) {
      fetchMetrics();
    }
  }, [sprintId]);

  const fetchMetrics = async () => {
    try {
      setLoading(true);
      const res = await getSprintMetrics(sprintId);
      if (res.data?.success) {
        setMetrics(res.data.data);
      }
    } catch (error) {
      console.error(error);
      toast.error('Failed to load sprint metrics');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[var(--accent)] animate-spin" />
      </div>
    );
  }

  if (!metrics) return null;

  const { burndown, velocity } = metrics;

  return (
    <div className="h-full p-6 overflow-y-auto custom-scrollbar">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Burn-down Section */}
        <div className="bg-[var(--bg-card)] rounded-2xl border border-[var(--border-color)] p-6 shadow-sm">
          <div className="mb-6">
            <h2 className="text-lg font-black text-[var(--text-main)] flex items-center gap-2">
              <TrendingDown className="text-rose-500" size={20} />
              Sprint Burn-down Chart
            </h2>
            <p className="text-sm text-[var(--text-muted)] font-medium mt-1">Tracks remaining story points against the ideal trendline.</p>
          </div>
          
          <div className="h-[400px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={burndown} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
                <XAxis dataKey="date" stroke="var(--text-muted)" tick={{ fontSize: 12, fontWeight: 500 }} tickMargin={10} />
                <YAxis stroke="var(--text-muted)" tick={{ fontSize: 12, fontWeight: 500 }} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  itemStyle={{ fontWeight: 700 }}
                  labelStyle={{ color: 'var(--text-muted)', marginBottom: '4px', fontWeight: 600, fontSize: '12px' }}
                />
                <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px', fontSize: '14px', fontWeight: 600 }} />
                <Line type="monotone" name="Ideal Remaining" dataKey="ideal" stroke="#94a3b8" strokeWidth={2} strokeDasharray="5 5" dot={false} />
                <Line type="monotone" name="Actual Remaining" dataKey="actual" stroke="var(--accent)" strokeWidth={3} dot={{ strokeWidth: 2, r: 4 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Velocity Section */}
        <div className="bg-[var(--bg-card)] rounded-2xl border border-[var(--border-color)] p-6 shadow-sm">
          <div className="mb-6">
            <h2 className="text-lg font-black text-[var(--text-main)] flex items-center gap-2">
              <TrendingUp className="text-emerald-500" size={20} />
              Team Velocity
            </h2>
            <p className="text-sm text-[var(--text-muted)] font-medium mt-1">Historical performance across the last 5 completed sprints.</p>
          </div>

          {velocity.length === 0 ? (
            <div className="h-[300px] flex items-center justify-center text-[var(--text-muted)] font-medium">
              Not enough completed sprints to calculate velocity.
            </div>
          ) : (
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={velocity} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
                  <XAxis dataKey="sprint_name" stroke="var(--text-muted)" tick={{ fontSize: 12, fontWeight: 500 }} tickMargin={10} />
                  <YAxis stroke="var(--text-muted)" tick={{ fontSize: 12, fontWeight: 500 }} />
                  <Tooltip 
                    cursor={{ fill: 'var(--bg-workspace)', opacity: 0.5 }}
                    contentStyle={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)', borderRadius: '12px' }}
                  />
                  <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px', fontSize: '14px', fontWeight: 600 }} />
                  <Bar name="Planned Points" dataKey="planned" fill="#94a3b8" radius={[4, 4, 0, 0]} />
                  <Bar name="Completed Points" dataKey="completed" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default SprintAnalytics;
