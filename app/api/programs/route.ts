import Joi from 'joi';
import database from '@/lib/storage';


const programSchema = Joi.object({
  name: Joi.string().required(),
  description: Joi.string().optional(),
  type: Joi.string().valid('project_based', 'milestone_based').required(),
  grantee: Joi.string().required(),
  grantee_email: Joi.string().email().required(),
  category: Joi.string().required(),
  budget: Joi.number().min(0).required(),
  duration: Joi.number().min(1).required(), // Duration in days
  status: Joi.string().valid('At risk', 'active', 'paused',  'completed').default('active'),
  progress: Joi.number().min(0).max(100).default(0),
  github_repo: Joi.string().required(), // Format: owner/repo
  funds_spent: Joi.number().min(0).optional(),
  discord_channel_id: Joi.string().required(),
  owner_discord_id: Joi.string().required(),
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
  start_date: Joi.date().required(),
  url: Joi.string().uri().required() // Must be unique
});

// Get all programs
export async function GET(req: Request) {
  try {
      const projects = await database.getAllPrograms();
      return new Response(JSON.stringify(projects), { status: 200 });
  } catch (error) {
      console.error('Error fetching projects:', error);
      return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500 });
  }
}


export async function POST(req: Request) {
  try {
      const body = await req.json();
      const { error, value } = programSchema.validate(body);
      if (error) {
          return new Response(JSON.stringify({ error: error.details[0].message }), { status: 400 });
      }
      const program = await database.createProgram(value);
      return new Response(JSON.stringify(program), { status: 201 });
  } catch (error) {
      console.error('Error creating program:', error);
      return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500 });
  }
}
