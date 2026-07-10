const gitEngineClient = require('../../utils/gitEngineClient');

// Since Product Registration focuses on Gitea (Remote Git Engine), 
// we will primarily proxy endpoints to /api/v1/remote.

exports.getRepositories = async (req, res) => {
    try {
        const response = await gitEngineClient.get('/api/v1/remote/repos');
        res.status(200).json({ success: true, data: response.data.repos });
    } catch (error) {
        console.error('Error fetching repositories from Git Engine:', error.response?.data || error.message);
        res.status(500).json({ success: false, error: { message: 'Failed to fetch repositories' } });
    }
};

exports.createRepository = async (req, res) => {
    try {
        const response = await gitEngineClient.post('/api/v1/remote/repos', req.body);
        res.status(200).json(response.data);
    } catch (error) {
        console.error('Error creating repository from Git Engine:', error.response?.data || error.message);
        res.status(500).json({ success: false, error: { message: error.response?.data?.detail || error.message } });
    }
};

exports.getBranches = async (req, res) => {
    try {
        const { owner, repo } = req.params;
        const response = await gitEngineClient.get(`/api/v1/remote/repos/${owner}/${repo}/branches`);
        res.status(200).json({ success: true, data: response.data.branches });
    } catch (error) {
        console.error('Error fetching branches from Git Engine:', error.response?.data || error.message);
        res.status(500).json({ success: false, error: { message: 'Failed to fetch branches' } });
    }
};

exports.getReleases = async (req, res) => {
    try {
        const { owner, repo } = req.params;
        const response = await gitEngineClient.get(`/api/v1/remote/repos/${owner}/${repo}/releases`);
        res.status(200).json({ success: true, data: response.data.releases });
    } catch (error) {
        console.error('Error fetching releases from Git Engine:', error.response?.data || error.message);
        res.status(500).json({ success: false, error: { message: 'Failed to fetch releases' } });
    }
};

exports.getWorkflowRuns = async (req, res) => {
    try {
        const { owner, repo } = req.params;
        const response = await gitEngineClient.get(`/api/v1/remote/repos/${owner}/${repo}/actions/runs`);
        res.status(200).json({ success: true, data: response.data.runs });
    } catch (error) {
        console.error('Error fetching workflow runs from Git Engine:', error.response?.data || error.message);
        res.status(500).json({ success: false, error: { message: 'Failed to fetch workflow runs' } });
    }
};

exports.getIssues = async (req, res) => {
    try {
        const { owner, repo } = req.params;
        const response = await gitEngineClient.get(`/api/v1/remote/repos/${owner}/${repo}/issues`);
        res.status(200).json({ success: true, data: response.data.issues });
    } catch (error) {
        console.error('Error fetching issues from Git Engine:', error.response?.data || error.message);
        res.status(500).json({ success: false, error: { message: 'Failed to fetch issues' } });
    }
};

exports.getPullRequests = async (req, res) => {
    try {
        const { owner, repo } = req.params;
        const response = await gitEngineClient.get(`/api/v1/remote/repos/${owner}/${repo}/pulls`);
        res.status(200).json({ success: true, data: response.data.pulls });
    } catch (error) {
        console.error('Error fetching PRs from Git Engine:', error.response?.data || error.message);
        res.status(500).json({ success: false, error: { message: 'Failed to fetch pull requests' } });
    }
};

// ==========================================
// LOCAL GIT WORKSPACE ENDPOINTS
// ==========================================

exports.localClone = async (req, res) => {
    try {
        const response = await gitEngineClient.post('/api/v1/local/clone', req.body);
        res.status(200).json(response.data);
    } catch (error) {
        res.status(500).json({ success: false, error: { message: error.response?.data?.detail || error.message } });
    }
};

exports.localStatus = async (req, res) => {
    try {
        const response = await gitEngineClient.get(`/api/v1/local/status?repo_name=${req.query.repo_name}`);
        res.status(200).json(response.data);
    } catch (error) {
        res.status(500).json({ success: false, error: { message: error.response?.data?.detail || error.message } });
    }
};

exports.localBranches = async (req, res) => {
    try {
        const response = await gitEngineClient.get(`/api/v1/local/branches?repo_name=${req.query.repo_name}`);
        res.status(200).json(response.data);
    } catch (error) {
        res.status(500).json({ success: false, error: { message: error.response?.data?.detail || error.message } });
    }
};

exports.localPull = async (req, res) => {
    try {
        const response = await gitEngineClient.post('/api/v1/local/pull', req.body);
        res.status(200).json(response.data);
    } catch (error) {
        res.status(500).json({ success: false, error: { message: error.response?.data?.detail || error.message } });
    }
};

exports.localFetch = async (req, res) => {
    try {
        const response = await gitEngineClient.post('/api/v1/local/fetch', req.body);
        res.status(200).json(response.data);
    } catch (error) {
        res.status(500).json({ success: false, error: { message: error.response?.data?.detail || error.message } });
    }
};

exports.localPush = async (req, res) => {
    try {
        const response = await gitEngineClient.post('/api/v1/local/push', req.body);
        res.status(200).json(response.data);
    } catch (error) {
        res.status(500).json({ success: false, error: { message: error.response?.data?.detail || error.message } });
    }
};

exports.localStage = async (req, res) => {
    try {
        const response = await gitEngineClient.post('/api/v1/local/stage', req.body);
        res.status(200).json(response.data);
    } catch (error) {
        res.status(500).json({ success: false, error: { message: error.response?.data?.detail || error.message } });
    }
};

exports.localUnstage = async (req, res) => {
    try {
        const response = await gitEngineClient.post('/api/v1/local/unstage', req.body);
        res.status(200).json(response.data);
    } catch (error) {
        res.status(500).json({ success: false, error: { message: error.response?.data?.detail || error.message } });
    }
};

exports.localCommit = async (req, res) => {
    try {
        const response = await gitEngineClient.post('/api/v1/local/commit', req.body);
        res.status(200).json(response.data);
    } catch (error) {
        res.status(500).json({ success: false, error: { message: error.response?.data?.detail || error.message } });
    }
};

exports.localTag = async (req, res) => {
    try {
        const response = await gitEngineClient.post('/api/v1/local/tag', req.body);
        res.status(200).json(response.data);
    } catch (error) {
        res.status(500).json({ success: false, error: { message: error.response?.data?.detail || error.message } });
    }
};

exports.localPushTags = async (req, res) => {
    try {
        const response = await gitEngineClient.post('/api/v1/local/push_tags', req.body);
        res.status(200).json(response.data);
    } catch (error) {
        res.status(500).json({ success: false, error: { message: error.response?.data?.detail || error.message } });
    }
};

exports.localLog = async (req, res) => {
    try {
        const { repo_name, max_count } = req.query;
        let url = `/api/v1/local/log?repo_name=${repo_name}`;
        if (max_count) url += `&max_count=${max_count}`;
        const response = await gitEngineClient.get(url);
        res.status(200).json(response.data);
    } catch (error) {
        res.status(500).json({ success: false, error: { message: error.response?.data?.detail || error.message } });
    }
};

exports.localDiff = async (req, res) => {
    try {
        const { repo_name, filename, commit_hash } = req.query;
        let url = `/api/v1/local/diff?repo_name=${repo_name}`;
        if (filename) url += `&filename=${encodeURIComponent(filename)}`;
        if (commit_hash) url += `&commit_hash=${commit_hash}`;
        const response = await gitEngineClient.get(url);
        res.status(200).json(response.data);
    } catch (error) {
        res.status(500).json({ success: false, error: { message: error.response?.data?.detail || error.message } });
    }
};

exports.localBranchCheckout = async (req, res) => {
    try {
        const response = await gitEngineClient.post('/api/v1/local/branch/checkout', req.body);
        res.status(200).json(response.data);
    } catch (error) {
        res.status(500).json({ success: false, error: { message: error.response?.data?.detail || error.message } });
    }
};

exports.localBranchCreate = async (req, res) => {
    try {
        const response = await gitEngineClient.post('/api/v1/local/branch/create', req.body);
        res.status(200).json(response.data);
    } catch (error) {
        res.status(500).json({ success: false, error: { message: error.response?.data?.detail || error.message } });
    }
};

exports.localBranchDelete = async (req, res) => {
    try {
        const response = await gitEngineClient.post('/api/v1/local/branch/delete', req.body);
        res.status(200).json(response.data);
    } catch (error) {
        res.status(500).json({ success: false, error: { message: error.response?.data?.detail || error.message } });
    }
};
