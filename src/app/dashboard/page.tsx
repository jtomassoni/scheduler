import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { StaffDashboard } from '@/components/staff-dashboard';
import { ManagerDashboard } from '@/components/manager-dashboard';

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/login');
  }

  const { user } = session;

  // Show role-specific dashboard
  if (user.role === 'BARTENDER' || user.role === 'BARBACK') {
    return <StaffDashboard user={user} />;
  }

  if (user.role === 'SUPER_ADMIN') {
    // Super Admin gets app health dashboard (to be created)
    return <ManagerDashboard user={user} />;
  }

  // Manager and General Manager get the management dashboard
  return <ManagerDashboard user={user} />;
}
