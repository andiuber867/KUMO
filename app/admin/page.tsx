import { adminIdentity } from '@/lib/server/auth';
import { AdminPanel } from '@/features/admin/admin-panel';
import { LoginForm } from '@/features/auth/login-form';
export const dynamic = 'force-dynamic';
export default async function Admin() {
  const admin = await adminIdentity();
  return admin ? <AdminPanel username={admin.username}/> : <LoginForm/>;
}
