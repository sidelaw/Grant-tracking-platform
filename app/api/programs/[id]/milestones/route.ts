import Joi from 'joi';
import database from '@/lib/storage';

const milestoneSchema = Joi.object({
  title: Joi.string().required(),
  description: Joi.string().optional(),
  budget: Joi.number().min(0).required(),
  funds_spent: Joi.number().min(0).optional(),
  due_date: Joi.date().optional(), // Fixed typo from "dude_date"
  status: Joi.string().valid('pending', 'completed', 'delayed').default('pending'),
  progress: Joi.number().min(0).max(100).default(0),
  created_at: Joi.date().optional(), // Auto-generated
  updated_at: Joi.date().optional() // Auto-generated
});

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const body = await req.json();
        const { error, value } = milestoneSchema.validate(body);
        if (error) {
            return new Response(JSON.stringify({ error: error.details[0].message }), { status: 400 });
        }

        const program = await database.getProgram(id);
        if (!program) {
            return new Response(JSON.stringify({ error: 'Program not found' }), { status: 404 });
        }

        const milestone = await database.createMilestone({
            ...value,
            program_id: id
        });

        return new Response(JSON.stringify(milestone), { status: 201 });
    } catch (error) {
         console.error('Error creating milestone:', error);
            return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500 });
    }
}