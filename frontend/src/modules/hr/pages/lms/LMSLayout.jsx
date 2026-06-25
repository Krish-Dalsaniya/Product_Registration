import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, useOutletContext } from 'react-router-dom';
import { motion } from 'framer-motion';
import { BookOpen, Users, CheckCircle, GraduationCap, Award } from 'lucide-react';
import { getDashboardStatsApi } from '../../../../api/lms';
import toast from 'react-hot-toast';

const LMSLayout = () => {
    const context = useOutletContext();
    const updateTabLabel = context?.updateTabLabel;
    const [stats, setStats] = useState({ total_modules: 0, active_trainees: 0, completed_courses: 0 });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (updateTabLabel) {
            updateTabLabel(window.location.pathname + window.location.search, 'LMS Dashboard');
        }
        fetchStats();
    }, [updateTabLabel]);

    const fetchStats = async () => {
        try {
            const { data } = await getDashboardStatsApi();
            if (data.success) {
                setStats(data.data);
            }
        } catch (error) {
            console.error('Error fetching LMS stats:', error);
            toast.error('Failed to load LMS statistics');
        } finally {
            setLoading(false);
        }
    };

    const statCards = [
        {
            title: 'Total Modules',
            value: stats.total_modules || '0',
            icon: BookOpen,
            color: 'text-blue-500',
            bg: 'bg-blue-500/10'
        },
        {
            title: 'Active Trainees',
            value: stats.active_trainees || '0',
            icon: Users,
            color: 'text-rose-500',
            bg: 'bg-rose-500/10'
        },
        {
            title: 'Completed Courses',
            value: stats.completed_courses || '0',
            icon: CheckCircle,
            color: 'text-emerald-500',
            bg: 'bg-emerald-500/10'
        }
    ];

    const tabs = [
        { name: 'Training Modules', path: '/hr/lms/modules', icon: BookOpen },
        { name: 'Assigned Trainings', path: '/hr/lms/assignments', icon: Users },
        { name: 'Assessments & Results', path: '/hr/lms/assessments', icon: Award }
    ];

    return (
        <div className="space-y-6">
            <motion.div 
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center justify-between"
            >
                <div>
                    <h1 className="text-3xl font-black text-[var(--text-main)] flex items-center gap-3">
                        <GraduationCap className="w-8 h-8 text-[var(--accent)]" />
                        Learning Management
                    </h1>
                    <p className="text-[var(--text-muted)] mt-1">
                        Manage training modules, assign courses, and track employee progress.
                    </p>
                </div>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {statCards.map((card, idx) => (
                    <motion.div 
                        key={idx}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: idx * 0.1 }}
                        className="bg-[var(--bg-card)] backdrop-blur-xl p-6 rounded-2xl border border-[var(--border-color)] shadow-sm flex items-center gap-5"
                    >
                        <div className={`p-4 rounded-xl ${card.bg}`}>
                            <card.icon className={`w-8 h-8 ${card.color}`} />
                        </div>
                        <div>
                            <p className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
                                {card.title}
                            </p>
                            <h3 className="text-3xl font-black text-[var(--text-main)] mt-1">
                                {loading ? '...' : card.value}
                            </h3>
                        </div>
                    </motion.div>
                ))}
            </div>

            <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl overflow-hidden flex flex-col h-[calc(100vh-320px)]">
                <div className="flex border-b border-[var(--border-color)] bg-[var(--bg-workspace)]/50">
                    {tabs.map((tab) => (
                        <NavLink
                            key={tab.path}
                            to={tab.path}
                            className={({ isActive }) => 
                                `px-6 py-4 font-bold text-sm flex items-center gap-2 border-b-2 transition-all ${
                                    isActive 
                                    ? 'border-[var(--accent)] text-[var(--accent)] bg-[var(--accent)]/5' 
                                    : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-card)]'
                                }`
                            }
                        >
                            <tab.icon className="w-4 h-4" />
                            {tab.name}
                        </NavLink>
                    ))}
                </div>

                <div className="flex-1 overflow-auto bg-[var(--bg-card)]">
                    <Outlet context={{ refreshStats: fetchStats }} />
                </div>
            </div>
        </div>
    );
};

export default LMSLayout;
