import NewsDetailPage from "@/components/NewsDetailPage";

export default async function NewsDetailRoute({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <NewsDetailPage slug={slug} />;
}
