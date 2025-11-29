import { Metadata } from 'next';
import { redirect } from 'next/navigation';

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ name?: string; stream?: string; rating?: string }>;
}

export async function generateMetadata({ params, searchParams }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const { name = 'Student', stream = 'Technology', rating = '' } = await searchParams;

  const ogImageUrl = `/api/og?type=portfolio&name=${encodeURIComponent(name)}&stream=${encodeURIComponent(stream)}&rating=${encodeURIComponent(rating)}`;

  return {
    title: `${name}'s Portfolio | Marlion Technologies Internship`,
    description: `Explore ${name}'s internship portfolio from the ${stream} program at Marlion Technologies. See the projects and impact created for neurodiverse children.`,
    openGraph: {
      title: `🚀 ${name}'s Internship Portfolio`,
      description: `${stream} Intern at Marlion Technologies. ${rating ? `⭐ ${rating}/5 Average Rating.` : ''} Building innovative solutions for neurodiverse children.`,
      type: 'website',
      url: `https://intern.marliontech.com/share/portfolio/${id}`,
      siteName: 'Marlion Internship Portal',
      images: [
        {
          url: ogImageUrl,
          width: 1200,
          height: 630,
          alt: `${name}'s Portfolio from Marlion Technologies`,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: `🚀 ${name}'s Internship Portfolio`,
      description: `${stream} Intern at Marlion Technologies. Explore their journey and projects.`,
      images: [ogImageUrl],
    },
  };
}

export default async function PortfolioSharePage({ params }: PageProps) {
  const { id } = await params;
  
  // Redirect to the portfolio page for viewing
  redirect(`/portfolio?view=${id}`);
}
