// The two 10% deductions in the money flow.
//
// NxtWave deducts TDS from what it pays us, so a bill of ₹100 brings in ₹90.
// We deduct the same 10% from every panelist payout. Payouts made in full
// before the deduction started (September 2026) are recovered from that
// panelist's later payouts. The database function `record_payment` in
// supabase/schema.sql enforces the same rule; change both together.
export const NXTWAVE_TDS_RATE = 0.1;
export const PAYOUT_DEDUCTION_RATE = 0.1;

export const round2 = (value: number) => Math.round(value * 100) / 100;

export type PaymentRecord = {
  id: string;
  panelist_id: string;
  amount: number;
  tds_amount: number;
  recovery_amount: number;
  paid_in_full: boolean;
};

// What is still to be recovered from a panelist for payouts made in full.
export function recoverableFor(payments: PaymentRecord[]) {
  const paidInFull = payments.filter((p) => p.paid_in_full).reduce((sum, p) => sum + p.amount, 0);
  const recovered = payments.reduce((sum, p) => sum + p.recovery_amount, 0);
  return Math.max(0, round2(round2(paidInFull * PAYOUT_DEDUCTION_RATE) - recovered));
}

// A payout for interviews worth `gross`: the 10% deduction, the adjustment
// for earlier full payouts, and what actually changes hands.
export function payoutBreakdown(gross: number, recoverable: number) {
  const tds = round2(gross * PAYOUT_DEDUCTION_RATE);
  const recovery = Math.min(recoverable, round2(gross - tds));
  return { gross, tds, recovery, net: round2(gross - tds - recovery) };
}

// The cash each paid interview actually cost: the full amount for payouts made
// in full (less whatever has since been recovered for it), 90% otherwise.
export function cashPaidByEntry(
  entries: { id: string; panelist_id: string; interview_date: string; amount: number | null }[],
  payments: PaymentRecord[],
  links: { payment_id: string; entry_id: string }[],
) {
  const byId = new Map(entries.map((e) => [e.id, e]));
  const paymentById = new Map(payments.map((p) => [p.id, p]));
  const cash = new Map<string, number>();
  const inFull: { id: string; panelist_id: string; date: string; amount: number }[] = [];
  for (const link of links) {
    const entry = byId.get(link.entry_id);
    const payment = paymentById.get(link.payment_id);
    if (!entry || !payment) continue;
    const amount = entry.amount ?? 0;
    if (payment.paid_in_full) {
      cash.set(entry.id, amount);
      inFull.push({ id: entry.id, panelist_id: entry.panelist_id, date: entry.interview_date, amount });
    } else {
      cash.set(entry.id, round2(amount * (1 - PAYOUT_DEDUCTION_RATE)));
    }
  }
  // Recoveries come off the earliest full-paid interviews first.
  const recoveredBy = new Map<string, number>();
  for (const p of payments) recoveredBy.set(p.panelist_id, (recoveredBy.get(p.panelist_id) ?? 0) + p.recovery_amount);
  inFull.sort((a, b) => a.date.localeCompare(b.date));
  for (const item of inFull) {
    const left = recoveredBy.get(item.panelist_id) ?? 0;
    if (left <= 0) continue;
    const take = Math.min(left, round2(item.amount * PAYOUT_DEDUCTION_RATE));
    cash.set(item.id, round2((cash.get(item.id) ?? 0) - take));
    recoveredBy.set(item.panelist_id, round2(left - take));
  }
  return cash;
}
