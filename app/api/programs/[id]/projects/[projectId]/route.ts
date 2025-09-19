import Joi from 'joi';
import database from '@/lib/storage';

const projectSchema = Joi.object({
  name: Joi.string().optional(),
  description: Joi.string().optional(),
  budget: Joi.number().min(0).optional(),
  status: Joi.string().valid('paused', 'active', 'planning', 'review', 'completed', 'delayed').optional(),
  progress: Joi.number().min(0).max(100).optional(),
  github_repo: Joi.string().optional(), // Format: owner/repo
  funds_spent: Joi.number().min(0).optional(),
  created_at: Joi.date().optional(), // Auto-generated
  updated_at: Joi.date().optional(), // Auto-generated
  start_date: Joi.date().optional(),
  end_date: Joi.date().optional(),
  url: Joi.string().uri().optional()
});
export async function GET(req: Request, { params }: { params: Promise<{ id: string, projectId:string }> }) {
    try {
        const { projectId } = await params;
        const project = await database.getProject(projectId);
        if (!project) {
            return new Response(JSON.stringify({ error: 'Project not found' }), { status: 404 });
        }

        return new Response(JSON.stringify(project), { status: 200 });
    } catch (error) {
        console.error('Error fetching project:', error);
        return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500 });
    }
}

export async function PUT(req: Request, { params }:{ params: Promise<{ id: string, projectId:string }> }) {
    try {
        const { projectId } = await params;
        const body = await req.json();
        const {error, value} = projectSchema.validate(body);
        if (error) {
            return new Response(JSON.stringify({ error: error.details[0].message }), { status: 400 });
        }
        
        const project = await database.updateProject(projectId, value);

        if (!project) {
            return new Response(JSON.stringify({ error: 'Project not found' }), { status: 404 });
        }

        return new Response(JSON.stringify(project), { status: 200 });

    } catch (error) {
        console.error('Error updating project:', error);
        return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500 });
    }
}
