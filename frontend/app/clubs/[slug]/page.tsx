import ClubDetailPage from "@/components/ClubDetailPage";

export default async function ClubDetailRoute({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <ClubDetailPage slug={slug} />;
}
