import { Octokit } from '@octokit/rest';
import { ActivityLogService } from './ActivityLogService';
import { GitHubCommitData, GitHubPRData, GitHubIssueData, RepoActivityCheck } from '@/types';
import database from '@/lib/storage';


export class GitHubService {
  private octokit: Octokit;
  private activityLogService: ActivityLogService;

  constructor() {
    this.octokit = new Octokit({
      auth: process.env.GITHUB_TOKEN
    });
    this.activityLogService = new ActivityLogService();
  }

  async fetchCommits(owner: string, repo: string, since?: Date, limit: number = 100, page?: number): Promise<GitHubCommitData[]> {
    try {
      const params: any = {
        owner,
        repo,
        per_page: limit,
        sort: 'author-date',
        direction: 'desc',
      };
      if (page){
        params.page = page;
      }

      if (since) {
        params.since = since.toISOString();
      }

      const { data: commits } = await this.octokit.rest.repos.listCommits(params);
      const all_commits:GitHubCommitData[] = [];
      for (const commit of commits) {
        if (!commit.commit.author?.name || !commit.sha) continue;

        // Get detailed commit info
        const { data: detailedCommit } = await this.octokit.rest.repos.getCommit({
          owner,
          repo,
          ref: commit.sha
        });

        const commitData: GitHubCommitData = {
          sha: commit.sha,
          message: commit.commit.message,
          author: commit.author?.login || commit.commit.author?.name || 'unknown',
          email: commit.commit.author?.email || '',
          date: commit.commit.author?.date || new Date().toISOString(),
          additions: detailedCommit.stats?.additions || 0,
          deletions: detailedCommit.stats?.deletions || 0,
          files: detailedCommit.files?.map(f => f.filename) || [],
          repository: `${owner}/${repo}`,
          html_url: commit.html_url
        };
        all_commits.push(commitData);
      }

      return  all_commits;
    } catch (error) {
      console.error(`❌ Error fetching commits for ${owner}/${repo}:`, error);
      throw error;
    }
  }

  async fetchPullRequests(owner: string, repo: string, limit: number = 100, page?: number): Promise<GitHubPRData[]> {
    try {
      const params: any ={
        owner,
        repo,
        state: 'all',
        sort: 'updated',
        direction: 'desc',
        per_page: limit,
      }
      if (page){
        params.page = page;
      }
      const { data: prs } = await this.octokit.rest.pulls.list(params);
      const all_prs:GitHubPRData[] = [];
      for (const pr of prs) {
        if (!pr.user?.login) continue;

        const prData: GitHubPRData = {
          number: pr.number,
          title: pr.title,
          html_url: pr.html_url,
          body: pr.body || '',
          state: pr.state as 'open' | 'closed',
          merged: pr.merged_at !== null,
          author: pr.user.login,
          created_at: pr.created_at,
          updated_at: pr.updated_at,
          merged_at: pr.merged_at || undefined,
          repository: `${owner}/${repo}`
        };

        all_prs.push(prData);
      }

      return all_prs;
    } catch (error) {
      console.error(`❌ Error fetching PRs for ${owner}/${repo}:`, error);
      throw error;
    }
  }
  /**
   * Fetch issues from a GitHub repository and log new ones
   * @param owner - Repository owner
   * @param repo - Repository name
   * @param programId - Associated program ID
   */
  async fetchIssues(owner: string, repo: string, limit:number = 100, page?:number): Promise<GitHubIssueData[]> {
    try {
      const params: any = {
        owner,
        repo,
        state: 'all',
        sort: 'updated',
        direction: 'desc',
        per_page: limit,
      }
      if (page){
        params.page = page;
      }
      const { data: issues } = await this.octokit.rest.issues.listForRepo(params);
      const all_issues:GitHubIssueData[] = [];
      for (const issue of issues) {
        // Skip pull requests (GitHub API returns PRs as issues)
        if (issue.pull_request || !issue.user?.login) continue;

        const issueData: GitHubIssueData = {
          number: issue.number,
          title: issue.title,
          body: issue.body || '',
          state: issue.state as 'open' | 'closed',
          author: issue.user.login,

          labels: issue.labels.map((label: any) => typeof label === 'string' ? label : label.name
          ),
          created_at: issue.created_at,
          updated_at: issue.updated_at,
          closed_at: issue.closed_at || undefined,
          repository: `${owner}/${repo}`,
          // url should be title to lowercase and hyphenated
          html_url: issue.html_url
        };
        all_issues.push(issueData);
      }

      return all_issues;
    } catch (error) {
      console.error(`❌ Error fetching issues for ${owner}/${repo}:`, error);
      throw error;
    }
  }
  /**
   * Check if a repository has been abandoned (no activity in last 30 days)
   * @param owner - Repository owner
   * @param repo - Repository name
   * @param dayThreshold - Days to consider abandoned (default: 30)
   * @returns Object containing abandonment status and last activity info
   */
  async isRepoAbandoned(owner: string, repo: string, dayThreshold: number = 30): Promise<Boolean> {
    try {
      const thresholdDate = new Date();
      thresholdDate.setDate(thresholdDate.getDate() - dayThreshold);
      // Check for recent commits
      const recentActivity = await Promise.allSettled([
        this.fetchCommits(owner, repo, thresholdDate, 1),
        this.fetchPullRequests(owner, repo, 1),
        this.fetchIssues(owner, repo, 1)
      ]);

      if (recentActivity[0].status === 'fulfilled' && recentActivity[0].value.length > 0) {
        return false; // Recent commit found
      }
      if (recentActivity[1].status === 'fulfilled' && recentActivity[1].value.length > 0) {
        const prDate = new Date(recentActivity[1].value[0].updated_at);
        if (prDate > thresholdDate) {
          return false; // Recent PR found
        }
      }
      if (recentActivity[2].status === 'fulfilled' && recentActivity[2].value.length > 0) {
        const issueDate = new Date(recentActivity[2].value[0].updated_at);
        if (issueDate > thresholdDate) {
          return false; // Recent issue found
        }
      }

      return true; // No recent activity found
    } catch (error) {
      console.error(`❌ Error checking repo activity for ${owner}/${repo}:`, error);
      throw error;
    }
  }
}