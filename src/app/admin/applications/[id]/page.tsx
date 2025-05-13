import ApplicationDetailClient from './client.jsx';

export default function ApplicationDetailPage({ params }: { params: { id: string } }) {
  return <ApplicationDetailClient id={params.id} />;
}

export const generateMetadata = async ({ params }: { params: { id: string } }) => {
  return {
    title: `Application Details - ${params.id}`,
  };
};

export const dynamic = 'force-dynamic';
