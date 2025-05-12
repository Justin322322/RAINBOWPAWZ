import ApplicationReviewClient from './client';

export default function ApplicationReviewPage({ params }: { params: { id: string } }) {
  return <ApplicationReviewClient id={params.id} />;
}

export const generateMetadata = async ({ params }: { params: { id: string } }) => {
  return {
    title: `Review Application - ${params.id}`,
  };
};

export const dynamic = 'force-dynamic';
