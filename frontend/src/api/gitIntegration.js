import api from './axiosInstance';

export const getGitUserProfile = async () => {
    return api.get('/integrations/git/user/profile');
};

export const getGitRepositories = async () => {
    return api.get('/integrations/git/repos');
};

export const createGitRepository = async (data) => {
    return api.post('/integrations/git/repos', data);
};

export const getGitReleases = async (owner, repo) => {
    return api.get(`/integrations/git/repos/${owner}/${repo}/releases`);
};

export const downloadGitReleaseAsset = async (owner, repo, assetId) => {
    return api.get(`/integrations/git/repos/${owner}/${repo}/releases/assets/${assetId}`, {
        responseType: 'blob'
    });
};

export const getGitWorkflowRuns = async (owner, repo) => {
    return api.get(`/integrations/git/repos/${owner}/${repo}/actions/runs`);
};

export const getGitIssues = async (owner, repo) => {
    return api.get(`/integrations/git/repos/${owner}/${repo}/issues`);
};

export const createGitIssue = async (owner, repo, data) => {
    return api.post(`/integrations/git/repos/${owner}/${repo}/issues`, data);
};

export const getGitPullRequests = async (owner, repo) => {
    return api.get(`/integrations/git/repos/${owner}/${repo}/pulls`);
};

export const createGitPullRequest = async (owner, repo, data) => {
    return api.post(`/integrations/git/repos/${owner}/${repo}/pulls`, data);
};

export const compareGitBranches = async (owner, repo, base, head) => {
    return api.get(`/integrations/git/repos/${owner}/${repo}/compare?base=${base}&head=${head}`);
};

export const compareGitDiffs = async (owner, repo, base, head) => {
    return api.get(`/integrations/git/repos/${owner}/${repo}/compare/diffs?base=${base}&head=${head}`);
};

export const getGitBranches = async (owner, repo) => {
    return api.get(`/integrations/git/repos/${owner}/${repo}/branches`);
};

// ==========================================
// LOCAL GIT WORKSPACE API CALLS
// ==========================================

export const localGitClone = (data) => api.post('/integrations/git/local/clone', data);
export const localGitStatus = (repo_name) => api.get(`/integrations/git/local/status?repo_name=${repo_name}`);
export const localGitBranches = (repo_name) => api.get(`/integrations/git/local/branches?repo_name=${repo_name}`);
export const localGitPull = (data) => api.post('/integrations/git/local/pull', data);
export const localGitFetch = (data) => api.post('/integrations/git/local/fetch', data);
export const localGitPush = (data) => api.post('/integrations/git/local/push', data);
export const localGitStage = (data) => api.post('/integrations/git/local/stage', data);
export const localGitUnstage = (data) => api.post('/integrations/git/local/unstage', data);
export const localGitCommit = (data) => api.post('/integrations/git/local/commit', data);
export const localGitTag = (data) => api.post('/integrations/git/local/tag', data);
export const localGitPushTags = (data) => api.post('/integrations/git/local/push_tags', data);
export const localGitLog = (repo_name, max_count = 50) => api.get(`/integrations/git/local/log?repo_name=${repo_name}&max_count=${max_count}`);
export const localGitDiff = (repo_name, filename = '', commit_hash = '') => {
    let url = `/integrations/git/local/diff?repo_name=${repo_name}`;
    if (filename) url += `&filename=${encodeURIComponent(filename)}`;
    if (commit_hash) url += `&commit_hash=${commit_hash}`;
    return api.get(url);
};

export const localGitBranchCheckout = (data) => api.post('/integrations/git/local/branch/checkout', data);
export const localGitBranchCreate = (data) => api.post('/integrations/git/local/branch/create', data);
export const localGitBranchDelete = (data) => api.post('/integrations/git/local/branch/delete', data);

export const localFsBrowse = (path = '') => {
    let url = '/integrations/git/local/fs/browse';
    if (path) url += `?path=${encodeURIComponent(path)}`;
    return api.get(url);
};
