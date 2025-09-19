import Joi from 'joi';
import database from '@/lib/storage';

const programSchema = Joi.object({
  name: Joi.string().optional(),
  description: Joi.string().optional(),
  grantee: Joi.string().optional(),
  grantee_email: Joi.string().email().optional(),
  category: Joi.string().optional(),
  budget: Joi.number().min(0).optional(),
  duration: Joi.number().min(1).optional(), // Duration in days
  status: Joi.string().valid('At risk', 'active', 'paused', 'completed').optional(),
  progress: Joi.number().min(0).max(100).default(0),
  github_repo: Joi.string().optional(), // Format: owner/repo
  funds_spent: Joi.number().min(0).optional(),
  discord_channel_id: Joi.string().optional(),
  owner_discord_id: Joi.string().optional(),
  created_at: Joi.date().optional(), // Auto-generated
  updated_at: Joi.date().optional(), // Auto-generated
  last_update: Joi.date().optional(),
  next_update: Joi.date().optional(),
  avatar_src: Joi.string().uri().optional(),
  avatar_bg: Joi.string().optional(),
  wallet_address: Joi.string().optional(),
  location: Joi.string().optional(),
  star_rating: Joi.number().min(1).max(5).optional(),
  vp_amount: Joi.string().optional(),
  start_date: Joi.date().optional(),
  url: Joi.string().uri().optional() // Must be unique
});
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const program = await database.getProgram(id);
        if (!program) {
            return new Response(JSON.stringify({ error: 'Program not found' }), { status: 404 });
        }
        if (program.type !== 'milestone_based') {
            const projects = await database.getAllProjects(id);
            return new Response(JSON.stringify({ ...program, projects }), { status: 200 });
        }
        const milestones = await database.getProgramMilestones(id);
        return new Response(JSON.stringify({ ...program, milestones }), { status: 200 });
    } catch (error) {
        console.error('Error fetching program:', error);
        return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500 });
    }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const body = await req.json();
        const {error, value} = programSchema.validate(body);
        if (error) {
            return new Response(JSON.stringify({ error: error.details[0].message }), { status: 400 });
        }

        const program = await database.updateProgram(id, value);

        if (!program) {
            return new Response(JSON.stringify({ error: 'Program not found' }), { status: 404 });
        }

        return new Response(JSON.stringify(program), { status: 200 });

    } catch (error) {
        console.error('Error updating program:', error);
        return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500 });
    }
}
