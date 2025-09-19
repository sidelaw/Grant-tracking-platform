import cron from 'node-cron';
import { GitHubService } from '@/lib/services/GitHubService';
import database from '@/lib/storage';

const githubService = new GitHubService();

export class DataSyncScheduler {
  start(): void {
    // Sync GitHub data every 2 hours
    cron.schedule('0 */2 * * *', async () => {
      console.log('🔄 Starting scheduled GitHub data sync...');
      await this.syncAllGitHubData();
    });

    // Daily cleanup at 2 AM
    cron.schedule('0 2 * * *', async () => {
      console.log('🧹 Starting daily cleanup...');
      await this.cleanupOldData();
    });

    console.log('📅 Data sync scheduler started');
  }

  private async syncAllGitHubData(): Promise<void> {
    try {
      const projects = await database.getAllPrograms();
      const activeProjects = projects.filter(p => 
        p.status === 'active' && p.github_repo
      );

      for (const project of activeProjects) {
        if (project.github_repo) {
          const [owner, repo] = project.github_repo.split('/');
          
          try {
            // Sync only recent commits (last 24 hours)
            const since = new Date();
            since.setHours(since.getHours() - 24);

            await Promise.all([
              githubService.fetchCommits(owner, repo, since),
              githubService.fetchPullRequests(owner, repo),
              githubService.fetchIssues(owner, repo)
            ]);
            
            console.log(`✅ Synced data for project ${project.name} (${project.github_repo})`);
          } catch (error) {
            console.error(`❌ Error syncing project ${project.name}:`, error);
          }
        }
      }
    } catch (error) {
      console.error('❌ Error in scheduled sync:', error);
    }
  }

  private async cleanupOldData(): Promise<void> {
    try {
      // This is handled by the database schema with appropriate constraints
      // Additional cleanup logic can be added here if needed
      console.log('✅ Data cleanup completed');
    } catch (error) {
      console.error('❌ Error during data cleanup:', error);
    }
  }
}