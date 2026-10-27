// Cloudflare Pages Function: POST /api/contact
// Required env: RESEND_API_KEY (secret), CONTACT_TO (inbox that receives enquiries)
// Optional env: CONTACT_FROM (defaults to the verified no-reply address)

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const firstName = (name) => name.split(/\s+/)[0];

const ackText = (name, message) =>
  `Hi ${firstName(name)},

Thank you for contacting AegisOps Technologies. We have received your message and a member of our team will review it and get back to you by email.

Here is a copy of what you sent:

${message}

If you would like to add anything, just submit the form again at https://aegisopstech.me.

AegisOps Technologies
An Agentic Engineering Company. Building the Autonomous.

This is an automated message from a no-reply address. Please do not reply to this email.`;

const ackHtml = (name, message) => `
<div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;color:#0f172a;line-height:1.6">
  <h2 style="margin:0 0 12px;color:#0a1230">Thank you for contacting AegisOps Technologies</h2>
  <p>Hi ${esc(firstName(name))},</p>
  <p>We have received your message. A member of our team will review it and get back to you by email.</p>
  <p style="margin:18px 0 6px;color:#546079;font-size:13px">A copy of what you sent:</p>
  <blockquote style="margin:0;padding:12px 16px;border-left:3px solid #1f5bd8;background:#f4f6fb;white-space:pre-wrap">${esc(message)}</blockquote>
  <p>If you would like to add anything, just submit the form again at <a href="https://aegisopstech.me">aegisopstech.me</a>.</p>
  <p style="margin-top:24px"><b>AegisOps Technologies</b><br><span style="color:#546079">An Agentic Engineering Company. Building the Autonomous.</span></p>
  <hr style="border:0;border-top:1px solid #dfe5f2;margin:24px 0 12px">
  <p style="font-size:12px;color:#8a94ab">This is an automated message from a no-reply address. Please do not reply to this email.</p>
</div>`;

export async function onRequestPost({ request, env }) {
  if (!env.RESEND_API_KEY || !env.CONTACT_TO) {
    return json({ error: 'Contact form is not configured.' }, 500);
  }

  let data;
  try {
    data = await request.json();
  } catch {
    return json({ error: 'Invalid request.' }, 400);
  }

  // Honeypot: bots fill the hidden field. Pretend success.
  if (data.website) return json({ ok: true });

  const name = String(data.name || '').trim().slice(0, 120);
  const email = String(data.email || '').trim().slice(0, 200);
  const company = String(data.company || '').trim().slice(0, 160);
  const message = String(data.message || '').trim().slice(0, 4000);

  if (!name || !message || !EMAIL_RE.test(email)) {
    return json({ error: 'Please provide a name, a valid email and a message.' }, 400);
  }

  const html = `
    <h2>New enquiry from aegisopstech.me</h2>
    <p><b>Name:</b> ${esc(name)}<br>
       <b>Email:</b> ${esc(email)}<br>
       <b>Company:</b> ${esc(company) || '(not given)'}</p>
    <p style="white-space:pre-wrap">${esc(message)}</p>`;

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: env.CONTACT_FROM || 'AegisOps Website <no-reply@aegisopstech.me>',
      to: [env.CONTACT_TO],
      reply_to: email,
      subject: `Website enquiry from ${name}`.replace(/[\r\n]+/g, ' '),
      html,
      text: `Name: ${name}\nEmail: ${email}\nCompany: ${company || '(not given)'}\n\n${message}`,
    }),
  });

  if (!res.ok) {
    console.error('Resend error', res.status, await res.text());
    return json({ error: 'Could not send your message. Please try again later.' }, 502);
  }

  // Acknowledgement to the visitor. Never fails the request: the enquiry is already delivered.
  try {
    const ack = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: env.CONTACT_FROM || 'AegisOps Technologies <no-reply@aegisopstech.me>',
        to: [email],
        subject: 'We received your message | AegisOps Technologies',
        html: ackHtml(name, message),
        text: ackText(name, message),
      }),
    });
    if (!ack.ok) console.error('Resend ack error', ack.status, await ack.text());
  } catch (err) {
    console.error('Resend ack failed', err);
  }

  return json({ ok: true });
}

export const onRequest = () => json({ error: 'Method not allowed.' }, 405);
