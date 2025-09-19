import discordService  from "@/lib/services/DiscordService";
export async function POST(req: Request, { params }: { params: Promise<{ guildId: string }> }) {
    try {
        const { guildId } = await params;
        const body = await req.json();
        console.log('Received Discord interaction:', body);
        const response = await discordService.createGuildChannel(guildId, body);
        return new Response(JSON.stringify(response), { status: 200 });
    } catch (error) {
        console.error('Error handling Discord interaction:', error);
        return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500 });
    }
}

export async function GET(req: Request, { params }: { params: Promise<{ guildId: string }> }) {
    try {
        const { guildId } = await params;
        const channels = await discordService.listGuildChannels(guildId);
        return new Response(JSON.stringify(channels), { status: 200 });
    } catch (error) {
        console.error('Error fetching Discord channels:', error);
        return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500 });
    }
}