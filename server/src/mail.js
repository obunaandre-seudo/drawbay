export async function sendEmail({ to, subject, html, text }) {
  if (!process.env.RESEND_API_KEY || !process.env.EMAIL_FROM) {
    if (process.env.NODE_ENV === 'production') throw new Error('Email provider is not configured');
    console.info(`Email preview for ${to}: ${subject}\n${text}`);
    return;
  }
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: process.env.EMAIL_FROM, to: [to], subject, html, text })
  });
  if (!response.ok) throw new Error(`Email provider returned ${response.status}`);
}

export async function issueToken(client, userId, purpose, baseUrl, email, role = 'buyer') {
  const { randomBytes, createHash } = await import('node:crypto');
  const raw = randomBytes(32).toString('base64url');
  const tokenHash = createHash('sha256').update(raw).digest('hex');
  await client.query('DELETE FROM email_tokens WHERE user_id = $1 AND purpose = $2', [userId, purpose]);
  await client.query('INSERT INTO email_tokens (user_id, token_hash, purpose, expires_at) VALUES ($1,$2,$3,now()+interval \'1 day\')', [userId, tokenHash, purpose]);
  const accountRole = role === 'seller' ? 'seller' : 'buyer';
  const link = `${baseUrl}/${accountRole}/${purpose === 'verify' ? 'verify-email' : 'reset-password'}?token=${encodeURIComponent(raw)}&email=${encodeURIComponent(email)}`;
  await sendEmail({
    to: email,
    subject: purpose === 'verify' ? 'Verify your Guaranteed Impressions account' : 'Reset your Guaranteed Impressions password',
    text: `Continue here: ${link}\n\nThis link expires in 24 hours.`,
    html: `<p>Continue to Guaranteed Impressions:</p><p><a href="${link}">Continue securely</a></p><p>This link expires in 24 hours.</p>`
  });
}
