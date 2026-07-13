import React, { useState, useEffect } from 'react';
import { getGitPullRequests, getGitIssues, getGitWorkflowRuns, getGitReleases } from '../../../../api/gitIntegration';
import { GitPullRequest, AlertCircle, PlayCircle, Tag } from 'lucide-react';

const CodebaseTracking = ({ repositoryOwner, repositoryName }) => {
    const [loading, setLoading] = useState(true);
    const [prs, setPrs] = useState([]);
    const [issues, setIssues] = useState([]);
    const [runs, setRuns] = useState([]);
    const [releases, setReleases] = useState([]);

    useEffect(() => {
        if (!repositoryOwner || !repositoryName) return;
        
        const fetchGitData = async () => {
            setLoading(true);
            try {
                const [prRes, issueRes, runRes, releaseRes] = await Promise.all([
                    getGitPullRequests(repositoryOwner, repositoryName),
                    getGitIssues(repositoryOwner, repositoryName),
                    getGitWorkflowRuns(repositoryOwner, repositoryName),
                    getGitReleases(repositoryOwner, repositoryName)
                ]);

                if (prRes.data?.success) setPrs(prRes.data.data);
                if (issueRes.data?.success) setIssues(issueRes.data.data);
                if (runRes.data?.success) setRuns(runRes.data.data);
                if (releaseRes.data?.success) setReleases(releaseRes.data.data);
            } catch (error) {
                console.error("Failed to fetch Git data", error);
            } finally {
                setLoading(false);
            }
        };

        fetchGitData();
    }, [repositoryOwner, repositoryName]);

    if (!repositoryOwner || !repositoryName) {
        return (
            <div className="p-8 text-center text-[var(--text-muted)]">
                <p>No repository linked to this project.</p>
            </div>
        );
    }

    if (loading) {
        return <div className="p-8 text-center">Loading Codebase Metrics...</div>;
    }

    return (
        <div className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-2xl bg-[var(--bg-workspace)] border border-[var(--border-color)]/50 shadow-sm">
                <div className="flex items-center gap-2 mb-4 text-[var(--text-main)] font-black">
                    <GitPullRequest size={18} className="text-blue-500" />
                    Open Pull Requests ({prs.filter(pr => pr.state === 'open').length})
                </div>
                {prs.length === 0 ? <p className="text-xs text-[var(--text-muted)]">No PRs found.</p> : (
                    <ul className="space-y-2 text-sm text-[var(--text-main)]">
                        {prs.slice(0, 3).map(pr => (
                            <li key={pr.id} className="border-b border-[var(--border-color)] pb-2">
                                <a href={pr.html_url} target="_blank" rel="noreferrer" className="hover:text-blue-500 font-bold">#{pr.number} {pr.title}</a>
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            <div className="p-4 rounded-2xl bg-[var(--bg-workspace)] border border-[var(--border-color)]/50 shadow-sm">
                <div className="flex items-center gap-2 mb-4 text-[var(--text-main)] font-black">
                    <AlertCircle size={18} className="text-rose-500" />
                    Open Issues ({issues.filter(i => i.state === 'open').length})
                </div>
                {issues.length === 0 ? <p className="text-xs text-[var(--text-muted)]">No Issues found.</p> : (
                    <ul className="space-y-2 text-sm text-[var(--text-main)]">
                        {issues.slice(0, 3).map(issue => (
                            <li key={issue.id} className="border-b border-[var(--border-color)] pb-2">
                                <a href={issue.html_url} target="_blank" rel="noreferrer" className="hover:text-rose-500 font-bold">#{issue.number} {issue.title}</a>
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            <div className="p-4 rounded-2xl bg-[var(--bg-workspace)] border border-[var(--border-color)]/50 shadow-sm">
                <div className="flex items-center gap-2 mb-4 text-[var(--text-main)] font-black">
                    <PlayCircle size={18} className="text-emerald-500" />
                    Recent Workflow Runs
                </div>
                {runs.length === 0 ? <p className="text-xs text-[var(--text-muted)]">No Actions found.</p> : (
                    <ul className="space-y-2 text-sm text-[var(--text-main)]">
                        {runs.slice(0, 3).map(run => (
                            <li key={run.id} className="border-b border-[var(--border-color)] pb-2 flex justify-between">
                                <span className="font-bold">{run.name}</span>
                                <span className={run.status === 'completed' && run.conclusion === 'success' ? 'text-emerald-500' : 'text-rose-500'}>
                                    {run.status === 'completed' ? run.conclusion : run.status}
                                </span>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
            
            <div className="p-4 rounded-2xl bg-[var(--bg-workspace)] border border-[var(--border-color)]/50 shadow-sm">
                <div className="flex items-center gap-2 mb-4 text-[var(--text-main)] font-black">
                    <Tag size={18} className="text-purple-500" />
                    Releases
                </div>
                {releases.length === 0 ? <p className="text-xs text-[var(--text-muted)]">No Releases found.</p> : (
                    <ul className="space-y-2 text-sm text-[var(--text-main)]">
                        {releases.slice(0, 3).map(release => (
                            <li key={release.id} className="border-b border-[var(--border-color)] pb-2">
                                <span className="font-bold">{release.name || release.tag_name}</span>
                                <span className="text-xs text-[var(--text-muted)] block">{new Date(release.created_at).toLocaleDateString()}</span>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
};

export default CodebaseTracking;
