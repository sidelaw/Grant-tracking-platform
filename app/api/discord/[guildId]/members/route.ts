import discordService  from "@/lib/services/DiscordService";


export async function GET(req: Request, { params }: { params: Promise<{ guildId: string }> }) {
    try {
        const { guildId } = await params;
        const members = await discordService.fetchGuildMembers(guildId);
        return new Response(JSON.stringify(members), { status: 200 });
    } catch (error) {
        console.error('Error fetching Discord members:', error);
        return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500 });
    }
}