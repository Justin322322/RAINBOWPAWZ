'use client'; // Mark the whole page as a client component

import AdminApplicationsPageClient from '@/components/admin/AdminApplicationsPage';
import withAdminAuth from '@/components/withAdminAuth';

// AdminApplicationsPageClient already expects `adminData` prop.
// withAdminAuth provides `adminData` to the component it wraps.
const ProtectedAdminApplicationsPage = withAdminAuth(AdminApplicationsPageClient);

export default ProtectedAdminApplicationsPage;
