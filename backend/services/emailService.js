const nodemailer = require('nodemailer')

let _transporter = null

function getTransporter() {
  if (!_transporter) {
    _transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: Number(process.env.SMTP_PORT) || 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    })
  }
  return _transporter
}

async function sendPasswordResetEmail({ to, token, frontendUrl }) {
  const resetUrl = `${frontendUrl}/reset-password?token=${token}`
  await getTransporter().sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to,
    subject: 'Reset your TravelAI password',
    html: `
      <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:500px;margin:auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb">
        <div style="background:linear-gradient(135deg,#2563eb,#4f46e5);padding:32px 36px">
          <h1 style="margin:0;color:#fff;font-size:22px;font-weight:700">✈ TravelAI</h1>
          <p style="margin:6px 0 0;color:#bfdbfe;font-size:14px">AI-powered travel planning</p>
        </div>
        <div style="padding:36px">
          <h2 style="margin:0 0 12px;color:#111827;font-size:20px">Reset your password</h2>
          <p style="color:#6b7280;font-size:15px;line-height:1.6;margin:0 0 24px">
            We received a request to reset your password. Click the button below to set a new one.
            This link expires in <strong>30 minutes</strong>.
          </p>
          <a href="${resetUrl}"
            style="display:inline-block;background:#2563eb;color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px">
            Reset Password →
          </a>
          <p style="color:#9ca3af;font-size:13px;margin:24px 0 0;line-height:1.6">
            If you didn't request this, you can safely ignore this email — your password won't change.
          </p>
        </div>
        <div style="background:#f9fafb;padding:16px 36px;border-top:1px solid #e5e7eb">
          <p style="margin:0;color:#9ca3af;font-size:12px">TravelAI · AI-powered travel planning</p>
        </div>
      </div>`,
    text: `Reset your TravelAI password\n\nClick the link below to reset your password (expires in 30 minutes):\n${resetUrl}\n\nIf you didn't request this, ignore this email.`,
  })
}

module.exports = { sendPasswordResetEmail }
