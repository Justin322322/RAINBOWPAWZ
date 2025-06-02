import ApplicationDetailClient from './client.jsx';

export default async function ApplicationDetailPage({ params }: { params: { id: string } }) {
  const { id } = await params;
  return <ApplicationDetailClient id={id} />;
}

export const generateMetadata = async ({ params }: { params: { id: string } }) => {
  const { id } = await params;
  return {
    title: `Application Details - ${id}`,
  };
};

export const dynamic = 'force-dynamic';
