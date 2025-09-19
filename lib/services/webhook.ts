import { GitHubService } from '../services/GitHubService';
import { ActivityLogService } from '../services/ActivityLogService';
import database from '../storage';

export class GitHubWebhookHandler {
  private githubService: GitHubService;
  private activityLogService: ActivityLogService;

  constructor() {
    this.githubService = new GitHubService();
    this.activityLogService = new ActivityLogService();
  }

async getProgramIdByRepository(repoFullName: string): Promise<string | null> {
    if (!repoFullName) return null;

    try {
        const program = await database.getProgramByRepository(repoFullName);
        return program ? program.id : null;
    } catch (error) {
      console.error('Error getting program by repository:', error);
      return null;
    }
  }
async handlePushEvent(payload: any, projectId: string): Promise<void> {
    for (const commit of payload.commits) {
      try {
        const [owner, repo] = payload.repository.full_name.split('/');
        const { data: commitData } = await this.githubService['octokit'].rest.repos.getCommit({
          owner,
          repo,
          ref: commit.id
        });

        const commitInfo = {
          sha: commit.id,
          message: commit.message,
          author: commitData.commit.author?.name || payload.pusher?.name || 'unknown',
          email: commitData.commit.author?.email || payload.pusher?.email || '',
          date: commit.timestamp || new Date().toISOString(),
          additions: commitData.stats?.additions || 0,
          deletions: commitData.stats?.deletions || 0,
          files: commitData.files?.map(f => f.filename) || [],
          repository: payload.repository.full_name,
          html_url: commit.url,
        };

        // Check if commit already exists
        const exists = await database.commitExists(projectId, commit.id);
        if (!exists) {
          await this.activityLogService.createGitHubCommitLog(projectId, commitInfo);
        }
      } catch (error) {
        console.error(`Error processing commit ${commit.id}:`, error);
      }
    }
  }

 async handlePullRequestEvent(payload: any, projectId: string): Promise<void> {
    try {
      const prData = {
        number: payload.pull_request.number,
        title: payload.pull_request.title,
        body: payload.pull_request.body || '',
        state: payload.pull_request.state as 'open' | 'closed',
        merged: payload.pull_request.merged || false,
        author: payload.pull_request.user?.login || 'unknown',
        created_at: payload.pull_request.created_at,
        updated_at: payload.pull_request.updated_at,
        merged_at: payload.pull_request.merged_at,
        repository: payload.repository.full_name,
        html_url: payload.pull_request.html_url
      };
      
      await this.activityLogService.createGitHubPRLog(projectId, prData);
    } catch (error) {
      console.error(`Error processing PR #${payload.pull_request?.number}:`, error);
    }
  }

async handleIssueEvent(payload: any, projectId: string): Promise<void> {
    try {
      const issueData = {
        number: payload.issue.number,
        title: payload.issue.title,
        body: payload.issue.body || '',
        state: payload.issue.state as 'open' | 'closed',
        author: payload.issue.user?.login || 'unknown',
        labels: payload.issue.labels?.map((l: any) => l.name) || [],
        created_at: payload.issue.created_at,
        updated_at: payload.issue.updated_at,
        closed_at: payload.issue.closed_at,
        html_url: payload.issue.html_url,
        repository: payload.repository.full_name
      };


      await this.activityLogService.createGitHubIssueLog(projectId, issueData);
    } catch (error) {
      console.error(`Error processing issue #${payload.issue?.number}:`, error);
    }
  }

}