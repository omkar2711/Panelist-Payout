"use client";

import { useEffect, useState, type ChangeEvent, type ReactNode } from "react";
import { Download, FilePlus2, ListChecks, Plus, Trash2 } from "lucide-react";
import { InvoicePreview } from "@/components/invoice-preview";
import { ORG_NAME } from "@/lib/brand";
import { INTERVIEW_DURATIONS, isOfferedDuration, outcomeOf } from "@/lib/interview-rates";
import { createClient } from "@/lib/supabase/client";
import {
  claimLineItems,
  createDefaultInvoice,
  currentMonthRange,
  defaultDates,
  lineAmount,
  newLineItem,
  nextInvoiceNo,
  presetLineItems,
  type InvoiceData,
  type LineItem,
} from "@/lib/invoice";

const STORAGE_KEY = "panelist-payout:invoice-draft";
const BRAND_APPLIED_KEY = "panelist-payout:invoice-brand-applied";
const MAX_SIGNATURE_BYTES = 500 * 1024;

const inputClass =
  "w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20";
const cardClass = "rounded-2xl border border-slate-200/80 bg-white shadow-sm p-6";
const cardTitle = "mb-4 text-sm font-semibold text-slate-900";

type GroupKey = "from" | "to" | "bank" | "signatory";

function loadDraft(): InvoiceData {
  const defaults = createDefaultInvoice();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    // One-time: a draft saved before the organization had a name gets it as
    // its header. After that, a header the vendor blanks out stays blank.
    const applyBrand = !localStorage.getItem(BRAND_APPLIED_KEY);
    if (applyBrand) localStorage.setItem(BRAND_APPLIED_KEY, "1");
    if (!raw) return defaults;
    const saved = JSON.parse(raw) as Partial<InvoiceData>;
    if (applyBrand && !saved.brand?.trim()) saved.brand = ORG_NAME;
    return {
      ...defaults,
      ...saved,
      from: { ...defaults.from, ...saved.from },
      to: { ...defaults.to, ...saved.to },
      bank: { ...defaults.bank, ...saved.bank },
      signatory: { ...defaults.signatory, ...saved.signatory },
      items: saved.items?.length ? saved.items : defaults.items,
    };
  } catch {
    return defaults;
  }
}

function Field({
  label,
  className = "",
  children,
}: {
  label: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <label className={`block space-y-1 ${className}`}>
      <span className="text-sm font-medium text-slate-700">{label}</span>
      {children}
    </label>
  );
}

export function InvoiceBuilder() {
  const [data, setData] = useState<InvoiceData>(loadDraft);
  const [signatureError, setSignatureError] = useState("");
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState("");
  const [fillRange, setFillRange] = useState(currentMonthRange);
  const [filling, setFilling] = useState(false);
  const [fillMessage, setFillMessage] = useState("");

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
      // Storage unavailable or full — the form still works, it just won't be remembered.
    }
  }, [data]);

  function setField<K extends keyof InvoiceData>(key: K, value: InvoiceData[K]) {
    setData((prev) => ({ ...prev, [key]: value }));
  }

  function setGroupField<G extends GroupKey>(
    group: G,
    field: keyof InvoiceData[G],
    value: string,
  ) {
    setData((prev) => ({ ...prev, [group]: { ...prev[group], [field]: value } }));
  }

  function updateItem(id: string, field: keyof Omit<LineItem, "id">, rawValue: string) {
    // Quantities and rates can't be negative.
    const value =
      field === "qty" || field === "rate" ? rawValue.replace(/-/g, "") : rawValue;
    setData((prev) => ({
      ...prev,
      items: prev.items.map((item) =>
        item.id === id ? { ...item, [field]: value } : item,
      ),
    }));
  }

  function removeItem(id: string) {
    setData((prev) => ({
      ...prev,
      items: prev.items.length > 1 ? prev.items.filter((item) => item.id !== id) : prev.items,
    }));
  }

  function startNewInvoice() {
    if (!window.confirm("Start a new invoice? Line items will be cleared; your details and bank info are kept.")) {
      return;
    }
    setData((prev) => ({
      ...prev,
      ...defaultDates(),
      invoiceNo: nextInvoiceNo(prev.invoiceNo),
      items: presetLineItems(),
    }));
    setFillMessage("");
  }

  async function fillFromInterviews() {
    const { from, to } = fillRange;
    if (!from || !to || from > to) {
      setFillMessage("Pick a valid date range first.");
      return;
    }
    const hasAmounts = data.items.some((item) => lineAmount(item) > 0);
    if (
      hasAmounts &&
      !window.confirm("Replace the current line items with counts from approved interviews?")
    ) {
      return;
    }

    setFilling(true);
    setFillMessage("");
    const { data: rows, error } = await createClient()
      .from("interview_entries")
      .select("duration_minutes, outcome")
      .in("status", ["approved", "paid"])
      .gte("interview_date", from)
      .lte("interview_date", to)
      .returns<{ duration_minutes: number | null; outcome: string }[]>();
    setFilling(false);

    if (error) {
      setFillMessage("Couldn't load the interviews. Please try again.");
      return;
    }

    const counts = new Map<string, number>();
    let billed = 0;
    let noSlot = 0;
    let unpaidStatus = 0;
    for (const row of rows ?? []) {
      if (row.duration_minutes === null || !isOfferedDuration(row.duration_minutes)) {
        noSlot += 1;
      } else if (outcomeOf(row.outcome).payoutPercent === 0) {
        unpaidStatus += 1;
      } else {
        const key = `${row.duration_minutes}:${row.outcome}`;
        counts.set(key, (counts.get(key) ?? 0) + 1);
        billed += 1;
      }
    }

    const leftOut = [
      noSlot ? `${noSlot} without a 60 or 90 minute slot` : "",
      unpaidStatus ? `${unpaidStatus} with a 0% interview status` : "",
    ].filter(Boolean);
    const leftOutNote = leftOut.length ? ` Left out: ${leftOut.join(", ")}.` : "";

    const items = claimLineItems((minutes, outcome) => counts.get(`${minutes}:${outcome}`) ?? 0);
    if (items.length === 0) {
      setFillMessage(`No billable approved interviews in that range.${leftOutNote}`);
      return;
    }

    setField("items", items);
    setFillMessage(
      `Filled ${billed} interview${billed === 1 ? "" : "s"} across ${items.length} line${items.length === 1 ? "" : "s"}.${leftOutNote}`,
    );
  }

  function handleSignature(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!["image/png", "image/jpeg"].includes(file.type)) {
      setSignatureError("Please use a PNG or JPG image.");
      return;
    }
    if (file.size > MAX_SIGNATURE_BYTES) {
      setSignatureError("Please use an image under 500 KB.");
      return;
    }
    setSignatureError("");
    const reader = new FileReader();
    reader.onload = () => setField("signature", String(reader.result ?? ""));
    reader.readAsDataURL(file);
  }

  async function downloadPdf() {
    setDownloadError("");
    setDownloading(true);
    try {
      // Loaded on demand so the PDF library isn't part of the page's initial bundle.
      const { createInvoicePdf } = await import("@/components/invoice-pdf");
      const blob = await createInvoicePdf(data);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `Invoice-${data.invoiceNo.trim().replace(/[^\w.-]+/g, "-") || "draft"}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
    } catch {
      setDownloadError("Couldn't create the PDF. If you added a signature, try a PNG or JPG image.");
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3 print:hidden">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Invoices</h1>
          <p className="mt-1 text-sm text-slate-500">
            Fill in the details, check the preview, then download it as a PDF.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={startNewInvoice}
            className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            <FilePlus2 className="h-4 w-4" />
            New invoice
          </button>
          <button
            type="button"
            onClick={downloadPdf}
            disabled={downloading}
            className="inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
          >
            <Download className="h-4 w-4" />
            {downloading ? "Preparing..." : "Download PDF"}
          </button>
        </div>
      </div>

      {downloadError ? (
        <p className="mb-4 text-sm text-red-600 print:hidden">{downloadError}</p>
      ) : null}

      <div className="space-y-6 print:hidden">
        <section className={cardClass}>
          <h2 className={cardTitle}>Invoice details</h2>
          <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
            <Field label="Invoice no.">
              <input
                className={inputClass}
                value={data.invoiceNo}
                onChange={(e) => setField("invoiceNo", e.target.value)}
              />
            </Field>
            <Field label="Invoice date">
              <input
                type="date"
                className={inputClass}
                value={data.invoiceDate}
                onChange={(e) => setField("invoiceDate", e.target.value)}
              />
            </Field>
            <Field label="Due date">
              <input
                type="date"
                className={inputClass}
                value={data.dueDate}
                onChange={(e) => setField("dueDate", e.target.value)}
              />
            </Field>
            <Field label="Header name (optional)">
              <input
                className={inputClass}
                placeholder="Shown large, top right"
                value={data.brand}
                onChange={(e) => setField("brand", e.target.value)}
              />
            </Field>
          </div>
        </section>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <section className={cardClass}>
            <h2 className={cardTitle}>Billed by (you)</h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Name" className="sm:col-span-2">
                <input
                  className={inputClass}
                  value={data.from.name}
                  onChange={(e) => setGroupField("from", "name", e.target.value)}
                />
              </Field>
              <Field label="Address" className="sm:col-span-2">
                <textarea
                  rows={3}
                  className={inputClass}
                  value={data.from.address}
                  onChange={(e) => setGroupField("from", "address", e.target.value)}
                />
              </Field>
              <Field label="PAN (optional)">
                <input
                  className={inputClass}
                  value={data.from.pan}
                  onChange={(e) => setGroupField("from", "pan", e.target.value.toUpperCase())}
                />
              </Field>
              <Field label="Phone">
                <input
                  type="tel"
                  className={inputClass}
                  value={data.from.phone}
                  onChange={(e) => setGroupField("from", "phone", e.target.value)}
                />
              </Field>
              <Field label="Email" className="sm:col-span-2">
                <input
                  type="email"
                  className={inputClass}
                  value={data.from.email}
                  onChange={(e) => setGroupField("from", "email", e.target.value)}
                />
              </Field>
            </div>
          </section>

          <section className={cardClass}>
            <h2 className={cardTitle}>Billed to (client)</h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Name" className="sm:col-span-2">
                <input
                  className={inputClass}
                  value={data.to.name}
                  onChange={(e) => setGroupField("to", "name", e.target.value)}
                />
              </Field>
              <Field label="Address" className="sm:col-span-2">
                <textarea
                  rows={3}
                  className={inputClass}
                  value={data.to.address}
                  onChange={(e) => setGroupField("to", "address", e.target.value)}
                />
              </Field>
              <Field label="GSTIN">
                <input
                  className={inputClass}
                  value={data.to.gstin}
                  onChange={(e) => setGroupField("to", "gstin", e.target.value.toUpperCase())}
                />
              </Field>
              <Field label="PAN">
                <input
                  className={inputClass}
                  value={data.to.pan}
                  onChange={(e) => setGroupField("to", "pan", e.target.value.toUpperCase())}
                />
              </Field>
            </div>
          </section>
        </div>

        <section className={cardClass}>
          <h2 className={cardTitle}>Line items</h2>
          <div className="mb-5 rounded-xl bg-slate-50 p-4">
            <div className="flex flex-wrap items-end gap-3">
              <Field label="Interviews from">
                <input
                  type="date"
                  className={inputClass}
                  value={fillRange.from}
                  onChange={(e) => setFillRange((r) => ({ ...r, from: e.target.value }))}
                />
              </Field>
              <Field label="to">
                <input
                  type="date"
                  className={inputClass}
                  value={fillRange.to}
                  onChange={(e) => setFillRange((r) => ({ ...r, to: e.target.value }))}
                />
              </Field>
              <button
                type="button"
                onClick={fillFromInterviews}
                disabled={filling}
                className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-60"
              >
                <ListChecks className="h-4 w-4" />
                {filling ? "Counting..." : "Fill from approved interviews"}
              </button>
            </div>
            <p className="mt-2 text-xs text-slate-500">
              {fillMessage ||
                `Counts approved and paid interviews in this range and bills them at ${INTERVIEW_DURATIONS.map(
                  (d) => `₹${d.claimRate.toLocaleString("en-IN")} (${d.minutes} mins)`,
                ).join(" and ")}, reduced to 50% or 30% where the interview status says so.`}
            </p>
          </div>
          <div className="space-y-3">
            {data.items.map((item, index) => (
              <div key={item.id} className="grid grid-cols-12 items-end gap-2">
                <Field label={index === 0 ? "Description" : ""} className="col-span-12 sm:col-span-4">
                  <input
                    className={inputClass}
                    placeholder="e.g. Round 1 Interviews"
                    aria-label="Description"
                    value={item.description}
                    onChange={(e) => updateItem(item.id, "description", e.target.value)}
                  />
                </Field>
                <Field label={index === 0 ? "Sub-note (optional)" : ""} className="col-span-12 sm:col-span-3">
                  <input
                    className={inputClass}
                    placeholder="e.g. March 2026"
                    aria-label="Sub-note"
                    value={item.note}
                    onChange={(e) => updateItem(item.id, "note", e.target.value)}
                  />
                </Field>
                <Field label={index === 0 ? "Qty" : ""} className="col-span-4 sm:col-span-2">
                  <input
                    type="number"
                    min={0}
                    className={`${inputClass} tabular-nums`}
                    aria-label="Quantity"
                    value={item.qty}
                    onChange={(e) => updateItem(item.id, "qty", e.target.value)}
                  />
                </Field>
                <Field label={index === 0 ? "Rate (₹)" : ""} className="col-span-6 sm:col-span-2">
                  <input
                    type="number"
                    min={0}
                    className={`${inputClass} tabular-nums`}
                    aria-label="Rate"
                    value={item.rate}
                    onChange={(e) => updateItem(item.id, "rate", e.target.value)}
                  />
                </Field>
                <button
                  type="button"
                  onClick={() => removeItem(item.id)}
                  disabled={data.items.length === 1}
                  title="Remove line"
                  className="col-span-2 flex h-[38px] items-center justify-center rounded-md text-slate-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-slate-400 sm:col-span-1"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setField("items", [...data.items, newLineItem()])}
            className="mt-4 inline-flex items-center gap-1.5 rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            <Plus className="h-4 w-4" />
            Add line
          </button>
        </section>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <section className={cardClass}>
            <h2 className={cardTitle}>Bank details</h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Account name" className="sm:col-span-2">
                <input
                  className={inputClass}
                  value={data.bank.accountName}
                  onChange={(e) => setGroupField("bank", "accountName", e.target.value)}
                />
              </Field>
              <Field label="Account number">
                <input
                  className={inputClass}
                  value={data.bank.accountNumber}
                  onChange={(e) => setGroupField("bank", "accountNumber", e.target.value)}
                />
              </Field>
              <Field label="IFSC">
                <input
                  className={inputClass}
                  value={data.bank.ifsc}
                  onChange={(e) => setGroupField("bank", "ifsc", e.target.value.toUpperCase())}
                />
              </Field>
              <Field label="Account type">
                <select
                  className={inputClass}
                  value={data.bank.accountType}
                  onChange={(e) => setGroupField("bank", "accountType", e.target.value)}
                >
                  <option>Savings</option>
                  <option>Current</option>
                </select>
              </Field>
              <Field label="Bank">
                <input
                  className={inputClass}
                  value={data.bank.bankName}
                  onChange={(e) => setGroupField("bank", "bankName", e.target.value)}
                />
              </Field>
            </div>
          </section>

          <section className={cardClass}>
            <h2 className={cardTitle}>Signature &amp; notes</h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Signatory name">
                <input
                  className={inputClass}
                  value={data.signatory.name}
                  onChange={(e) => setGroupField("signatory", "name", e.target.value)}
                />
              </Field>
              <Field label="Designation (optional)">
                <input
                  className={inputClass}
                  placeholder="e.g. Proprietor"
                  value={data.signatory.title}
                  onChange={(e) => setGroupField("signatory", "title", e.target.value)}
                />
              </Field>
              <div className="space-y-1 sm:col-span-2">
                <span className="text-sm font-medium text-slate-700">
                  Signature image (optional, PNG or JPG)
                </span>
                <div className="flex items-center gap-3">
                  <input
                    type="file"
                    accept="image/png,image/jpeg"
                    onChange={handleSignature}
                    className="block w-full text-sm text-slate-500 file:mr-3 file:rounded-md file:border file:border-slate-300 file:bg-white file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-slate-700 hover:file:bg-slate-50"
                  />
                  {data.signature ? (
                    <button
                      type="button"
                      onClick={() => setField("signature", "")}
                      className="shrink-0 text-xs font-medium text-red-600 hover:underline"
                    >
                      Remove
                    </button>
                  ) : null}
                </div>
                {signatureError ? (
                  <p className="text-xs text-red-600">{signatureError}</p>
                ) : null}
              </div>
              <Field label="Footer note" className="sm:col-span-2">
                <textarea
                  rows={2}
                  className={inputClass}
                  value={data.notes}
                  onChange={(e) => setField("notes", e.target.value)}
                />
              </Field>
            </div>
          </section>
        </div>

        <h2 className="pt-2 text-sm font-semibold text-slate-900">Preview</h2>
      </div>

      <div className="mt-3 print:mt-0">
        <InvoicePreview data={data} />
      </div>
    </div>
  );
}
