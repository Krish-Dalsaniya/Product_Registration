import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, Calendar, CheckCircle2, XCircle, AlertCircle, LogIn, LogOut, Loader2, QrCode } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import DataTable from '../../../components/shared/DataTable';
import { generateVerificationTokenApi } from '../../../api/attendance';
import toast from 'react-hot-toast';

const EmployeeAttendanceDashboard = ({ records, user }) => {
  const navigate = useNavigate();
  const [isPunching, setIsPunching] = useState(false);
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [qrToken, setQrToken] = useState('');
  const [qrAction, setQrAction] = useState('');
  const [qrCountdown, setQrCountdown] = useState(60);
  const timerRef = useRef(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // Metrics calculation
  const totalPresent = records.filter(r => r.status === 'Present').length;
  const totalAbsent = records.filter(r => r.status === 'Absent').length;
  const totalLate = records.filter(r => r.status === 'Late').length;
  const totalLeave = records.filter(r => r.status === 'On Leave').length;

  const handlePunch = async (actionType) => {
    try {
      setIsPunching(true);
      const res = await generateVerificationTokenApi({
        employee_id: user.employee_id,
        action_type: actionType
      });
      if (res.data?.success) {
        setQrToken(res.data.data.token);
        setQrAction(actionType);
        setQrCountdown(60);
        setIsQrModalOpen(true);
        
        if (timerRef.current) clearInterval(timerRef.current);
        timerRef.current = setInterval(() => {
          setQrCountdown((prev) => {
            if (prev <= 1) {
              clearInterval(timerRef.current);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      } else {
        toast.error('Failed to initialize attendance verification');
      }
    } catch (error) {
      console.error(error);
      toast.error('Error starting attendance flow');
    } finally {
      setIsPunching(false);
    }
  };

  const closeQrModal = () => {
    setIsQrModalOpen(false);
    if (timerRef.current) clearInterval(timerRef.current);
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Present': return <span className="bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 px-3 py-1 rounded-lg text-[11px] font-bold tracking-wide">PRESENT</span>;
      case 'Absent': return <span className="bg-rose-500/10 text-rose-600 border border-rose-500/20 px-3 py-1 rounded-lg text-[11px] font-bold tracking-wide">ABSENT</span>;
      case 'Late': return <span className="bg-amber-500/10 text-amber-600 border border-amber-500/20 px-3 py-1 rounded-lg text-[11px] font-bold tracking-wide">LATE</span>;
      case 'Half Day': return <span className="bg-orange-500/10 text-orange-600 border border-orange-500/20 px-3 py-1 rounded-lg text-[11px] font-bold tracking-wide">HALF DAY</span>;
      case 'On Leave': return <span className="bg-blue-500/10 text-blue-600 border border-blue-500/20 px-3 py-1 rounded-lg text-[11px] font-bold tracking-wide">ON LEAVE</span>;
      default: return <span className="bg-gray-500/10 text-gray-600 border border-gray-500/20 px-3 py-1 rounded-lg text-[11px] font-bold tracking-wide">{status}</span>;
    }
  };

  const formatTime = (utcString) => {
    if (!utcString) return '--:--';
    const d = new Date(utcString);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  const columns = [
    { key: 'date', label: 'Date', render: (row) => <span className="font-semibold text-[var(--text-main)]">{formatDate(row.date)}</span> },
    { key: 'status', label: 'Status', render: (row) => getStatusBadge(row.status) },
    { key: 'clock_in', label: 'Clock In', render: (row) => formatTime(row.clock_in) },
    { key: 'clock_out', label: 'Clock Out', render: (row) => formatTime(row.clock_out) },
    { key: 'work_hours', label: 'Work Hrs', render: (row) => (
      <span className="font-semibold text-[var(--text-main)]">
        {row.work_hours ? `${row.work_hours}h` : '--'}
      </span>
    ) }
  ];

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-[1200px] mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 mt-4 animate-entrance-down">
        <div className="flex items-center gap-5">
          <div className="p-3 md:p-4 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl shadow-sm group">
            <Clock size={24} className="md:w-[28px] md:h-[28px] text-[var(--accent)] group-hover:scale-110 transition-transform duration-300" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-black text-[var(--text-main)] tracking-tight leading-none">
              My Attendance
            </h1>
            <p className="text-sm font-medium text-[var(--text-muted)] mt-1.5">View your daily logs and attendance metrics.</p>
          </div>
        </div>
        
        <div className="flex gap-3 w-full md:w-auto">
          <button 
            onClick={() => handlePunch('Clock In')}
            disabled={isPunching}
            className="btn-primary px-6 py-3.5 flex items-center justify-center gap-2 flex-1 md:flex-none hover:scale-105 active:scale-95 transition-all shadow-lg"
          >
            {isPunching ? <Loader2 size={18} className="animate-spin" /> : <LogIn size={18} />}
            <span className="font-bold text-[13px]">Punch In</span>
          </button>
          
          <button 
            onClick={() => handlePunch('Clock Out')}
            disabled={isPunching}
            className="bg-white border-2 border-[var(--border-color)] text-[var(--text-main)] hover:bg-gray-50 px-6 py-3.5 flex items-center justify-center gap-2 flex-1 md:flex-none rounded-xl hover:scale-105 active:scale-95 transition-all shadow-sm"
          >
            {isPunching ? <Loader2 size={18} className="animate-spin text-gray-400" /> : <LogOut size={18} className="text-gray-500" />}
            <span className="font-bold text-[13px]">Punch Out</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-5 hover:border-[var(--accent)] transition-all cursor-default relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform"><CheckCircle2 size={48} className="text-emerald-500"/></div>
          <p className="text-[11px] font-black text-[var(--text-muted)] uppercase tracking-wider mb-1">Present</p>
          <p className="text-3xl font-black text-[var(--text-main)]">{totalPresent}</p>
        </div>
        
        <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-5 hover:border-[var(--accent)] transition-all cursor-default relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform"><XCircle size={48} className="text-rose-500"/></div>
          <p className="text-[11px] font-black text-[var(--text-muted)] uppercase tracking-wider mb-1">Absent</p>
          <p className="text-3xl font-black text-[var(--text-main)]">{totalAbsent}</p>
        </div>
        
        <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-5 hover:border-[var(--accent)] transition-all cursor-default relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform"><AlertCircle size={48} className="text-amber-500"/></div>
          <p className="text-[11px] font-black text-[var(--text-muted)] uppercase tracking-wider mb-1">Late</p>
          <p className="text-3xl font-black text-[var(--text-main)]">{totalLate}</p>
        </div>

        <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-5 hover:border-[var(--accent)] transition-all cursor-default relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform"><Calendar size={48} className="text-blue-500"/></div>
          <p className="text-[11px] font-black text-[var(--text-muted)] uppercase tracking-wider mb-1">On Leave</p>
          <p className="text-3xl font-black text-[var(--text-main)]">{totalLeave}</p>
        </div>
      </div>

      <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl overflow-hidden shadow-sm">
        <div className="px-6 py-5 border-b border-[var(--border-color)]">
          <h3 className="text-[16px] font-black text-[var(--text-main)]">Recent Logs</h3>
        </div>
        <DataTable columns={columns} data={records} />
      </div>

      {/* QR Modal */}
      {isQrModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={closeQrModal} />
          <div className="relative bg-white border border-[var(--border-color)] rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex flex-col items-center p-8">
              <h2 className="text-2xl font-black text-gray-900 mb-1">{qrAction} Verification</h2>
              <p className="text-[13px] font-medium text-gray-500 mb-8 text-center leading-relaxed">
                Scan this QR code with your mobile device to complete the liveness check and record your attendance.
              </p>
              
              <div className="bg-white p-4 rounded-2xl shadow-inner border border-gray-100 relative">
                {qrCountdown === 0 && (
                  <div className="absolute inset-0 bg-white/90 backdrop-blur-[2px] rounded-2xl flex flex-col items-center justify-center z-10">
                    <AlertCircle className="text-rose-500 mb-2" size={32} />
                    <p className="font-bold text-gray-800">QR Expired</p>
                    <button onClick={() => handlePunch(qrAction)} className="mt-3 text-xs font-bold text-[var(--accent)] hover:underline">
                      Generate New
                    </button>
                  </div>
                )}
                <QRCodeSVG 
                  value={`${window.location.origin}/attendance/verify/${qrToken}`} 
                  size={200}
                  level="H"
                  fgColor="#111827"
                />
              </div>

              <div className="mt-8 flex items-center gap-2 bg-gray-50 px-4 py-2 rounded-full border border-gray-100">
                <Clock size={14} className={qrCountdown < 10 ? 'text-rose-500' : 'text-gray-400'} />
                <span className={`text-[12px] font-bold ${qrCountdown < 10 ? 'text-rose-500' : 'text-gray-600'}`}>
                  Expires in {qrCountdown}s
                </span>
              </div>
            </div>
            
            <div className="bg-gray-50 border-t border-gray-100 p-4 flex justify-center">
              <button
                onClick={closeQrModal}
                className="text-[13px] font-bold text-gray-500 hover:text-gray-800 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeeAttendanceDashboard;
