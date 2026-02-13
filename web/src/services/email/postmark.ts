import "server-only";
import { ServerClient } from "postmark";

let client: ServerClient | null = null;

function getClient() {
  const token = process.env.POSTMARK_SERVER_TOKEN;
  if (!token) {
    throw new Error("Missing POSTMARK_SERVER_TOKEN");
  }
  if (!client) {
    client = new ServerClient(token);
  }
  return client;
}

export async function sendTransactionalEmail(args: {
  to: string;
  subject: string;
  html: string;
  text?: string;
  messageStream?: string;
}): Promise<{ messageId?: string }> {
  const fromEmail = process.env.POSTMARK_FROM_EMAIL;
  const replyTo = process.env.POSTMARK_REPLY_TO;

  if (!fromEmail) {
    throw new Error("Missing POSTMARK_FROM_EMAIL");
  }

  const messageStream = args.messageStream || "outbound";

  const response = await getClient().sendEmail({
    From: fromEmail,
    To: args.to,
    Subject: args.subject,
    HtmlBody: args.html,
    TextBody: args.text,
    MessageStream: messageStream,
    ReplyTo: replyTo || undefined,
  });

  return { messageId: response.MessageID };
}
