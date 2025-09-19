import { type NextRequest, NextResponse } from "next/server"
import { GitHubWebhookHandler } from "@/lib/services/webhook";
import crypto from "crypto"

const githubWebhookHandler = new GitHubWebhookHandler();

export async function POST(request: NextRequest) {
  try {
    const signature = request.headers.get('x-hub-signature-256') as string;
    if (!signature) {
      return NextResponse.json({ error: 'Missing signature' }, { status: 401 });
    }

    const secret = process.env.GITHUB_WEBHOOK_SECRET;
    console.log('GITHUB_WEBHOOK_SECRET:', secret);
    if (!secret) {
      console.warn('GITHUB_WEBHOOK_SECRET not set, skipping signature verification');
      return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 })
    };

    const payload = await request.json()
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(JSON.stringify(payload))
      .digest('hex');

    if (signature !== `sha256=${expectedSignature}`) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }

    const event = request.headers.get("x-github-event");
  
    const programId = await githubWebhookHandler.getProgramIdByRepository(payload.repository?.full_name);
    if (!programId) {
      console.log(`No program found for repository: ${payload.repository?.full_name}`);
      return NextResponse.json({ message: 'Repository not tracked' }, { status: 200 });
    }

    switch (event) {
    case 'push':
    await githubWebhookHandler.handlePushEvent(payload, programId);
    break;
    case 'pull_request':
    await githubWebhookHandler.handlePullRequestEvent(payload, programId);
    break;
    case 'issues':
    await githubWebhookHandler.handleIssueEvent(payload, programId);
    break;
    default:
    console.log(`Unhandled GitHub event: ${event}`);
    } 

    return NextResponse.json({ message: 'Webhook processed successfully' }, { status: 200 })
  } catch (error) {
    console.error("GitHub webhook error:", error)
    return NextResponse.json({ error: "Failed to process webhook" }, { status: 500 })
  }
}
