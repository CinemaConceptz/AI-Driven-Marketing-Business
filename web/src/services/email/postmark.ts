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

function getFromAddress() {
  const fromEmail = process.env.POSTMARK_FROM_EMAIL;
  const fromName = process.env.POSTMARK_FROM_NAME || "Verified Sound A&R";
  if (!fromEmail) {
    throw new Error("Missing POSTMARK_FROM_EMAIL");
  }
  return `${fromName} <${fromEmail}>`;
}

function getMessageStream(value?: string) {
  const stream = value || process.env.POSTMARK_MESSAGE_STREAM;
  if (!stream) {
    throw new Error("Missing POSTMARK_MESSAGE_STREAM");
  }
  return stream;
}

export async function sendTransactionalEmail(args: {
  to: string;
  subject: string;
  html: string;
  text?: string;
  messageStream?: string;
}): Promise<{ messageId?: string }> {
  const replyTo = process.env.POSTMARK_REPLY_TO;
  const response = await getClient().sendEmail({
    From: getFromAddress(),
    To: args.to,
    Subject: args.subject,
    HtmlBody: args.html,
    TextBody: args.text,
    MessageStream: getMessageStream(args.messageStream),
    ReplyTo: replyTo || undefined,
  });

  return { messageId: response.MessageID };
}

export async function sendWithTemplate(args: {
  to: string;
  templateId: string;
  model: Record<string, unknown>;
  messageStream?: string;
}): Promise<{ messageId?: string }> {
  const replyTo = process.env.POSTMARK_REPLY_TO;
  const response = await getClient().sendEmailWithTemplate({
    From: getFromAddress(),
    To: args.to,
    TemplateId: Number(args.templateId),
    TemplateModel: args.model,
    MessageStream: getMessageStream(args.messageStream),
    ReplyTo: replyTo || undefined,
  });

  return { messageId: response.MessageID };
}
