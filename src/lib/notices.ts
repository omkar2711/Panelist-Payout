// A notice shown at the top of every panelist page until they close it. Edit
// the text here, or set PANELIST_NOTICE to null to take it down. Give a new
// notice a new id so it shows again for panelists who closed the old one.
export const PANELIST_NOTICE: { id: string; title: string; body: string } | null = {
  id: "payout-deduction-2026-10",
  title: "Payout update",
  body:
    "From the October payout cycle, payouts will be made after a 10% deduction, which covers " +
    "the 10% TDS that NxtWave deducts from our payments. September was paid in full, so " +
    "September's 10% will be adjusted in your October payout.",
};

// Remembers, per browser, which notice was closed.
export const NOTICE_COOKIE = "eb_notice_dismissed";
