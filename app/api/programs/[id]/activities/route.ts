import database from '@/lib/storage';
import { ActivityLogService } from '@/lib/services/ActivityLogService';

const activityLogService = new ActivityLogService();
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const { searchParams } = new URL(req.url);
        const source = searchParams.get('source') as any;
        const type = searchParams.get('type') as string;
        const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit') as string) : 50;
        const offset = searchParams.get('offset') ? parseInt(searchParams.get('offset') as string) : 0;
        
        const activities = await database.getProgramActivities(id, {
          source,
          type,
          limit,
          offset
        });
        return new Response(JSON.stringify(activities), { status: 200 });
    } catch (error) {
        console.error('Error fetching activities:', error);
        return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500 });
    }
}
