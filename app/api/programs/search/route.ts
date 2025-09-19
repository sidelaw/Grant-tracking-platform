import database from "@/lib/storage";

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const query = searchParams.get('query') || '';
        const results = await database.searchPrograms(query);
        return new Response(JSON.stringify(results), { status: 200 });
    } catch (error) {
        console.error('Error searching programs:', error);
        return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500 });
    }
}