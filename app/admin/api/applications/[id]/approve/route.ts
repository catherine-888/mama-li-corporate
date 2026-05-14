import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import { createAdminClient } from '@/lib/supabase-server';
import { isMockMode } from '@/lib/mock';

export const runtime = 'nodejs';

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
    console.warn('inviteUserByEmail failed:', err);
  }

  // Lazy-import Resend so it's not initialised at build time.
  // The module reads RESEND_API_KEY at import; without a real key
  // (or in mock mode) it crashes the build.
  if (process.env.RESEND_API_KEY && !process.env.RESEND_API_KEY.includes('mock')) {
    try {
      const { resend, FROM_ADDRESS } = await import('@/lib/email');
      await resend.emails.send({
        from: FROM_ADDRESS,
        to: app.email,
        subject: `Welcome to Mama Li Corporate — your account is ready`,
        html: `<div style="font-family:-apple-system,sans-serif;max-width:560px;margin:0 auto;padding:32px 20px;color:#1c1813;">
          <div style="font-family:Georgia,serif;font-style:italic;font-size:22px;">Mama Li</div>
          <h1 style="font-family:Georgia,serif;font-size:30px;font-weight:400;margin:24px 0 12px;">Welcome aboard.</h1>
          <p style="line-height:1.6;color:#5a524a;font-size:15px;">Your <strong style="color:#1c1813;">${app.company}</strong> corporate account has been approved. We've sent a sign-in link to this email.</p>
          <p style="margin-top:24px;"><a href="${url}/auth" style="display:inline-block;background:#1c1813;color:#f5eedc;padding:12px 22px;text-decoration:none;border-radius:2px;font-size:14px;">Sign in →</a></p>
        </div>`,
      });
    } catch (err) {
      console.warn('Welcome email failed:', err);
    }
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
