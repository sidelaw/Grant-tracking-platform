
import Joi from 'joi';
import database from '@/lib/storage';

const milestoneSchema = Joi.object({
  title: Joi.string().optional(),
  description: Joi.string().optional(),
  budget: Joi.number().min(0).optional(),
  funds_spent: Joi.number().min(0).optional(),
  due_date: Joi.date().optional(), // Fixed typo from "dude_date"
  status: Joi.string().valid('pending', 'completed', 'delayed').optional(),
  progress: Joi.number().min(0).max(100).optional(),
  completion_date: Joi.date().optional(),
  created_at: Joi.date().optional(), // Auto-generated
  updated_at: Joi.date().optional() // Auto-generated
});



export async function PUT(req: Request, { params }: { params: Promise<{ id: string, milestoneId: string }> }) {
    try {
        const { id, milestoneId } = await params;
        const body = await req.json();
        const { error, value } = milestoneSchema.validate(body);
        if (error) {
            return new Response(JSON.stringify({ error: error.details[0].message }), { status: 400 });
        }

        const milestone = await database.updateMilestone(milestoneId, value);
        if (!milestone) {
            return new Response(JSON.stringify({ error: 'Milestone not found' }), { status: 404 });
        }
        return new Response(JSON.stringify(milestone), { status: 200 });
    } catch (error) {
        console.error('Error updating milestone:', error);
        return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500 });
    }
}
