import Layout from "@/components/Layout";
import ScrollToTop from "@/components/ScrollToTop";

export const dynamic = "force-dynamic";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <ScrollToTop />
      <Layout>{children}</Layout>
    </>
  );
}