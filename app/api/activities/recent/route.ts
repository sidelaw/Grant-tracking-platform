import { ActivityLogService } from "@/lib/services/ActivityLogService";
import database from "@/lib/storage";
const activityLogService = new ActivityLogService();

export async function GET(req: Request) {
  try {

    const activities = await database.mergeActivitiesToMilestones();
    return new Response(JSON.stringify(activities.slice(0, 10)), { status: 200 });
  } catch (error) {
    console.error("Error fetching activities:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500 }
    );
  }
}