import AdminApplicationsClient from './client';

export default function AdminApplicationsPage() {
  return <AdminApplicationsClient />;
}

export const generateMetadata = async () => {
  return {
    title: 'Application Management',
  };
};

export const dynamic = 'force-dynamic';
