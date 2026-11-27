import { ContactPageContent } from "@/components/ContactPageContent";

export const revalidate = 86400; // SSG: revalidate once per day

export default async function ContactPage() {
  return (
    <ContactPageContent />
  );
}