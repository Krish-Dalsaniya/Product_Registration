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
  const [newType, setNewType] = useState('NATIONAL');
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
      const res = await createHolidayApi({ name: newName, date: newDate, type: newType });
      if (res.data?.success) {
        toast.success('Holiday added successfully!');
        setNewName('');
        setNewDate('');
        setNewType('NATIONAL');
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

  const groupedHolidays = holidays.reduce((acc, h) => {
    const d = new Date(h.date);
    const monthYear = d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }).toUpperCase();
    if (!acc[monthYear]) acc[monthYear] = [];
    acc[monthYear].push(h);
    return acc;
  }, {});

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      


      <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl shadow-sm p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-indigo-50 rounded-xl">
              <Calendar size={20} className="text-indigo-600" />
            </div>
            <div>
              <h2 className="text-lg font-black text-[var(--text-main)]">Manage Holidays</h2>
              <p className="text-[12px] text-[var(--text-muted)] font-medium mt-0.5">Add or remove company off days</p>
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

        <form onSubmit={handleAddHoliday} className="flex flex-col md:flex-row gap-4 items-end mb-10 bg-[var(--bg-workspace)] p-4 rounded-xl border border-[var(--border-color)]">
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
          <div className="flex-1 w-full md:max-w-[150px]">
            <label className="block text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1.5">Type</label>
            <select 
              value={newType}
              onChange={(e) => setNewType(e.target.value)}
              className="w-full bg-white border border-[var(--border-color)] rounded-xl py-2 px-4 outline-none focus:border-[var(--accent)] text-[13px] font-medium appearance-none"
            >
              <option value="NATIONAL">NATIONAL</option>
              <option value="FESTIVAL">FESTIVAL</option>
              <option value="COMPANY">COMPANY</option>
            </select>
          </div>
          <button 
            type="submit" 
            disabled={isSubmitting}
            className="w-full md:w-auto px-6 py-2 bg-[var(--accent)] text-white rounded-xl font-bold text-[13px] hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
            Add
          </button>
        </form>

        {/* Grid Calendar View */}
        {isLoading ? (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="animate-spin text-[var(--accent)] w-8 h-8" />
          </div>
        ) : holidays.length === 0 ? (
          <div className="text-center py-12 text-[var(--text-muted)] text-[13px] font-medium bg-[var(--bg-workspace)] border border-[var(--border-color)] rounded-xl">
            No holidays defined for {year}.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Object.entries(groupedHolidays).map(([monthYear, monthHolidays]) => (
              <div key={monthYear} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-full hover:shadow-md transition-shadow">
                {/* Header */}
                <div className="bg-[#1f2937] text-white text-center py-3">
                  <h3 className="text-xs font-bold tracking-[0.2em]">{monthYear}</h3>
                </div>
                {/* Body */}
                <div className="p-4 flex-1 flex flex-col gap-4">
                  {monthHolidays.map(h => {
                    const d = new Date(h.date);
                    const dayStr = d.toLocaleDateString('en-US', { weekday: 'short' });
                    const dateNum = String(d.getDate()).padStart(2, '0');
                    
                    let textColor = 'text-red-500';
                    let bgClass = 'bg-red-50';
                    
                    if (h.type === 'FESTIVAL') {
                      textColor = 'text-indigo-500';
                      bgClass = 'bg-indigo-50';
                    } else if (h.type === 'COMPANY') {
                      textColor = 'text-amber-500';
                      bgClass = 'bg-amber-50';
                    }

                    return (
                      <div key={h.holiday_id} className="flex items-center gap-4 group pb-4 border-b border-slate-100 last:border-0 last:pb-0 relative">
                        <div className={`w-[46px] h-[46px] rounded-lg flex flex-col items-center justify-center ${bgClass} shrink-0`}>
                          <span className={`text-[10px] font-bold ${textColor} leading-none mb-1`}>{dayStr}</span>
                          <span className={`text-[15px] font-black ${textColor} leading-none`}>{dateNum}</span>
                        </div>
                        <div className="flex-1 min-w-0 pr-8">
                          <h4 className="text-[13px] font-bold text-slate-900 truncate">{h.name}</h4>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{h.type || 'NATIONAL'}</span>
                        </div>
                        <button 
                          onClick={() => handleDelete(h.holiday_id)}
                          className="opacity-0 group-hover:opacity-100 p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition-all absolute right-0 bg-white shadow-sm border border-rose-100"
                          title="Delete Holiday"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default HolidaysList;
