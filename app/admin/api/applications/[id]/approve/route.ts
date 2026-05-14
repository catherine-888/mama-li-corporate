import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import { createAdminClient } from '@/lib/supabase-server';
import { resend, FROM_ADDRESS } from '@/lib/email';
import { isMockMode } from '@/lib/mock';

// ─────────────────────────────────────────────────────────────
//  POST /admin/api/applications/[id]/approve
//
//  1) Mark application 'approved'.
//  2) Invite the user via Supabase admin (sends a magic-link
//     email with a link to /auth → /menu).
//  3) Log the action in audit_log.
// ─────────────────────────────────────────────────────────────

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const admin = await requireAdmin();

  if (isMockMode()) {
    return NextResponse.json({ ok: true, mocked: true });
  }

  const supabase = createAdminClient();
  const { data: app, error: fetchErr } = await supabase
    .from('account_applications')
    .select('*')
    .eq('id', params.id)
    .maybeSingle();

  if (fetchErr || !app) {
    return NextResponse.json({ error: 'Application not found.' }, { status: 404 });
  }
  if (app.status !== 'pending') {
    return NextResponse.json({ error: 'Already reviewed.' }, { status: 409 });
  }

  // Invite the user (creates auth.users row, emails them a sign-in link).
  // If user already exists this returns an error; ignore and continue.
  const url = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
  try {
    await supabase.auth.admin.inviteUserByEmail(app.email, {
      redirectTo: `${url}/api/auth/callback?next=/`,
      data: {
        company: app.company,
        name: app.name,
        phone: app.phone,
      },
    });
  } catch (err) {
    console.warn('inviteUserByEmail failed (continuing — user may exist):', err);
  }

  // Welcome email — Resend (the invite from Supabase also goes
  // out but it's plain; this one is on-brand).
  try {
    await resend.emails.send({
      from: FROM_ADDRESS,
      to: app.email,
      subject: `Welcome to Mama Li Corporate — your account is ready`,
      html: `
        <div style="font-family:-apple-system,sans-serif;max-width:560px;margin:0 auto;padding:32px 20px;color:#1c1813;">
          <div style="font-family:Georgia,serif;font-style:italic;font-size:22px;">Mama Li</div>
          <h1 style="font-family:Georgia,serif;font-size:30px;font-weight:400;margin:24px 0 12px;">
            Welcome aboard, ${escapeHtml(app.name.split(' ')[0])}.
          </h1>
          <p style="line-height:1.6;color:#5a524a;font-size:15px;">
            Your <strong style="color:#1c1813;">${escapeHtml(app.company)}</strong> corporate account
            has been approved. We've sent a sign-in link to this email — click it to set up your
            first order.
          </p>
          <p style="margin-top:24px;">
            <a href="${url}/auth" style="display:inline-block;background:#1c1813;color:#f5eedc;padding:12px 22px;text-decoration:none;border-radius:2px;font-size:14px;">
              Sign in →
            </a>
          </p>
          <p style="font-size:13px;color:#5a524a;margin-top:32px;">
            We've also credited £20 to your first order as a thank-you. Reach us any time at
            <a href="mailto:orders@mamali.co.uk" style="color:#1c1813;">orders@mamali.co.uk</a>.
          </p>
        </div>
      `,
    });
  } catch (err) {
    console.warn('Welcome email failed:', err);
  }

  await supabase
    .from('account_applications')
    .update({ status: 'approved', reviewed_at: new Date().toISOString() })
    .eq('id', params.id);

  await supabase.from('audit_log').insert({
    actor_id: admin.user_id,
    actor_email: admin.email,
    action: 'approve',
    resource: 'application',
    resource_id: params.id,
    changes: { email: app.email, company: app.company },
  });

  return NextResponse.json({ ok: true });
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
