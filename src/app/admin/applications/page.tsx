import AdminApplicationsPageClient from '@/components/admin/AdminApplicationsPage';
import withAdminAuth from '@/components/withAdminAuth';

function AdminApplicationsPage() {
  return <AdminApplicationsPageClient adminData={null} />;
}

export default withAdminAuth(AdminApplicationsPage);
