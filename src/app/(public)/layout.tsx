import Layout from "@/components/Layout";
import ScrollToTop from "@/components/ScrollToTop";

export const dynamic = "force-static";

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