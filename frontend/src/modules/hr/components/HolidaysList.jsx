import React, { useState, useEffect } from 'react';
import { fetchHolidaysApi, createHolidayApi, deleteHolidayApi } from '../../../api/hr';
import { Calendar, Trash2, Plus, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

const HolidaysList = () => {
  const [holidays, setHolidays] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [year, setYear] = useState(new Date().getFullYear());
  
  const [newName, setNewName] = useState('');
  const [newDate, setNewDate] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadHolidays = async () => {
    try {
      setIsLoading(true);
      const res = await fetchHolidaysApi(year);
      if (res.data?.success) setHolidays(res.data.data);
    } catch (err) {
      toast.error('Failed to load holidays');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadHolidays();
  }, [year]);

  const handleAddHoliday = async (e) => {
    e.preventDefault();
    if (!newName || !newDate) return;
    
    try {
      setIsSubmitting(true);
      const res = await createHolidayApi({ name: newName, date: newDate });
      if (res.data?.success) {
        toast.success('Holiday added successfully!');
        setNewName('');
        setNewDate('');
        loadHolidays();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add holiday');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this holiday?')) return;
    
    try {
      const res = await deleteHolidayApi(id);
      if (res.data?.success) {
        toast.success('Holiday deleted successfully');
        loadHolidays();
      }
    } catch (err) {
      toast.error('Failed to delete holiday');
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl shadow-sm p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-orange-50 rounded-xl">
              <Calendar size={20} className="text-orange-500" />
            </div>
            <div>
              <h2 className="text-lg font-black text-[var(--text-main)]">Public Holidays</h2>
              <p className="text-[12px] text-[var(--text-muted)] font-medium mt-0.5">Manage company-wide off days</p>
            </div>
          </div>
          
          <select 
            value={year}
            onChange={(e) => setYear(e.target.value)}
            className="appearance-none bg-[var(--bg-workspace)] border border-[var(--border-color)] rounded-xl py-2 pl-4 pr-10 outline-none focus:border-[var(--accent)] font-bold text-[13px] text-[var(--text-main)] cursor-pointer"
          >
            {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>

        <form onSubmit={handleAddHoliday} className="flex flex-col md:flex-row gap-4 items-end mb-8 bg-[var(--bg-workspace)] p-4 rounded-xl border border-[var(--border-color)]">
          <div className="flex-1 w-full">
            <label className="block text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1.5">Holiday Name</label>
            <input 
              type="text" 
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="e.g. Diwali, Christmas"
              className="w-full bg-white border border-[var(--border-color)] rounded-xl py-2 px-4 outline-none focus:border-[var(--accent)] text-[13px] font-medium"
              required
            />
          </div>
          <div className="flex-1 w-full">
            <label className="block text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1.5">Date</label>
            <input 
              type="date" 
              value={newDate}
              onChange={(e) => setNewDate(e.target.value)}
              className="w-full bg-white border border-[var(--border-color)] rounded-xl py-2 px-4 outline-none focus:border-[var(--accent)] text-[13px] font-medium"
              required
            />
          </div>
          <button 
            type="submit" 
            disabled={isSubmitting}
            className="w-full md:w-auto px-6 py-2 bg-[var(--accent)] text-white rounded-xl font-bold text-[13px] hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
            Add Holiday
          </button>
        </form>

        <div className="border border-[var(--border-color)] rounded-xl overflow-hidden">
          {isLoading ? (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="animate-spin text-[var(--accent)] w-8 h-8" />
            </div>
          ) : holidays.length === 0 ? (
            <div className="text-center py-12 text-[var(--text-muted)] text-[13px] font-medium">
              No holidays defined for {year}.
            </div>
          ) : (
            <table className="w-full text-left">
              <thead className="bg-[var(--bg-workspace)] border-b border-[var(--border-color)]">
                <tr>
                  <th className="px-6 py-3 text-[11px] font-black text-[var(--text-muted)] uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3 text-[11px] font-black text-[var(--text-muted)] uppercase tracking-wider">Holiday Name</th>
                  <th className="px-6 py-3 text-[11px] font-black text-[var(--text-muted)] uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-color)]">
                {holidays.map(h => (
                  <tr key={h.holiday_id} className="hover:bg-[var(--bg-workspace)] transition-colors">
                    <td className="px-6 py-4">
                      <div className="text-[14px] font-bold text-[var(--text-main)]">
                        {new Date(h.date).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-black uppercase tracking-widest bg-orange-50 text-orange-600 border border-orange-200">
                        {h.name}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button 
                        onClick={() => handleDelete(h.holiday_id)}
                        className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                        title="Delete Holiday"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default HolidaysList;
