import React, { useState, useEffect } from 'react';
import { fetchAttendanceMusterApi } from '../../../api/attendance';
import { fetchHRMetadataApi } from '../../../api/hr';
import { Search, Loader2, Download, Calendar } from 'lucide-react';
import toast from 'react-hot-toast';

const AttendanceMuster = () => {
  const [records, setRecords] = useState([]);
  const [metadata, setMetadata] = useState({ departments: [] });
  const [isLoading, setIsLoading] = useState(true);

  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());
  const [search, setSearch] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');

  useEffect(() => {
    loadMetadata();
  }, []);

  useEffect(() => {
    loadMuster();
  }, [selectedMonth, selectedYear, departmentFilter]);

  const loadMetadata = async () => {
    try {
      const res = await fetchHRMetadataApi();
      if (res.data?.success) setMetadata(res.data.data);
    } catch (err) {
      console.error(err);
    }
  };

  const loadMuster = async () => {
    try {
      setIsLoading(true);
      const res = await fetchAttendanceMusterApi({
        year: selectedYear,
        month: selectedMonth,
        department_id: departmentFilter
      });
      if (res.data?.success) setRecords(res.data.data);
    } catch (err) {
      toast.error('Failed to load muster roll');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredRecords = records.filter(r =>
    r.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    r.emp_code?.toLowerCase().includes(search.toLowerCase())
  );

  const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();
  const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const getDayOfWeek = (day) => {
    const d = new Date(selectedYear, selectedMonth - 1, day);
    return d.toLocaleDateString('en-US', { weekday: 'short' });
  };

  const getCellStyles = (status) => {
    switch (status) {
      case 'Present': return 'bg-emerald-100 text-emerald-800 font-black';
      case 'Absent': return 'bg-rose-100 text-rose-800 font-black';
      case 'On Leave': return 'bg-blue-100 text-blue-800 font-black';
      case 'Late': return 'bg-amber-100 text-amber-800 font-black';
      case 'Half Day': return 'bg-purple-100 text-purple-800 font-black';
      case 'Holiday': return 'bg-orange-100 text-orange-800 font-black';
      case 'OFF': return 'bg-gray-100 text-gray-500 font-bold';
      default: return 'bg-white text-gray-400 font-bold';
    }
  };

  const getShortStatus = (status) => {
    switch (status) {
      case 'Present': return 'P';
      case 'Absent': return 'A';
      case 'On Leave': return 'L';
      case 'Late': return 'LT';
      case 'Half Day': return 'HD';
      case 'Holiday': return 'H';
      case 'OFF': return 'OFF';
      default: return '-';
    }
  };

  const handleExportCSV = () => {
    if (filteredRecords.length === 0) return;

    const headers = [
      'Emp Code', 'Employee Name', 'Department',
      ...daysArray.map(d => `${d} ${getDayOfWeek(d)}`),
      'P', 'A', 'L', 'LT', 'HD', 'H', 'OFF'
    ];

    const rows = filteredRecords.map(emp => {
      const dayData = daysArray.map(d => getShortStatus(emp.days[d]));
      return [
        emp.emp_code,
        emp.full_name,
        emp.department_name || 'N/A',
        ...dayData,
        emp.summary.P,
        emp.summary.A,
        emp.summary.L,
        emp.summary.Late,
        emp.summary.HD,
        emp.summary.H,
        emp.summary.OFF
      ];
    });

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Attendance_Muster_${selectedYear}_${selectedMonth}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 w-full min-w-0 max-w-full overflow-hidden">
      {/* Filters */}
      <div className="workspace-card p-2 flex flex-wrap gap-4 items-center border border-[var(--border-color)] bg-[var(--bg-card)] rounded-2xl">
        <div className="relative flex-1 min-w-[250px] group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)] group-focus-within:text-[var(--accent)] transition-colors duration-300" size={18} />
          <input
            type="text"
            placeholder="Search by name or code..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[var(--bg-workspace)] border border-[var(--border-color)] rounded-xl py-2 pl-12 pr-4 outline-none focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--border-glow)] transition-all text-[14px] text-[var(--text-main)] font-medium"
          />
        </div>

        <div className="flex gap-4">
          <div className="relative">
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="appearance-none bg-[var(--bg-workspace)] border border-[var(--border-color)] rounded-xl py-2 pl-4 pr-10 outline-none focus:border-[var(--accent)] transition-all text-[12px] font-black text-[var(--text-main)] uppercase cursor-pointer"
            >
              {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                <option key={m} value={m}>
                  {new Date(2000, m - 1).toLocaleString('default', { month: 'long' })}
                </option>
              ))}
            </select>
          </div>

          <div className="relative">
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="appearance-none bg-[var(--bg-workspace)] border border-[var(--border-color)] rounded-xl py-2 pl-4 pr-10 outline-none focus:border-[var(--accent)] transition-all text-[12px] font-black text-[var(--text-main)] cursor-pointer"
            >
              {Array.from({ length: 5 }, (_, i) => currentDate.getFullYear() - 2 + i).map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>

          <div className="relative">
            <select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              className="appearance-none bg-[var(--bg-workspace)] border border-[var(--border-color)] rounded-xl py-2 pl-4 pr-10 outline-none focus:border-[var(--accent)] transition-all text-[12px] font-black text-[var(--text-main)] uppercase cursor-pointer max-w-[200px] truncate"
            >
              <option value="">ALL DEPTS</option>
              {metadata.departments?.map(d => <option key={d.department_id} value={d.department_id}>{d.name.toUpperCase()}</option>)}
            </select>
          </div>

          <button
            onClick={handleExportCSV}
            className="px-4 py-2 border border-[var(--border-color)] rounded-xl hover:bg-[var(--bg-workspace)] transition-colors flex items-center gap-2 group shadow-sm bg-white"
          >
            <Download size={16} className="text-[var(--text-muted)] group-hover:text-[var(--accent)]" />
            <span className="text-[12px] font-bold text-[var(--text-main)]">Export Excel</span>
          </button>
        </div>
      </div>

      {/* Muster Table */}
      <div className="grid grid-cols-1">
        <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl shadow-sm overflow-hidden flex flex-col min-w-0">
          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <Loader2 className="animate-spin text-[var(--accent)] w-8 h-8" />
            </div>
          ) : filteredRecords.length === 0 ? (
            <div className="flex flex-col justify-center items-center h-64 text-[var(--text-muted)]">
              <Calendar size={48} className="opacity-20 mb-4" />
              <p className="font-bold">No attendance records found for this month.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse whitespace-nowrap">
                <thead>
                  <tr>
                    <th className="sticky left-0 z-20 bg-[var(--bg-workspace)] border-b border-r border-[var(--border-color)] px-3 py-1.5 shadow-[2px_0_5px_rgba(0,0,0,0.05)] w-[160px] min-w-[160px] max-w-[160px]">
                      <span className="text-[11px] font-black text-[var(--text-muted)] uppercase tracking-wider">Employee</span>
                    </th>
                    {daysArray.map(day => (
                      <th key={day} className="border-b border-r border-[var(--border-color)] px-1 py-2 text-center min-w-[30px] bg-[#f8fafc]">
                        <div className="flex flex-col items-center">
                          <span className="text-[11px] font-black text-[var(--text-main)]">{day}</span>
                          <span className="text-[8px] font-bold text-[var(--text-muted)] uppercase">{getDayOfWeek(day).charAt(0)}</span>
                        </div>
                      </th>
                    ))}
                    <th className="bg-emerald-50 border-b border-r border-[var(--border-color)] px-2 py-2 text-center"><span className="text-[10px] font-black text-emerald-700">P</span></th>
                    <th className="bg-rose-50 border-b border-r border-[var(--border-color)] px-2 py-2 text-center"><span className="text-[10px] font-black text-rose-700">A</span></th>
                    <th className="bg-blue-50 border-b border-r border-[var(--border-color)] px-2 py-2 text-center"><span className="text-[10px] font-black text-blue-700">L</span></th>
                    <th className="bg-amber-50 border-b border-r border-[var(--border-color)] px-2 py-2 text-center"><span className="text-[10px] font-black text-amber-700">LT</span></th>
                    <th className="bg-purple-50 border-b border-r border-[var(--border-color)] px-2 py-2 text-center"><span className="text-[10px] font-black text-purple-700">HD</span></th>
                    <th className="bg-orange-50 border-b border-r border-[var(--border-color)] px-2 py-2 text-center"><span className="text-[10px] font-black text-orange-700">H</span></th>
                    <th className="bg-gray-50 border-b border-[var(--border-color)] px-2 py-2 text-center"><span className="text-[10px] font-black text-gray-500">OFF</span></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-color)] text-[11px]">
                  {filteredRecords.map((emp, index) => (
                    <tr key={emp.employee_id} className={`group transition-colors ${index % 2 === 1 ? 'bg-gray-100 dark:bg-gray-800/60 hover:bg-gray-200 dark:hover:bg-gray-700/50' : 'bg-transparent hover:bg-gray-50 dark:hover:bg-gray-800/30'}`}>
                      <td className={`sticky left-0 z-10 border-r border-[var(--border-color)] px-3 py-1 shadow-[2px_0_5px_rgba(0,0,0,0.02)] transition-colors w-[160px] min-w-[160px] max-w-[160px] ${index % 2 === 1 ? 'bg-gray-100 dark:bg-gray-800/60 group-hover:bg-gray-200 dark:group-hover:bg-gray-700/50' : 'bg-white group-hover:bg-gray-50 dark:bg-[var(--bg-card)] dark:group-hover:bg-gray-800/30'}`}>
                        <div className="flex flex-col overflow-hidden">
                          <span className="font-bold text-[12px] text-[var(--text-main)] truncate" title={emp.full_name}>{emp.full_name}</span>
                          <span className="text-[9px] text-[var(--text-muted)] font-semibold truncate" title={`${emp.emp_code} • ${emp.department_name || 'N/A'}`}>{emp.emp_code}</span>
                        </div>
                      </td>
                      {daysArray.map(day => {
                        const status = emp.days[day];
                        const shortStatus = getShortStatus(status);
                        const style = getCellStyles(status);

                        return (
                          <td key={day} className={`border-r border-[var(--border-color)] p-0 text-center relative`}>
                            <div className={`w-full h-full min-h-[36px] flex items-center justify-center ${style}`}>
                              {shortStatus}
                            </div>
                          </td>
                        );
                      })}
                      <td className="text-center font-black text-emerald-600 border-r border-[var(--border-color)]">{emp.summary.P}</td>
                      <td className="text-center font-black text-rose-600 border-r border-[var(--border-color)]">{emp.summary.A}</td>
                      <td className="text-center font-black text-blue-600 border-r border-[var(--border-color)]">{emp.summary.L}</td>
                      <td className="text-center font-black text-amber-600 border-r border-[var(--border-color)]">{emp.summary.Late}</td>
                      <td className="text-center font-black text-purple-600 border-r border-[var(--border-color)]">{emp.summary.HD}</td>
                      <td className="text-center font-black text-orange-600 border-r border-[var(--border-color)]">{emp.summary.H}</td>
                      <td className="text-center font-black text-gray-500">{emp.summary.OFF}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 items-center p-4 bg-[var(--bg-workspace)] border border-[var(--border-color)] rounded-2xl shadow-sm text-[11px] font-bold">
        <span className="text-[var(--text-muted)] uppercase tracking-wider mr-2">Legend:</span>
        <div className="flex items-center gap-1.5"><div className="w-4 h-4 rounded bg-emerald-100 flex items-center justify-center text-emerald-800 text-[9px]">P</div> Present</div>
        <div className="flex items-center gap-1.5"><div className="w-4 h-4 rounded bg-rose-100 flex items-center justify-center text-rose-800 text-[9px]">A</div> Absent</div>
        <div className="flex items-center gap-1.5"><div className="w-4 h-4 rounded bg-blue-100 flex items-center justify-center text-blue-800 text-[9px]">L</div> Leave</div>
        <div className="flex items-center gap-1.5"><div className="w-4 h-4 rounded bg-amber-100 flex items-center justify-center text-amber-800 text-[9px]">LT</div> Late</div>
        <div className="flex items-center gap-1.5"><div className="w-4 h-4 rounded bg-purple-100 flex items-center justify-center text-purple-800 text-[9px]">HD</div> Half Day</div>
        <div className="flex items-center gap-1.5"><div className="w-4 h-4 rounded bg-orange-100 flex items-center justify-center text-orange-800 text-[9px]">H</div> Holiday</div>
        <div className="flex items-center gap-1.5"><div className="w-4 h-4 rounded bg-gray-100 flex items-center justify-center text-gray-500 text-[9px]">OFF</div> Week Off</div>
      </div>
    </div>
  );
};

export default AttendanceMuster;
