import { requireAdmin } from '@/lib/admin-auth';
import { createAdminClient } from '@/lib/supabase-server';
import { isMockMode } from '@/lib/mock';
import { PageHeader } from '@/components/admin-ui';
import ApplicationsClient from './applications-client';

// ─────────────────────────────────────────────────────────────
//  Pending and recent account applications. Approve here, which
//  inserts an auth.users row + admin_users entry where relevant,
//  and emails the customer with a magic-link.
// ─────────────────────────────────────────────────────────────

export type Application = {
  id: string;
  email: string;
  name: string;
  company: string;
  phone: string;
  company_type: string | null;
  frequency: string | null;
  billing: string | null;
  status: 'pending' | 'approved' | 'rejected';
  notes: string | null;
  created_at: string;
  reviewed_at: string | null;
};

async function fetchApplications(): Promise<Application[]> {
  if (isMockMode()) {
    return [
      {
        id: 'mock-app-1',
        email: 'ops@aoshearman.com',
        name: 'Priya Shah',
        company: 'A&O Shearman',
        phone: '+44 7700 900111',
        company_type: 'Law',
        frequency: 'Weekly',
        billing: 'accounts@aoshearman.com',
        status: 'pending',
        notes: null,
        created_at: new Date(Date.now() - 2 * 3600_000).toISOString(),
        reviewed_at: null,
      },
      {
        id: 'mock-app-2',
        email: 'tom.b@schroders.com',
        name: 'Tom Blackwell',
        company: 'Schroders',
        phone: '+44 7700 900222',
        company_type: 'Finance',
        frequency: 'Monthly',
        billing: 'ap@schroders.com',
        status: 'pending',
        notes: null,
        created_at: new Date(Date.now() - 26 * 3600_000).toISOString(),
        reviewed_at: null,
      },
      {
        id: 'mock-app-3',
        email: 'office@linklaters.com',
        name: 'Sara Khan',
        company: 'Linklaters',
        phone: '+44 7700 900333',
        company_type: 'Law',
        frequency: 'Fortnightly',
        billing: null,
        status: 'approved',
        notes: null,
        created_at: new Date(Date.now() - 5 * 86400_000).toISOString(),
        reviewed_at: new Date(Date.now() - 4 * 86400_000).toISOString(),
      },
    ];
  }
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('account_applications')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(200);
  if (error) {
    console.error('applications fetch failed:', error);
    return [];
  }
  return (data ?? []) as Application[];
}

export default async function ApplicationsPage() {
  await requireAdmin();
  const apps = await fetchApplications();
  return (
    <div>
      <PageHeader
        title="Account applications"
        subtitle="Review and approve corporate sign-up requests. Approving sends the applicant a sign-in link."
      />
      <ApplicationsClient initial={apps} />
    </div>
  );
}
