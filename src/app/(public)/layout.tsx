import Layout from "@/components/Layout";
import ScrollToTop from "@/components/ScrollToTop";

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