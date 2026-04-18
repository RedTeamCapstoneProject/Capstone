import { VercelRequest, VercelResponse } from "@vercel/node";
import nodemailer from "nodemailer";

const REPORT_EMAIL_TO = "capstoneprojectgithubandvercel@gmail.com";

function normalizeBody(body: unknown): Record<string, unknown> {
  if (!body) return {};

  if (typeof body === "object") {
    return body as Record<string, unknown>;
  }

  if (typeof body === "string") {
    const trimmed = body.trim();
    if (!trimmed) return {};

    try {
      const parsed = JSON.parse(trimmed) as Record<string, unknown>;
      if (parsed && typeof parsed === "object") {
        return parsed;
      }
    } catch {
    }

    const params = new URLSearchParams(trimmed);
    const output: Record<string, unknown> = {};
    for (const [key, value] of params.entries()) {
      output[key] = value;
    }
    return output;
  }

  return {};
}

function parseArticleId(value: unknown): number | null {
  const raw =
    typeof value === "number"
      ? value.toString()
      : typeof value === "string"
      ? value.trim()
      : "";

  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }

  return parsed;
}

async function sendReportEmail(params: {
  articleId: number;
  articleUrl: string;
  information: string;
}): Promise<void> {
  const emailHost = process.env.EMAIL_HOST;
  const emailPort = process.env.EMAIL_PORT;
  const emailUser = process.env.EMAIL_USER;
  const emailPass = process.env.EMAIL_PASS || process.env.EMAIL_PASSWORD;

  if (!emailHost || !emailPort || !emailUser || !emailPass) {
    throw new Error("Email configuration is incomplete in environment variables");
  }

  const transporter = nodemailer.createTransport({
    host: emailHost,
    port: Number(emailPort),
    secure: process.env.EMAIL_SECURE === "true",
    auth: {
      user: emailUser,
      pass: emailPass,
    },
  });

  const subject = `Report Article - (${params.articleId})`;
  const text = `${params.information}\n\nArticle Link: ${params.articleUrl}`;

  await transporter.sendMail({
    from: process.env.EMAIL_FROM || emailUser,
    to: REPORT_EMAIL_TO,
    subject,
    text,
    html: `
      <div style="margin:0;padding:24px;background:#f4f6f8;font-family:Arial,sans-serif;color:#1f2937;">
        <div style="max-width:640px;margin:0 auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:10px;overflow:hidden;">
          <div style="padding:18px 24px;border-bottom:1px solid #e5e7eb;background:#f9fafb;">
            <h2 style="margin:0;font-size:20px;line-height:1.3;color:#111827;">Article Report Received</h2>
          </div>
          <div style="padding:20px 24px;">
            <p style="margin:0 0 14px;font-size:14px;"><strong>Article ID:</strong> ${params.articleId}</p>
            <p style="margin:0 0 18px;font-size:14px;"><strong>Article Link:</strong><br><a href="${params.articleUrl}" style="word-break:break-all;color:#2563eb;">${params.articleUrl}</a></p>
            <p style="margin:0 0 8px;font-size:14px;"><strong>Information:</strong></p>
            <div style="white-space:pre-wrap;padding:12px;border:1px solid #e5e7eb;border-radius:8px;background:#fafafa;font-size:14px;line-height:1.6;">${params.information}</div>
          </div>
        </div>
      </div>
    `,
  });
}

export default async (req: VercelRequest, res: VercelResponse) => {
  if (req.method === "OPTIONS") {
    res.setHeader("Allow", "POST, OPTIONS");
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST, OPTIONS");
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const parsedBody = normalizeBody(req.body);
    const articleId = parseArticleId(parsedBody.articleId);
    const articleUrl =
      typeof parsedBody.articleUrl === "string" ? parsedBody.articleUrl.trim() : "";
    const information =
      typeof parsedBody.information === "string" ? parsedBody.information.trim() : "";

    if (!articleId) {
      return res.status(400).json({ error: "A valid articleId is required" });
    }

    if (!articleUrl) {
      return res.status(400).json({ error: "articleUrl is required" });
    }

    if (!information) {
      return res.status(400).json({ error: "information is required" });
    }

    await sendReportEmail({
      articleId,
      articleUrl,
      information,
    });

    return res.status(200).json({ message: "Report email sent" });
  } catch (error) {
    console.error("report error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};
