import database from '@/lib/storage';
import { GitHubService } from '@/lib/services/GitHubService';
const githubService = new GitHubService();


export async function GET(req: Request) {
    try {
        const programs = await database.getAllPrograms();
        for (const program of programs) {
            if (program.github_repo) {
                const [owner, repo] = program.github_repo.split('/');
                const isAbandoned = await githubService.isRepoAbandoned(owner, repo);
                if (isAbandoned) {
                    await database.updateProgram(program.id, { status: 'At risk' });
                    // logic to notify stakeholders about the abandoned repo can be added here
                    // use program.grantee_email to send notification
                }
            }
        
        }

        return new Response(JSON.stringify({
            message: 'GitHub data sync initiated'

        }), { status: 200 }); 
    } catch (error) {
        console.error('Error syncing GitHub data:', error);
        return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500 }); 
    }
}
