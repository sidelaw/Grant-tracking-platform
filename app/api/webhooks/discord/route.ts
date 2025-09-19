import { type NextRequest, NextResponse } from "next/server";
import discordService  from "@/lib/services/DiscordService";
import nacl from "tweetnacl";


const publicKey = process.env.NEXT_PUBLIC_DISCORD_PUBLIC_KEY || process.env.DISCORD_PUBLIC_KEY;

export async function POST(request: NextRequest) {
  try {
    const signature = request.headers.get('X-Signature-Ed25519') as string;
    const req_timestamp = request.headers.get('X-Signature-Timestamp') as string;
    if (!signature || !req_timestamp) {
      console.warn('Missing signature or timestamp');
      return NextResponse.json({ error: 'Missing signature or timestamp' }, { status: 401 })
    }
    
    if (!publicKey) {
      return NextResponse.json({ error: 'Webhook public key not configured' }, { status: 500 })
    }
    const payload = await request.text();
    const isVerified = nacl.sign.detached.verify(
      new Uint8Array(Buffer.from(req_timestamp + payload)),
      new Uint8Array(Buffer.from(signature, 'hex')),
      new Uint8Array(Buffer.from(publicKey, 'hex'))
    )

    if (!isVerified) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }
    const parsedPayload = JSON.parse(payload);
    if (parsedPayload.type === 1) {
      return NextResponse.json({ type: 1 }); // PONG
    }
    const res = await discordService.handleInteraction(JSON.parse(payload));
    
    return NextResponse.json(res);
  } catch (error) {
    console.error("Discord webhook error:", error)
    return NextResponse.json({ error: "Failed to process webhook" }, { status: 500 })
  }
}
