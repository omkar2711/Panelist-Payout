import {
  formatLongDate,
  formatMoney,
  invoiceTotal,
  lineAmount,
  type InvoiceData,
} from "@/lib/invoice";

const sectionLabel = "text-[11px] font-semibold text-slate-500";

export function InvoicePreview({ data }: { data: InvoiceData }) {
  const total = invoiceTotal(data.items);
  const bankRows = [
    ["Account Name", data.bank.accountName],
    ["Account Number", data.bank.accountNumber],
    ["IFSC", data.bank.ifsc],
    ["Account Type", data.bank.accountType],
    ["Bank", data.bank.bankName],
  ].filter(([, value]) => value.trim());
  const hasBankDetails = [
    data.bank.accountName,
    data.bank.accountNumber,
    data.bank.ifsc,
    data.bank.bankName,
  ].some((value) => value.trim());
  const signatoryLine = [data.signatory.name, data.signatory.title]
    .filter((part) => part.trim())
    .join("  ·  ");

  return (
    <div className="invoice-sheet mx-auto w-full max-w-[794px] bg-white text-[13px] leading-snug text-slate-800 shadow-sm ring-1 ring-slate-200 print:max-w-none print:shadow-none print:ring-0">
      <header className="flex items-center justify-between gap-4 bg-[#1a1a2e] px-6 py-5 text-white">
        <div>
          <p className="text-xl font-bold">Invoice</p>
          <p className="mt-0.5 text-sm text-indigo-300">
            Invoice No # {data.invoiceNo || "—"}
          </p>
        </div>
        {data.brand.trim() ? (
          <p className="text-right text-3xl font-extrabold uppercase tracking-wide">
            {data.brand}
          </p>
        ) : null}
      </header>

      <div className="grid grid-cols-3 border-t-2 border-indigo-600 bg-slate-50 px-6 py-3">
        <div>
          <p className={sectionLabel}>Invoice Date</p>
          <p className="font-semibold text-slate-900">
            {formatLongDate(data.invoiceDate)}
          </p>
        </div>
        <div>
          <p className={sectionLabel}>Due Date</p>
          <p className="font-semibold text-slate-900">{formatLongDate(data.dueDate)}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 px-6 py-5">
        <div className="pr-6">
          <p className={sectionLabel}>Billed By</p>
          <p className="mt-1 font-bold text-slate-900">
            {data.from.name || <span className="text-slate-300 print:hidden">Your name</span>}
          </p>
          <p className="whitespace-pre-line">{data.from.address}</p>
          {data.from.pan.trim() ? (
            <p className="mt-1.5 text-xs font-bold text-slate-900">
              PAN: {data.from.pan}
            </p>
          ) : null}
          <div className="mt-1 text-xs text-slate-500">
            {data.from.email.trim() ? <p>Email: {data.from.email}</p> : null}
            {data.from.phone.trim() ? <p>Phone: {data.from.phone}</p> : null}
          </div>
        </div>
        <div className="border-l border-slate-200 pl-6">
          <p className={sectionLabel}>Billed To</p>
          <p className="mt-1 font-bold text-slate-900">
            {data.to.name || <span className="text-slate-300 print:hidden">Client name</span>}
          </p>
          <p className="whitespace-pre-line">{data.to.address}</p>
          <div className="mt-1.5 text-xs font-bold text-slate-900">
            {data.to.gstin.trim() ? <p>GSTIN: {data.to.gstin}</p> : null}
            {data.to.pan.trim() ? <p>PAN: {data.to.pan}</p> : null}
          </div>
        </div>
      </div>

      <table className="w-full border-y border-slate-200 text-left">
        <thead>
          <tr className="bg-[#1a1a2e] text-xs font-bold text-white">
            <th className="w-10 px-3 py-3">#</th>
            <th className="px-3 py-3">Item</th>
            <th className="w-16 px-3 py-3 text-center">Qty</th>
            <th className="w-32 px-3 py-3 text-right">Rate</th>
            <th className="w-36 px-3 py-3 text-right">Amount</th>
          </tr>
        </thead>
        <tbody>
          {data.items.map((item, index) => (
            <tr
              key={item.id}
              className="break-inside-avoid border-t border-slate-200 odd:bg-white even:bg-slate-50"
            >
              <td className="px-3 py-3 align-middle">{index + 1}</td>
              <td className="px-3 py-3">
                <p>{item.description || "—"}</p>
                {item.note.trim() ? (
                  <p className="text-[11px] text-slate-500">{item.note}</p>
                ) : null}
              </td>
              <td className="px-3 py-3 text-center tabular-nums">{item.qty || 0}</td>
              <td className="px-3 py-3 text-right tabular-nums">
                {formatMoney(Number(item.rate) || 0)}
              </td>
              <td className="px-3 py-3 text-right tabular-nums">
                {formatMoney(lineAmount(item))}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="flex justify-end px-6 pt-5">
        <div className="flex w-80 break-inside-avoid items-center justify-between bg-[#1a1a2e] px-4 py-3 text-base font-bold text-white">
          <span>Total (INR)</span>
          <span className="tabular-nums">{formatMoney(total)}</span>
        </div>
      </div>

      {hasBankDetails ? (
        <div className="break-inside-avoid px-6 pt-6">
          <p className={sectionLabel}>Bank Details</p>
          <dl className="mx-auto mt-2 max-w-xl">
            {bankRows.map(([label, value]) => (
              <div
                key={label}
                className="grid grid-cols-[10rem_1fr] border-b border-slate-200 py-2 last:border-b-0"
              >
                <dt className="text-slate-500">{label}</dt>
                <dd className="font-bold text-slate-900">{value}</dd>
              </div>
            ))}
          </dl>
        </div>
      ) : null}

      {data.notes.trim() ? (
        <p className="whitespace-pre-line px-6 pt-5 text-xs text-slate-500">
          {data.notes}
        </p>
      ) : null}

      <div className="mx-6 mt-6 break-inside-avoid border-t border-slate-200 pb-8 pt-6 text-center">
        {data.signature ? (
          // eslint-disable-next-line @next/next/no-img-element -- local data URL the vendor just uploaded
          <img src={data.signature} alt="Signature" className="mx-auto h-20 object-contain" />
        ) : (
          <div className="h-12" />
        )}
        {signatoryLine ? <p className="mt-2 text-slate-500">{signatoryLine}</p> : null}
      </div>
    </div>
  );
}
