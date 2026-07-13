import React, { useEffect, useState } from 'react';
import { fetchPendingConversionsApi, approveConversionApi, rejectConversionApi } from '../../../api/conversion';
import { Loader2, CheckCircle, XCircle, FileText, Download } from 'lucide-react';
import toast from 'react-hot-toast';
import Swal from 'sweetalert2';

const PendingConversions = () => {
    const [requests, setRequests] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setIsLoading(true);
        try {
            const res = await fetchPendingConversionsApi();
            if (res.data?.success) {
                setRequests(res.data.data);
            }
        } catch (error) {
            toast.error('Failed to load pending conversions');
        } finally {
            setIsLoading(false);
        }
    };

    const handleApprove = async (id) => {
        const result = await Swal.fire({
            title: 'Approve Conversion?',
            text: "This will finalize the conversion and generate a certificate.",
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#10b981',
            cancelButtonColor: '#6b7280',
            confirmButtonText: 'Yes, approve it!'
        });

        if (result.isConfirmed) {
            try {
                await approveConversionApi(id);
                toast.success('Conversion approved successfully!');
                loadData();
            } catch (error) {
                toast.error(error.response?.data?.error?.message || 'Failed to approve conversion');
            }
        }
    };

    const handleReject = async (id) => {
        const result = await Swal.fire({
            title: 'Reject Conversion?',
            text: "This will reject the conversion request and revert the status.",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            cancelButtonColor: '#6b7280',
            confirmButtonText: 'Yes, reject it!'
        });

        if (result.isConfirmed) {
            try {
                await rejectConversionApi(id);
                toast.success('Conversion rejected.');
                loadData();
            } catch (error) {
                toast.error(error.response?.data?.error?.message || 'Failed to reject conversion');
            }
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-[400px]">
                <Loader2 className="animate-spin text-[var(--accent)] w-10 h-10" />
            </div>
        );
    }

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-[1200px] mx-auto mt-4">
            <div className="flex items-center gap-4 mb-6">
                <div className="p-3 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl shadow-sm">
                    <FileText size={24} className="text-[var(--accent)]" />
                </div>
                <div>
                    <h1 className="text-2xl md:text-3xl font-black text-[var(--text-main)]">Pending Conversions</h1>
                    <p className="text-sm font-medium text-[var(--text-muted)] mt-1">Review and approve Intern/Trainee conversions.</p>
                </div>
            </div>

            <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-[var(--bg-workspace)] border-b border-[var(--border-color)]">
                                <th className="px-6 py-4 text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">Candidate Name</th>
                                <th className="px-6 py-4 text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">ID Code</th>
                                <th className="px-6 py-4 text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">From Role</th>
                                <th className="px-6 py-4 text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">Target Role</th>
                                <th className="px-6 py-4 text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">Requested By</th>
                                <th className="px-6 py-4 text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">Date</th>
                                <th className="px-6 py-4 text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {requests.length > 0 ? (
                                requests.map(req => (
                                    <tr key={req.request_id} className="border-b border-[var(--border-color)] hover:bg-[var(--bg-workspace)] transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="font-bold text-[var(--text-main)]">{req.first_name} {req.last_name}</div>
                                            <div className="text-xs text-[var(--text-muted)]">{req.email}</div>
                                        </td>
                                        <td className="px-6 py-4 font-semibold text-[var(--text-dim)]">{req.code}</td>
                                        <td className="px-6 py-4">
                                            <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs font-bold rounded">
                                                {req.intern_id ? 'Intern' : 'Trainee'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-bold rounded">
                                                {req.target_role}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-sm font-semibold text-[var(--text-main)]">{req.requested_by_name || 'System'}</td>
                                        <td className="px-6 py-4 text-sm font-medium text-[var(--text-muted)]">
                                            {new Date(req.created_at).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex justify-end gap-2">
                                                <button onClick={() => handleApprove(req.request_id)} className="flex items-center gap-1 px-3 py-1.5 bg-emerald-100 text-emerald-700 hover:bg-emerald-200 rounded-lg text-xs font-bold transition-colors">
                                                    <CheckCircle size={14} /> Approve
                                                </button>
                                                <button onClick={() => handleReject(req.request_id)} className="flex items-center gap-1 px-3 py-1.5 bg-rose-100 text-rose-700 hover:bg-rose-200 rounded-lg text-xs font-bold transition-colors">
                                                    <XCircle size={14} /> Reject
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="7" className="px-6 py-12 text-center text-[var(--text-muted)]">
                                        <div className="flex flex-col items-center">
                                            <CheckCircle size={40} className="text-[var(--border-color)] mb-3" />
                                            <p className="font-bold text-lg">No pending conversions</p>
                                            <p className="text-sm">All requests have been handled.</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default PendingConversions;
