const express = require('express');
const router = express.Router();
const gitController = require('./gitController');
const { verifyToken } = require('../../middleware/auth');

// Require internal auth to use the proxy
router.use(verifyToken);
router.get('/user/profile', gitController.getUserProfile);
router.get('/repos', gitController.getRepositories);
router.post('/repos', gitController.createRepository);
router.get('/repos/:owner/:repo/releases', gitController.getReleases);
router.get('/repos/:owner/:repo/releases/assets/:id', gitController.downloadReleaseAsset);
router.get('/repos/:owner/:repo/actions/runs', gitController.getWorkflowRuns);
router.get('/repos/:owner/:repo/issues', gitController.getIssues);
router.post('/repos/:owner/:repo/issues', gitController.createIssue);
router.get('/repos/:owner/:repo/pulls', gitController.getPullRequests);
router.post('/repos/:owner/:repo/pulls', gitController.createPullRequest);
router.get('/repos/:owner/:repo/compare', gitController.compareBranches);
router.get('/repos/:owner/:repo/compare/diffs', gitController.compareDiffs);
router.get('/repos/:owner/:repo/branches', gitController.getBranches);

// Local Workspace Git Operations
router.post('/local/clone', gitController.localClone);
router.get('/local/status', gitController.localStatus);
router.get('/local/branches', gitController.localBranches);
router.post('/local/pull', gitController.localPull);
router.post('/local/fetch', gitController.localFetch);
router.post('/local/push', gitController.localPush);
router.post('/local/stage', gitController.localStage);
router.post('/local/unstage', gitController.localUnstage);
router.post('/local/commit', gitController.localCommit);
router.post('/local/tag', gitController.localTag);
router.post('/local/push_tags', gitController.localPushTags);
router.get('/local/log', gitController.localLog);
router.get('/local/diff', gitController.localDiff);
router.post('/local/branch/checkout', gitController.localBranchCheckout);
router.post('/local/branch/create', gitController.localBranchCreate);
router.post('/local/branch/delete', gitController.localBranchDelete);

router.get('/local/fs/browse', gitController.localFsBrowse);

module.exports = router;
