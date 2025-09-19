import database from '@/lib/storage';



export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const program = await database.getProgram(id);
        if (!program) {
            return new Response(JSON.stringify({ error: 'Program not found' }), { status: 404 });
        }
        
        const [ stats, activities, activityStats] = await Promise.all([
          database.getProgramStats(id),
          database.getProgramActivities(id, { limit: 10 }),
          database.getActivityStats(id)
        ]);
        const payload = {
          stats,
          recentActivities: activities,
          activityStats
        }
        if (program.type === 'milestone_based') {
          const milestones = await database.getProgramMilestones(id);
          return new Response(JSON.stringify({
            program,
            milestones,
            ...payload
          }), { status: 200 });
        }
        const projects = await database.getAllProjects(id);
        return new Response(JSON.stringify({
          program,
          projects,
          stats,
          recentActivities: activities,
          activityStats
        }), { status: 200 });
    } catch (error) {
        console.error('Error fetching dashboard:', error);
        return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500 });
    }
}

