import {
  Document,
  Font,
  Image,
  Page,
  StyleSheet,
  Text,
  View,
  pdf,
} from "@react-pdf/renderer";
import {
  formatLongDate,
  formatMoney,
  invoiceTotal,
  lineAmount,
  type InvoiceData,
} from "@/lib/invoice";
import { INVOICE_LOGO, showsBrandLogo } from "@/lib/brand";

const DARK = "#1a1a2e";
const HAIRLINE = "#e2e8f0";
const MUTED = "#64748b";
const INK = "#0f172a";

let fontsRegistered = false;

// Inter is bundled in /public/fonts because the built-in PDF fonts have no rupee sign.
function registerFonts(baseUrl: string) {
  if (fontsRegistered) return;
  Font.register({
    family: "Inter",
    fonts: [
      { src: `${baseUrl}/fonts/Inter-Regular.ttf`, fontWeight: 400 },
      { src: `${baseUrl}/fonts/Inter-SemiBold.ttf`, fontWeight: 600 },
      { src: `${baseUrl}/fonts/Inter-Bold.ttf`, fontWeight: 700 },
    ],
  });
  Font.registerHyphenationCallback((word) => [word]);
  fontsRegistered = true;
}

const styles = StyleSheet.create({
  page: {
    paddingVertical: 28,
    paddingHorizontal: 28,
    fontFamily: "Inter",
    fontSize: 9.5,
    lineHeight: 1.4,
    color: "#1e293b",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: DARK,
    paddingVertical: 16,
    paddingHorizontal: 18,
  },
  headerTitle: { fontSize: 15, fontWeight: 700, color: "#ffffff", lineHeight: 1.25 },
  headerNumber: { fontSize: 10, color: "#a5b4fc", marginTop: 4 },
  brand: {
    fontSize: 22,
    fontWeight: 700,
    color: "#ffffff",
    textTransform: "uppercase",
    letterSpacing: 0.6,
    maxWidth: 300,
    textAlign: "right",
  },
  brandLogo: { height: 36, width: 36 * (INVOICE_LOGO.width / INVOICE_LOGO.height) },
  dateBand: {
    flexDirection: "row",
    borderTopWidth: 2,
    borderTopColor: "#4f46e5",
    backgroundColor: "#f8fafc",
    paddingVertical: 9,
    paddingHorizontal: 18,
  },
  dateCell: { width: "33%" },
  label: { fontSize: 8, fontWeight: 600, color: MUTED },
  strong: { fontWeight: 600, color: INK },
  parties: { flexDirection: "row", paddingVertical: 16, paddingHorizontal: 18 },
  partyLeft: { flex: 1, paddingRight: 18 },
  partyRight: {
    flex: 1,
    paddingLeft: 18,
    borderLeftWidth: 1,
    borderLeftColor: HAIRLINE,
  },
  partyName: { fontWeight: 700, color: INK, marginTop: 3 },
  ids: { fontSize: 8.5, fontWeight: 700, color: INK, marginTop: 5 },
  contact: { fontSize: 8.5, color: MUTED, marginTop: 3 },
  tableHead: {
    flexDirection: "row",
    backgroundColor: DARK,
    color: "#ffffff",
    fontSize: 8.5,
    fontWeight: 700,
    paddingVertical: 9,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: HAIRLINE,
    paddingVertical: 9,
  },
  colIndex: { width: 30, paddingLeft: 10 },
  colItem: { flex: 1, paddingHorizontal: 8 },
  colQty: { width: 50, textAlign: "center" },
  colRate: { width: 90, textAlign: "right", paddingRight: 8 },
  colAmount: { width: 100, textAlign: "right", paddingRight: 10 },
  itemNote: { fontSize: 8, color: MUTED },
  tableEnd: { borderTopWidth: 1, borderTopColor: HAIRLINE },
  totalWrap: {
    flexDirection: "row",
    justifyContent: "flex-end",
    paddingTop: 16,
    paddingHorizontal: 18,
  },
  totalBox: {
    width: 240,
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: DARK,
    color: "#ffffff",
    fontSize: 12,
    fontWeight: 700,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  section: { paddingTop: 20, paddingHorizontal: 18 },
  bankList: { marginTop: 6, marginHorizontal: 50 },
  bankRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: HAIRLINE,
    paddingVertical: 6,
  },
  bankLabel: { width: 130, color: MUTED },
  bankValue: { flex: 1, fontWeight: 700, color: INK },
  notes: { fontSize: 8.5, color: MUTED, paddingTop: 16, paddingHorizontal: 18 },
  signature: {
    marginTop: 22,
    marginHorizontal: 18,
    paddingTop: 18,
    borderTopWidth: 1,
    borderTopColor: HAIRLINE,
    alignItems: "center",
  },
  signatureImage: { height: 56, maxWidth: 220, objectFit: "contain" },
  signatureGap: { height: 34 },
  signatory: { color: MUTED, marginTop: 6 },
});

function InvoiceDocument({ data, baseUrl }: { data: InvoiceData; baseUrl: string }) {
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
    <Document title={`Invoice ${data.invoiceNo}`} author={data.from.name}>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>Invoice</Text>
            <Text style={styles.headerNumber}>Invoice No # {data.invoiceNo || "—"}</Text>
          </View>
          {showsBrandLogo(data.brand) ? (
            // eslint-disable-next-line jsx-a11y/alt-text -- react-pdf's Image has no alt prop
            <Image src={`${baseUrl}${INVOICE_LOGO.src}`} style={styles.brandLogo} />
          ) : data.brand.trim() ? (
            <Text style={styles.brand}>{data.brand}</Text>
          ) : null}
        </View>

        <View style={styles.dateBand}>
          <View style={styles.dateCell}>
            <Text style={styles.label}>Invoice Date</Text>
            <Text style={styles.strong}>{formatLongDate(data.invoiceDate)}</Text>
          </View>
          <View style={styles.dateCell}>
            <Text style={styles.label}>Due Date</Text>
            <Text style={styles.strong}>{formatLongDate(data.dueDate)}</Text>
          </View>
        </View>

        <View style={styles.parties}>
          <View style={styles.partyLeft}>
            <Text style={styles.label}>Billed By</Text>
            <Text style={styles.partyName}>{data.from.name}</Text>
            {data.from.address.trim() ? <Text>{data.from.address}</Text> : null}
            {data.from.pan.trim() ? (
              <Text style={styles.ids}>PAN: {data.from.pan}</Text>
            ) : null}
            {data.from.email.trim() ? (
              <Text style={styles.contact}>Email: {data.from.email}</Text>
            ) : null}
            {data.from.phone.trim() ? (
              <Text style={styles.contact}>Phone: {data.from.phone}</Text>
            ) : null}
          </View>
          <View style={styles.partyRight}>
            <Text style={styles.label}>Billed To</Text>
            <Text style={styles.partyName}>{data.to.name}</Text>
            {data.to.address.trim() ? <Text>{data.to.address}</Text> : null}
            {data.to.gstin.trim() ? (
              <Text style={styles.ids}>GSTIN: {data.to.gstin}</Text>
            ) : null}
            {data.to.pan.trim() ? (
              <Text style={[styles.ids, data.to.gstin.trim() ? { marginTop: 0 } : {}]}>
                PAN: {data.to.pan}
              </Text>
            ) : null}
          </View>
        </View>

        <View style={styles.tableHead}>
          <Text style={styles.colIndex}>#</Text>
          <Text style={styles.colItem}>Item</Text>
          <Text style={styles.colQty}>Qty</Text>
          <Text style={styles.colRate}>Rate</Text>
          <Text style={styles.colAmount}>Amount</Text>
        </View>
        {data.items.map((item, index) => (
          <View
            key={item.id}
            wrap={false}
            style={[styles.row, { backgroundColor: index % 2 ? "#f8fafc" : "#ffffff" }]}
          >
            <Text style={styles.colIndex}>{index + 1}</Text>
            <View style={styles.colItem}>
              <Text>{item.description || "—"}</Text>
              {item.note.trim() ? <Text style={styles.itemNote}>{item.note}</Text> : null}
            </View>
            <Text style={styles.colQty}>{item.qty || 0}</Text>
            <Text style={styles.colRate}>{formatMoney(Number(item.rate) || 0)}</Text>
            <Text style={styles.colAmount}>{formatMoney(lineAmount(item))}</Text>
          </View>
        ))}
        <View style={styles.tableEnd} />

        <View style={styles.totalWrap} wrap={false}>
          <View style={styles.totalBox}>
            <Text>Total (INR)</Text>
            <Text>{formatMoney(invoiceTotal(data.items))}</Text>
          </View>
        </View>

        {hasBankDetails ? (
          <View style={styles.section} wrap={false}>
            <Text style={styles.label}>Bank Details</Text>
            <View style={styles.bankList}>
              {bankRows.map(([label, value], index) => (
                <View
                  key={label}
                  style={[
                    styles.bankRow,
                    index === bankRows.length - 1 ? { borderBottomWidth: 0 } : {},
                  ]}
                >
                  <Text style={styles.bankLabel}>{label}</Text>
                  <Text style={styles.bankValue}>{value}</Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        {data.notes.trim() ? <Text style={styles.notes}>{data.notes}</Text> : null}

        <View style={styles.signature} wrap={false}>
          {data.signature ? (
            // eslint-disable-next-line jsx-a11y/alt-text -- react-pdf's Image has no alt prop
            <Image src={data.signature} style={styles.signatureImage} />
          ) : (
            <View style={styles.signatureGap} />
          )}
          {signatoryLine ? <Text style={styles.signatory}>{signatoryLine}</Text> : null}
        </View>
      </Page>
    </Document>
  );
}

export async function createInvoicePdf(data: InvoiceData, baseUrl = "") {
  registerFonts(baseUrl);
  return pdf(<InvoiceDocument data={data} baseUrl={baseUrl} />).toBlob();
}
