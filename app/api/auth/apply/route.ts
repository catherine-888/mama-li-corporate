import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase-server';
import { resend, FROM_ADDRESS, OPS_INBOX } from '@/lib/email';
import { isMockMode } from '@/lib/mock';

// ─────────────────────────────────────────────────────────────
//  POST /api/auth/apply
//  Creates a new row in `account_applications` with status
//  'pending' and notifies the Mama Li ops team by email.
//
//  Approval is manual: an ops user logs into Supabase, reviews
//  the application, and creates the user in auth.users (or runs
//  the `approve_application` SQL function — see schema.sql).
// ─────────────────────────────────────────────────────────────

const ApplicationSchema = z.object({
  company: z.string().min(2).max(200),
  email: z.string().email(),
  name: z.string().min(2).max(200),
  phone: z.string().min(3).max(50),
  companyType: z.string().max(50).optional(),
  frequency: z.string().max(50).optional(),
  billing: z.string().email().or(z.literal('')).optional(),
  agree: z.literal(true),
});

export async function POST(request: Request) {
  // In mock mode, this route normally isn't called (the client
  // short-circuits) — but if it is, return a clean fake-success.
  if (isMockMode()) {
    return NextResponse.json({ ok: true, mocked: true });
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON.' }, { status: 400 });
  }

  const parsed = ApplicationSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Please fill in all required fields.' },
      { status: 400 }
    );
  }
  const data = parsed.data;

  const supabase = createAdminClient();

  // Reject duplicates
  const { data: existing } = await supabase
    .from('account_applications')
    .select('id, status')
    .eq('email', data.email)
    .maybeSingle();

  if (existing) {
    if (existing.status === 'pending') {
      return NextResponse.json({ ok: true, status: 'already_pending' });
    }
    if (existing.status === 'approved') {
      return NextResponse.json(
        { error: 'An account already exists for that email. Try signing in.' },
        { status: 409 }
      );
    }
  }

  const { error: insertError } = await supabase.from('account_applications').insert({
    email: data.email,
    name: data.name,
    company: data.company,
    phone: data.phone,
    company_type: data.companyType ?? null,
    frequency: data.frequency ?? null,
    billing: data.billing ?? null,
    status: 'pending',
  });

  if (insertError) {
    console.error('insert application failed:', insertError);
    return NextResponse.json({ error: 'Could not save application.' }, { status: 500 });
  }

  // Notify ops
  try {
    await resend.emails.send({
      from: FROM_ADDRESS,
      to: OPS_INBOX,
      subject: `[Mama Li] New account application — ${data.company}`,
      html: `
        <div style="font-family: -apple-system, sans-serif; max-width:600px; margin:0 auto;">
          <h2>New corporate account application</h2>
          <table cellpadding="6" style="border-collapse:collapse">
            <tr><td><strong>Company</strong></td><td>${escape(data.company)}</td></tr>
            <tr><td><strong>Name</strong></td><td>${escape(data.name)}</td></tr>
            <tr><td><strong>Work email</strong></td><td>${escape(data.email)}</td></tr>
            <tr><td><strong>Phone</strong></td><td>${escape(data.phone)}</td></tr>
            <tr><td><strong>Sector</strong></td><td>${escape(data.companyType ?? '—')}</td></tr>
            <tr><td><strong>Frequency</strong></td><td>${escape(data.frequency ?? '—')}</td></tr>
            <tr><td><strong>Billing email</strong></td><td>${escape(data.billing ?? '—')}</td></tr>
          </table>
          <p style="margin-top:20px;color:#555">
            Review and approve in Supabase: <a href="${process.env.NEXT_PUBLIC_SUPABASE_URL ?? '#'}">dashboard</a>.
          </p>
        </div>
      `,
    });
  } catch (err) {
    console.warn('Ops notification email failed (application saved anyway):', err);
  }

  return NextResponse.json({ ok: true });
}

function escape(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
