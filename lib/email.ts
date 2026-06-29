const FROM_EMAIL = process.env.BREVO_FROM_EMAIL ?? 'noreply@century.ae';
const FROM_NAME  = process.env.BREVO_FROM_NAME  ?? 'Century Financial';

async function send(to: string, toName: string, subject: string, html: string) {
  const key = (process.env.BREVO_API_KEY ?? '').trim();
  if (!key) {
    return;
  }
  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: { 'api-key': key, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sender:      { name: FROM_NAME, email: FROM_EMAIL },
      to:          [{ email: to, name: toName }],
      subject,
      htmlContent: html,
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Brevo error ${res.status}: ${body}`);
  }
}

export async function sendPasswordResetEmail(to: string, name: string, resetUrl: string) {
  await send(to, name, 'Reset your Century Financial password', `
    <p>Hi ${name},</p>
    <p>You requested a password reset. Click the link below to set a new password. This link expires in 30 minutes and can only be used once.</p>
    <p><a href="${resetUrl}" style="background:#2563eb;color:#fff;padding:10px 20px;text-decoration:none;border-radius:4px;display:inline-block">Reset Password</a></p>
    <p>If you did not request this, ignore this email. Your password will not change.</p>
    <p>— Century Financial Security</p>
  `);
}

export async function sendNewDeviceLoginEmail(to: string, name: string, ip: string, device: string, time: string) {
  await send(to, name, 'New device login — Century Financial', `
    <p>Hi ${name},</p>
    <p>Your account was accessed from a new device.</p>
    <ul>
      <li><strong>Time:</strong> ${time}</li>
      <li><strong>IP:</strong> ${ip}</li>
      <li><strong>Device:</strong> ${device}</li>
    </ul>
    <p>If this was you, no action is needed. If you don't recognise this, contact your administrator immediately.</p>
    <p>— Century Financial Security</p>
  `);
}

export async function sendPasswordChangedEmail(to: string, name: string, time: string) {
  await send(to, name, 'Your password was changed — Century Financial', `
    <p>Hi ${name},</p>
    <p>Your Century Financial password was changed at ${time}.</p>
    <p>If you did not make this change, contact your administrator immediately.</p>
    <p>— Century Financial Security</p>
  `);
}

export async function sendAccountLockedEmail(to: string, name: string, unlockTime: string) {
  await send(to, name, 'Account temporarily locked — Century Financial', `
    <p>Hi ${name},</p>
    <p>Your account has been temporarily locked due to multiple failed login attempts.</p>
    <p>Your account will automatically unlock at <strong>${unlockTime}</strong>.</p>
    <p>If you did not attempt to log in, contact your administrator immediately.</p>
    <p>— Century Financial Security</p>
  `);
}

export async function sendSessionTerminatedEmail(to: string, name: string, newIp: string, newDevice: string) {
  await send(to, name, 'Your session was terminated — Century Financial', `
    <p>Hi ${name},</p>
    <p>Your active session was terminated because a new login was detected.</p>
    <ul>
      <li><strong>New login IP:</strong> ${newIp}</li>
      <li><strong>New device:</strong> ${newDevice}</li>
    </ul>
    <p>Century Financial enforces single active sessions per user. If you did not initiate this new login, contact your administrator immediately.</p>
    <p>— Century Financial Security</p>
  `);
}

export async function sendMfaEnrolledEmail(to: string, name: string) {
  await send(to, name, 'MFA enabled on your account — Century Financial', `
    <p>Hi ${name},</p>
    <p>Multi-factor authentication (TOTP) has been successfully enabled on your Century Financial account.</p>
    <p>You will now be prompted for an authenticator code on every login.</p>
    <p>If you did not enable MFA, contact your administrator immediately.</p>
    <p>— Century Financial Security</p>
  `);
}
