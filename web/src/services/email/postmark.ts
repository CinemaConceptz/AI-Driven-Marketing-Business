import "server-only";
import { ServerClient } from "postmark";
import { writeEmailLog } from "@/lib/firestore/writeEmailLog";

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
  uid?: string;
  emailType?: string;
  meta?: Record<string, unknown>;
}): Promise<{ messageId?: string; logId?: string }> {
  const replyTo = process.env.POSTMARK_REPLY_TO;
  let messageId: string | undefined;
  let logId: string | undefined;
  let error: string | undefined;

  try {
    const response = await getClient().sendEmail({
      From: getFromAddress(),
      To: args.to,
      Subject: args.subject,
      HtmlBody: args.html,
      TextBody: args.text,
      MessageStream: getMessageStream(args.messageStream),
      ReplyTo: replyTo || undefined,
    });
    messageId = response.MessageID;

    // Log successful send
    logId = await writeEmailLog({
      uid: args.uid || null,
      type: args.emailType || "transactional",
      to: args.to,
      status: "sent",
      postmarkMessageId: messageId,
      meta: args.meta,
    });
  } catch (err: any) {
    error = err?.message || "Unknown error";
    // Log failed send
    logId = await writeEmailLog({
      uid: args.uid || null,
      type: args.emailType || "transactional",
      to: args.to,
      status: "failed",
      error,
      meta: args.meta,
    });
    throw err;
  }

  return { messageId, logId };
}

export async function sendWithTemplate(args: {
  to: string;
  templateId: string;
  model: Record<string, unknown>;
  messageStream?: string;
  uid?: string;
  emailType?: string;
  meta?: Record<string, unknown>;
}): Promise<{ messageId?: string; logId?: string }> {
  const replyTo = process.env.POSTMARK_REPLY_TO;
  let messageId: string | undefined;
  let logId: string | undefined;
  let error: string | undefined;

  try {
    const response = await getClient().sendEmailWithTemplate({
      From: getFromAddress(),
      To: args.to,
      TemplateId: Number(args.templateId),
      TemplateModel: args.model,
      MessageStream: getMessageStream(args.messageStream),
      ReplyTo: replyTo || undefined,
    });
    messageId = response.MessageID;

    // Log successful send
    logId = await writeEmailLog({
      uid: args.uid || null,
      type: args.emailType || "template",
      to: args.to,
      templateId: Number(args.templateId),
      status: "sent",
      postmarkMessageId: messageId,
      meta: args.meta,
    });
  } catch (err: any) {
    error = err?.message || "Unknown error";
    // Log failed send
    logId = await writeEmailLog({
      uid: args.uid || null,
      type: args.emailType || "template",
      to: args.to,
      templateId: Number(args.templateId),
      status: "failed",
      error,
      meta: args.meta,
    });
    throw err;
  }

  return { messageId, logId };
}
