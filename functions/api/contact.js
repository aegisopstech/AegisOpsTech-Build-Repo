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
  return json({ ok: true });
}

export const onRequest = () => json({ error: 'Method not allowed.' }, 405);
