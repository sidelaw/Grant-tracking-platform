import database from "@/lib/storage";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit') as string) : 10;
    const source = searchParams.get('source')  || "";

    const activities = await database.getMostRecentProgramActivities(id, limit, source);
    return new Response(JSON.stringify(activities), { status: 200 });
  } catch (error) {
    console.error("Error fetching recent activities:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500 }
    );
  }
}