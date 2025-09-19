import { ActivityLog, GitHubCommitData, GitHubPRData, GitHubIssueData } from '@/types';
import database from '@/lib/storage';

export class ActivityLogService {
  async createGitHubCommitLog(programId: string, commitData: GitHubCommitData, milestoneId?: string): Promise<void> {
    const content = {
      sha: commitData.sha,
      message: commitData.message,
      additions: commitData.additions,
      deletions: commitData.deletions,
      files: commitData.files,
      repository: commitData.repository
    };

    const url = `https://github.com/${commitData.repository}/commit/${commitData.sha}`;

    await database.createActivityLog({
      program_id: programId,
      source: 'github',
      type: 'commit',
      content,
      url,
      timestamp: new Date(commitData.date),
      user_github: commitData.author,
    });
  }

  async createGitHubPRLog(programId: string, prData: GitHubPRData): Promise<void> {
    const content = {
      number: prData.number,
      title: prData.title,
      body: prData.body,
      state: prData.state,
      merged: prData.merged,
      created_at: prData.created_at,
      updated_at: prData.updated_at,
      merged_at: prData.merged_at,
      repository: prData.repository
    };

    const url = `https://github.com/${prData.repository}/pull/${prData.number}`;
    
    await database.createActivityLog({
      program_id:programId,
      source: 'github',
      type: 'pull_request',
      content,
      url,
      timestamp: new Date(prData.created_at),
      user_github: prData.author,
    });
  }

  async createGitHubIssueLog(programId: string, issueData: GitHubIssueData, milestoneId?: string): Promise<void> {
    const content = {
      number: issueData.number,
      title: issueData.title,
      body: issueData.body,
      state: issueData.state,
      labels: issueData.labels,
      created_at: issueData.created_at,
      updated_at: issueData.updated_at,
      closed_at: issueData.closed_at,
      repository: issueData.repository
    };

    const url = `https://github.com/${issueData.repository}/issues/${issueData.number}`;

    await database.createActivityLog({
      program_id: programId,
      source: 'github',
      type: 'issue',
      content,
      timestamp: new Date(issueData.created_at),
      user_github: issueData.author,
    });
  }

  async createDiscordLog(
    program_id: string, 
    messageType: string, 
    content: any, 
    messageId: string, 
    authorId: string, 
    channelId: string,
    timestamp: Date,
    milestoneId?: string,
    projectId?: string
  ): Promise<void> {
    const discordContent = {
      message_id: messageId,
      channel_id: channelId,
      content: typeof content === 'string' ? content : content.content || '',
      embeds: content.embeds || [],
      attachments: content.attachments || []
    };
    
    await database.createActivityLog({
      program_id: program_id,
      source: 'discord',
      type: messageType as ActivityLog['type'],
      content: discordContent,
      timestamp,
      user_discord: authorId,
      milestone_id: milestoneId || "",
      project_id: projectId || ""
    });
  }

  async createManualLog(
    programId: string,
    type: string,
    content: any,
    milestoneId?: string,
    projectId?: string,
    userGithub?: string,
    userDiscord?: string
  ): Promise<void> {
    await database.createActivityLog({
      program_id: programId,
      source: 'manual',
      type: type as ActivityLog['type'],
      content,
      timestamp: new Date(),
      user_github: userGithub,
      user_discord: userDiscord,
      milestone_id: milestoneId || "",
      project_id: projectId || ""
    });
  }
}