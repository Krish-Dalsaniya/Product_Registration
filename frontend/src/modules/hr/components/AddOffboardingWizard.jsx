import React, { useState, useEffect } from 'react';
import { Loader2, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { fetchHREmployeesApi, createOffboardingRecordApi } from '../../../api/hr';

const AddOffboardingWizard = ({ onClose, onSuccess }) => {
    const [employees, setEmployees] = useState([]);
    const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
    const [resignationDate, setResignationDate] = useState('');
    const [lastWorkingDay, setLastWorkingDay] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        const loadEmployees = async () => {
            try {
                const res = await fetchHREmployeesApi();
                if (res.data?.success) {
                    setEmployees(res.data.data);
                }
            } catch (error) {
                console.error('Failed to load employees for offboarding', error);
            }
        };
        loadEmployees();
    }, []);

    const handleCreate = async (e) => {
        e.preventDefault();
        if (!selectedEmployeeId) return toast.error('Select an employee');
        
        try {
            setIsSubmitting(true);
            const res = await createOffboardingRecordApi({
                employee_id: selectedEmployeeId,
                resignation_date: resignationDate || null,
                last_working_day: lastWorkingDay || null
            });
            if (res.data?.success) {
                toast.success('Offboarding initiated!');
                onSuccess();
            }
        } catch (error) {
            toast.error(error.response?.data?.error?.message || 'Failed to start offboarding');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
                <div className="p-5 border-b border-[var(--border-color)] flex items-center justify-between">
                    <h2 className="text-lg font-black text-[var(--text-main)]">Start New Offboarding</h2>
                    <button 
                        onClick={onClose}
                        className="p-2 hover:bg-[var(--bg-body)] rounded-xl text-[var(--text-muted)] hover:text-rose-500 transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>
                <form onSubmit={handleCreate} className="p-5 space-y-5">
                    <div>
                        <label className="block text-[12px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2">
                            Select Employee
                        </label>
                        <select
                            value={selectedEmployeeId}
                            onChange={(e) => setSelectedEmployeeId(e.target.value)}
                            className="w-full px-4 py-2.5 bg-[var(--bg-workspace)] border border-[var(--border-color)] rounded-xl text-[14px] font-semibold text-[var(--text-main)] outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20 transition-all"
                            required
                        >
                            <option value="">-- Choose Employee --</option>
                            {employees.map(emp => (
                                <option key={emp.employee_id} value={emp.employee_id}>
                                    {emp.full_name} ({emp.emp_code})
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-[12px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2">
                                Resignation Date
                            </label>
                            <input
                                type="date"
                                value={resignationDate}
                                onChange={(e) => setResignationDate(e.target.value)}
                                className="w-full px-4 py-2.5 bg-[var(--bg-workspace)] border border-[var(--border-color)] rounded-xl text-[14px] font-semibold text-[var(--text-main)] outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20 transition-all"
                            />
                        </div>
                        <div>
                            <label className="block text-[12px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2">
                                Last Working Day
                            </label>
                            <input
                                type="date"
                                value={lastWorkingDay}
                                onChange={(e) => setLastWorkingDay(e.target.value)}
                                className="w-full px-4 py-2.5 bg-[var(--bg-workspace)] border border-[var(--border-color)] rounded-xl text-[14px] font-semibold text-[var(--text-main)] outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20 transition-all"
                            />
                        </div>
                    </div>
                    <div className="pt-4 flex items-center justify-end gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-5 py-2.5 text-[14px] font-bold text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="flex items-center gap-2 bg-[var(--accent)] text-white px-6 py-2.5 rounded-xl text-[14px] font-bold hover:bg-opacity-90 transition-all shadow-sm shadow-[var(--accent)]/20 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isSubmitting && <Loader2 size={16} className="animate-spin" />}
                            Create Record
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AddOffboardingWizard;
