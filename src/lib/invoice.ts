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
  return (Number(item.qty) || 0) * (Number(item.rate) || 0);
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

export function newLineItem(): LineItem {
  return { id: crypto.randomUUID(), description: "", note: "", qty: "1", rate: "" };
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
    brand: "",
    from: { name: "", address: "", pan: "", email: "", phone: "" },
    to: {
      name: "Nxtwave Disruptive Technologies Private Limited",
      address:
        "Plot No 30, East Wing, Ground Floor, Brigade Towers,\nFinancial District, Ranga Reddy,\nHyderabad, Telangana, India - 500032",
      gstin: "36AAGCN9336F1Z9",
      pan: "AAGCN9336F",
    },
    items: [{ ...newLineItem(), description: "Round 1 Interviews", rate: "1000" }],
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
