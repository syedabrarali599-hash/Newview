/** New View's contact details and profiles — the single place to change them. */

export const CONTACT_EMAIL = "hello@newview.co";

/** Shown on the site; the links below use the same number without spaces. */
export const CONTACT_PHONE = "+91 91801 38012";
const PHONE_DIGITS = "919180138012";

/** Every "contact us" CTA on the site leads to the contact page. */
export const CONTACT_PATH = "/contact";

/** "Book a Free Call" opens the Cal.com scheduling page. */
export const BOOKING_URL = "https://cal.com/newview-design-wk2eac/schedule-call";

/**
 * Social profiles shown in the footer. Leave a link empty ("") to hide its
 * icon until the profile exists.
 */
export const SOCIAL_LINKS = {
  instagram: "https://www.instagram.com/hello.newview/",
  x: "https://x.com/hellodotnewview",
  linkedin: "",
  facebook: "",
};

/** Contact page details. */
export const CONTACT_PAGE = {
  phone: CONTACT_PHONE,
  phoneHref: `tel:+${PHONE_DIGITS}`,
  whatsappHref: `https://wa.me/${PHONE_DIGITS}`,
  email: CONTACT_EMAIL,
  emailHref: `mailto:${CONTACT_EMAIL}`,
  bookingHref: BOOKING_URL,
};
