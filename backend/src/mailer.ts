import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: parseInt(process.env.EMAIL_PORT || "587"),
  secure: process.env.EMAIL_SECURE === "true",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

export async function sendPasswordResetEmail(
  email: string,
  resetToken: string,
  resetUrl: string
): Promise<void> {
  const fullResetUrl = `${resetUrl}?token=${resetToken}`;
  const mailOptions = {
    from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
    to: email,
    subject: "Reset Your Real News Password",
    text: `You recently requested to reset your password for your Real News account. Visit this link to set a new password: ${fullResetUrl} — This link will expire in 1 hour. If you did not request a password reset, you can safely ignore this email.`,
    html: `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background-color:#f4f4f7;font-family:'Source Sans Pro',Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f7;padding:40px 0;">
    <tr><td align="center">
      <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:8px;box-shadow:0 2px 8px rgba(0,0,0,0.08);overflow:hidden;max-width:560px;width:100%;">
        <tr>
          <td style="background-color:#3c3b3b;padding:28px 40px;text-align:center;">
            <h1 style="margin:0;color:#ffffff;font-family:'Raleway',Helvetica,sans-serif;font-size:22px;font-weight:800;letter-spacing:2px;text-transform:uppercase;">Real News</h1>
          </td>
        </tr>
        <tr>
          <td style="padding:40px 40px 20px;">
            <h2 style="margin:0 0 16px;color:#3c3b3b;font-family:'Raleway',Helvetica,sans-serif;font-size:20px;font-weight:700;">Password Reset Request</h2>
            <p style="margin:0 0 24px;color:#51545e;font-size:16px;line-height:1.6;">
              We received a request to reset the password associated with this email address. Click the button below to set a new password.
            </p>
            <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto 24px;">
              <tr><td align="center" style="border-radius:6px;background-color:#743863;">
                <a href="${fullResetUrl}" target="_blank" style="display:inline-block;padding:14px 36px;color:#ffffff;font-size:16px;font-weight:700;text-decoration:none;border-radius:6px;">Reset Password</a>
              </td></tr>
            </table>
            <p style="margin:0 0 12px;color:#51545e;font-size:14px;line-height:1.5;">
              If the button doesn't work, copy and paste this link into your browser:
            </p>
            <p style="margin:0 0 24px;word-break:break-all;">
              <a href="${fullResetUrl}" style="color:#743863;font-size:14px;">${fullResetUrl}</a>
            </p>
            <p style="margin:0 0 8px;color:#51545e;font-size:14px;line-height:1.5;">This link will expire in <strong>1 hour</strong>.</p>
            <p style="margin:0;color:#51545e;font-size:14px;line-height:1.5;">If you did not request a password reset, no action is needed — your account is safe.</p>
          </td>
        </tr>
        <tr>
          <td style="padding:24px 40px 32px;border-top:1px solid #eaeaec;text-align:center;">
            <p style="margin:0;color:#9a9ea6;font-size:12px;line-height:1.5;">&copy; ${new Date().getFullYear()} Real News. All rights reserved.</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>
    `,
  };

  await transporter.sendMail(mailOptions);
}