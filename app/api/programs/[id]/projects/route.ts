import Joi from 'joi';
import database from '@/lib/storage';


const projectSchema = Joi.object({
  name: Joi.string().required(),
  description: Joi.string().optional(),
  budget: Joi.number().min(0).optional(),
  status: Joi.string().valid('paused', 'active', 'planning', 'review', 'completed', 'delayed').default('active'),
  progress: Joi.number().min(0).max(100).default(0),
  github_repo: Joi.string().optional(), // Format: owner/repo
  funds_spent: Joi.number().min(0).optional(),
  created_at: Joi.date().optional(), // Auto-generated
  updated_at: Joi.date().optional(), // Auto-generated
  start_date: Joi.date().optional(),
  end_date: Joi.date().optional(),
  url: Joi.string().uri().optional()
});

// Get all projects
export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
      const { id } = params;
      const projects = await database.getAllProjects(id);
      return new Response(JSON.stringify(projects), { status: 200 });
  } catch (error) {
      console.error('Error fetching projects:', error);
      return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500 });
  }
}


export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
      const { id } = params;
      const body = await req.json();
      const { error, value } = projectSchema.validate(body);
      if (error) {
          return new Response(JSON.stringify({ error: error.details[0].message }), { status: 400 });
      }
      const project = await database.createProject({...value, program_id: id});
      return new Response(JSON.stringify(project), { status: 201 });
  } catch (error) {
      console.error('Error creating project:', error);
      return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500 });
  }
}
