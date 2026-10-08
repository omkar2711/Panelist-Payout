import { ORG_NAME } from "@/lib/brand";
import {
  INTERVIEW_DURATIONS,
  INTERVIEW_OUTCOMES,
  type OutcomeId,
} from "@/lib/interview-rates";

export type LineItem = {
  id: string;
  description: string;
  note: string;
  qty: string;
  rate: string;
};

export type InvoiceData = {
  invoiceNo: string;
  invoiceDate: string;
  dueDate: string;
  brand: string;
  from: { name: string; address: string; pan: string; email: string; phone: string };
  to: { name: string; address: string; gstin: string; pan: string };
  items: LineItem[];
  bank: {
    accountName: string;
    accountNumber: string;
    ifsc: string;
    accountType: string;
    bankName: string;
  };
  signatory: { name: string; title: string };
  signature: string;
  notes: string;
};

const moneyFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatMoney(amount: number) {
  return moneyFormatter.format(amount);
}

export function lineAmount(item: LineItem) {
  return Math.max(0, Number(item.qty) || 0) * Math.max(0, Number(item.rate) || 0);
}

export function invoiceTotal(items: LineItem[]) {
  return items.reduce((sum, item) => sum + lineAmount(item), 0);
}

function toIsoDate(date: Date) {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

export function formatLongDate(isoDate: string) {
  const [year, month, day] = isoDate.split("-").map(Number);
  if (!year || !month || !day) return "—";
  return new Date(year, month - 1, day).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

// The standard claim lines for a blank invoice, one per interview length.
export function presetLineItems(): LineItem[] {
  return INTERVIEW_DURATIONS.map((duration) => ({
    id: crypto.randomUUID(),
    description: duration.invoiceName,
    note: "",
    qty: "0",
    rate: String(duration.claimRate),
  }));
}

// Claim lines built from real interviews: one per slot length and interview
// status, billed at that status's share of the claim rate. Statuses paid at 0%
// and combinations with no interviews are left out.
export function claimLineItems(countFor: (minutes: number, outcome: OutcomeId) => number) {
  const items: LineItem[] = [];
  for (const duration of INTERVIEW_DURATIONS) {
    for (const outcome of INTERVIEW_OUTCOMES) {
      const count = countFor(duration.minutes, outcome.id);
      if (count === 0 || outcome.payoutPercent === 0) continue;
      items.push({
        id: crypto.randomUUID(),
        description:
          outcome.id === "completed"
            ? duration.invoiceName
            : `${duration.invoiceName} (${outcome.short})`,
        note: "",
        qty: String(count),
        rate: String((duration.claimRate * outcome.payoutPercent) / 100),
      });
    }
  }
  return items;
}

export function newLineItem(): LineItem {
  return { id: crypto.randomUUID(), description: "", note: "", qty: "1", rate: "" };
}

export function currentMonthRange() {
  const today = new Date();
  return {
    from: toIsoDate(new Date(today.getFullYear(), today.getMonth(), 1)),
    to: toIsoDate(today),
  };
}

export function defaultDates() {
  const today = new Date();
  const due = new Date(today);
  due.setDate(due.getDate() + 15);
  return { invoiceDate: toIsoDate(today), dueDate: toIsoDate(due) };
}

// "INV-009" -> "INV-010"; leaves numbers without a trailing digit run alone.
export function nextInvoiceNo(current: string) {
  const match = current.match(/(\d+)(?!.*\d)/);
  if (!match || match.index === undefined) return current;
  const next = String(Number(match[1]) + 1).padStart(match[1].length, "0");
  return (
    current.slice(0, match.index) + next + current.slice(match.index + match[1].length)
  );
}

export function createDefaultInvoice(): InvoiceData {
  return {
    invoiceNo: "INV-001",
    ...defaultDates(),
    brand: ORG_NAME,
    from: { name: "", address: "", pan: "", email: "", phone: "" },
    to: {
      name: "Nxtwave Disruptive Technologies Private Limited",
      address:
        "Plot No 30, East Wing, Ground Floor, Brigade Towers,\nFinancial District, Ranga Reddy,\nHyderabad, Telangana, India - 500032",
      gstin: "36AAGCN9336F1Z9",
      pan: "AAGCN9336F",
    },
    items: presetLineItems(),
    bank: {
      accountName: "",
      accountNumber: "",
      ifsc: "",
      accountType: "Savings",
      bankName: "",
    },
    signatory: { name: "", title: "" },
    signature: "",
    notes: "Supplier is not registered under GST; no GST has been charged.",
  };
}
