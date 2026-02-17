import "server-only";
import { ServerClient } from "postmark";
import { writeEmailLog } from "@/lib/firestore/writeEmailLog";

let client: ServerClient | null = null;

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

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

/**
 * Sleep utility for retry delays
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Check if error is retryable
 */
function isRetryableError(error: any): boolean {
  // Retry on network errors, timeouts, and 5xx server errors
  const retryableCodes = [
    "ECONNRESET",
    "ETIMEDOUT",
    "ENOTFOUND",
    "ENETUNREACH",
  ];
  
  if (retryableCodes.includes(error?.code)) {
    return true;
  }
  
  // Postmark-specific retryable status codes
  const statusCode = error?.statusCode || error?.status;
  if (statusCode && statusCode >= 500) {
    return true;
  }
  
  return false;
}

/**
 * Retry wrapper for email operations
 */
async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = MAX_RETRIES
): Promise<T> {
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error: any) {
      lastError = error;
      
      // Don't retry on non-retryable errors
      if (!isRetryableError(error)) {
        throw error;
      }
      
      if (attempt < maxRetries) {
        const delay = RETRY_DELAY_MS * Math.pow(2, attempt - 1); // Exponential backoff
        console.log(`[postmark] Attempt ${attempt} failed, retrying in ${delay}ms...`);
        await sleep(delay);
      }
    }
  }
  
  throw lastError || new Error("Email send failed after retries");
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
    const response = await withRetry(() => 
      getClient().sendEmail({
        From: getFromAddress(),
        To: args.to,
        Subject: args.subject,
        HtmlBody: args.html,
        TextBody: args.text,
        MessageStream: getMessageStream(args.messageStream),
        ReplyTo: replyTo || undefined,
      })
    );
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
