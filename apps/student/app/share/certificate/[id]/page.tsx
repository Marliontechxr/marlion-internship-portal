import { Metadata } from 'next';
import { redirect } from 'next/navigation';

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ name?: string; stream?: string }>;
}

export async function generateMetadata({ params, searchParams }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const { name = 'Student', stream = 'Technology' } = await searchParams;

  const ogImageUrl = `/api/og?type=certificate&name=${encodeURIComponent(name)}&stream=${encodeURIComponent(stream)}`;

  return {
    title: `${name} - Certificate of Completion | Marlion Technologies`,
    description: `${name} has successfully completed the ${stream} internship at Marlion Technologies, working on innovative solutions for neurodiverse children.`,
    openGraph: {
      title: `🎓 ${name} - Certificate of Completion`,
      description: `Successfully completed the ${stream} internship at Marlion Technologies. Building technology for neurodiverse children.`,
      type: 'website',
      url: `https://internship.marliontech.com/share/certificate/${id}`,
      siteName: 'Marlion Internship Portal',
      images: [
        {
          url: ogImageUrl,
          width: 1200,
          height: 630,
          alt: `${name}'s Certificate from Marlion Technologies`,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: `🎓 ${name} - Certificate of Completion`,
      description: `Successfully completed the ${stream} internship at Marlion Technologies.`,
      images: [ogImageUrl],
    },
  };
}

export default async function CertificateSharePage({ params }: PageProps) {
  const { id } = await params;
  
  // Redirect to the verification page for viewing
  redirect(`/verify/certificate?id=${id}`);
}
