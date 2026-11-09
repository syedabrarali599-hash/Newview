export const CONTACT_EMAIL = "hello@newview.co";
export const CONTACT_PHONE = "+91-911478439";

/** Every "contact us" CTA on the site leads to the contact page. */
export const CONTACT_PATH = "/contact";

/** Contact page details (from the Figma "Contact Us" frame). */
export const CONTACT_PAGE = {
  phone: "+1 347-363-4553",
  phoneHref: "tel:+13473634553",
  whatsappHref: "https://wa.me/13473634553",
  email: CONTACT_EMAIL,
  emailHref: `mailto:${CONTACT_EMAIL}`,
  /**
   * Where "Book a Free Call" goes. Replace with your scheduling link
   * (e.g. a Calendly or Cal.com URL) when you have one.
   */
  bookingHref: `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent("Book a free call")}`,
};
