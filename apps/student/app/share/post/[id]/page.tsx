import { Metadata } from 'next';
import { redirect } from 'next/navigation';

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ name?: string; stream?: string; title?: string }>;
}

export async function generateMetadata({ params, searchParams }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const { name = 'Student', stream = 'Technology', title = '' } = await searchParams;

  const ogImageUrl = `/api/og?type=community&name=${encodeURIComponent(name)}&stream=${encodeURIComponent(stream)}&title=${encodeURIComponent(title)}`;

  return {
    title: `${name}'s Post | Marlion Community`,
    description: title || `${name} shared their experience from the ${stream} internship at Marlion Technologies.`,
    openGraph: {
      title: `💬 ${name} - Marlion Community`,
      description: title || `${stream} Intern sharing their journey at Marlion Technologies. Building technology for neurodiverse children.`,
      type: 'article',
      url: `https://intern.marliontech.com/share/post/${id}`,
      siteName: 'Marlion Internship Portal',
      images: [
        {
          url: ogImageUrl,
          width: 1200,
          height: 630,
          alt: `${name}'s Community Post`,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: `💬 ${name} - Marlion Community`,
      description: title || `Sharing my journey at Marlion Technologies`,
      images: [ogImageUrl],
    },
  };
}

export default async function PostSharePage({ params }: PageProps) {
  const { id } = await params;
  
  // Redirect to the community page with the post highlighted
  redirect(`/community?post=${id}`);
}
