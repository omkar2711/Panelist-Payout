// The organization's trading name, shown across the app and on invoices.
export const ORG_NAME = "ExpertBench";

// The invoice header shows the logo while its header name is still the org name;
// any other name the vendor types is printed as plain text instead.
export const INVOICE_LOGO = { src: "/brand/logo-dark.png", width: 901, height: 220 };
export function showsBrandLogo(headerName: string) {
  return headerName.trim().toLowerCase() === ORG_NAME.toLowerCase();
}
