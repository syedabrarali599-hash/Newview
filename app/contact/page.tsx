import type { Metadata } from "next";
import ContactPage from "@/components/contact/ContactPage";

export const metadata: Metadata = {
  title: "Contact — New View",
  description:
    "Have a project in mind, a challenge to solve, or an idea you'd like to explore? Tell New View about it or book a free call.",
};

export default function Page() {
  return <ContactPage />;
}
