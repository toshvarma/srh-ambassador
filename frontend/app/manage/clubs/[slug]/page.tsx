import ManageClubReviewPage from "@/components/ManageClubReviewPage";

export default async function ManageClubReviewRoute({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <ManageClubReviewPage slug={slug} />;
}
