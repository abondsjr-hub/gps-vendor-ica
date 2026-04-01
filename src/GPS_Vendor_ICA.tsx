import { useState, useRef, useEffect } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { LOGO_B64 } from "./logoB64";

// ── Supabase client (inline to keep single-file) ──
import { createClient } from "@supabase/supabase-js";
const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

const BRAND = {
  primaryBlue: "#2558A4",
  darkBlue: "#1A3F7C",
  accentGreen: "#79B61D",
  darkGreen: "#5C8C12",
  lightBg: "#F4F7F2",
  white: "#FFFFFF",
  border: "#D1DAEA",
  text: "#1A2740",
  muted: "#5A6E8A",
  subtleBlue: "#EAF1FB",
  subtleBlueBorder: "#BED0EA",
  subtleGreen: "#EFF6DF",
  subtleGreenBorder: "#CFE2A0",
  surfaceTint: "#F9FBFE",
  danger: "#C0392B",
  dangerBg: "#FCEDEA",
  dangerBorder: "#F1C7BF",
  headerGradient: "linear-gradient(135deg, #1A3F7C 0%, #2558A4 58%, #79B61D 100%)",
  buttonGradient: "linear-gradient(135deg, #2558A4 0%, #1A3F7C 62%, #79B61D 100%)",
  buttonGradientHover: "linear-gradient(135deg, #1A3F7C 0%, #2558A4 48%, #5C8C12 100%)",
  pageGradient: "radial-gradient(circle at top right, rgba(121, 182, 29, 0.12), transparent 28%), linear-gradient(180deg, #F4F7F2 0%, #EEF3F9 42%, #F4F7F2 100%)",
  panelGradient: "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, #F8FAFD 100%)",
  shadowLg: "0 20px 44px rgba(26, 63, 124, 0.12)",
  shadowMd: "0 14px 30px rgba(26, 63, 124, 0.10)",
  shadowSm: "0 8px 18px rgba(26, 63, 124, 0.08)",
  focusRing: "0 0 0 4px rgba(37, 88, 164, 0.14)",
};

const REPORT = {
  blue: [37, 88, 164] as [number, number, number],
  darkBlue: [26, 63, 124] as [number, number, number],
  green: [121, 182, 29] as [number, number, number],
  darkGreen: [92, 140, 18] as [number, number, number],
  border: [209, 218, 234] as [number, number, number],
  text: [26, 39, 64] as [number, number, number],
  muted: [90, 110, 138] as [number, number, number],
  surface: [255, 255, 255] as [number, number, number],
  light: [244, 247, 242] as [number, number, number],
};

const STATUS_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  pending: { bg: BRAND.subtleBlue, text: BRAND.darkBlue, border: BRAND.subtleBlueBorder },
  approved: { bg: BRAND.subtleGreen, text: BRAND.darkGreen, border: BRAND.subtleGreenBorder },
  rejected: { bg: BRAND.dangerBg, text: BRAND.danger, border: BRAND.dangerBorder },
};

const shellStyles = {
  page: {
    minHeight: "100vh",
    background: BRAND.pageGradient,
  } as React.CSSProperties,
  shell: {
    maxWidth: 960,
    margin: "0 auto",
    padding: "20px 24px",
  } as React.CSSProperties,
  card: {
    background: BRAND.panelGradient,
    borderRadius: 22,
    border: `1px solid ${BRAND.border}`,
    boxShadow: BRAND.shadowLg,
  } as React.CSSProperties,
};

const BrandMark = ({ size = 48, tone = "dark" }: { size?: number; tone?: "dark" | "light" }) => {
  const isDark = tone === "dark";
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: Math.round(size * 0.28),
        border: isDark ? "1px solid rgba(255,255,255,0.18)" : `1px solid ${BRAND.border}`,
        background: isDark ? "rgba(255,255,255,0.12)" : "linear-gradient(180deg, #FFFFFF 0%, #F0F4FA 100%)",
        boxShadow: isDark ? "0 12px 24px rgba(10, 24, 52, 0.18)" : BRAND.shadowSm,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      <img
        src="/logo.png"
        alt="Groves Property Services logo"
        style={{ width: size * 0.68, height: size * 0.68, objectFit: "contain" }}
      />
    </div>
  );
};

const SERVICES = [
  { id: "tree", label: "Tree Services", desc: "Removal, trimming, pruning, stump grinding" },
  { id: "landscape", label: "Landscaping / Grounds", desc: "Lawn care, planting, grounds maintenance" },
  { id: "cleaning", label: "Cleaning Services", desc: "Residential & commercial cleaning" },
  { id: "gutter", label: "Gutter Cleaning / Repairs", desc: "Gutter cleaning and minor repairs" },
  { id: "pressure", label: "Pressure Washing", desc: "Exterior surface cleaning" },
  { id: "junk", label: "Junk Removal / Hauling", desc: "Debris and junk removal services" },
];

const AGREEMENT_SECTIONS = [
  { num: 1, title: "Services & Scope of Work", text: "Vendor agrees to perform services as mutually agreed upon prior to the commencement of any work. The specific scope of each work order will be confirmed in writing (via estimate, work order, or purchase order) before work commences. Vendor shall not perform work beyond the agreed scope without prior written authorization from a Groves Property Services representative." },
  { num: 2, title: "Compensation & Payment Terms", text: "Compensation for each work order will be agreed upon by both parties prior to the commencement of work and confirmed in writing via an approved estimate or work order. Vendors are not responsible for invoicing. Groves Property Services handles all client invoicing internally.\n\nPayment to the Vendor will be issued on a Net 30 basis. The Net 30 payment period begins on the date Groves Property Services issues its invoice to the client, which occurs after satisfactory proof of work completion has been received — submitted by either the assigned Vendor or an authorized Groves Property Services staff member. Acceptable proof of completion includes field photos, a signed completion form, or written confirmation from a Groves representative.\n\nVendor payments will be processed within thirty (30) calendar days of that invoice date, provided there are no disputes regarding the scope or quality of work performed. In the event of a dispute, Groves Property Services will notify the Vendor in writing within five (5) business days and both parties agree to resolve the matter in good faith before payment is released." },
  { num: 3, title: "Independent Contractor Status", text: "This Agreement establishes an independent contractor relationship only. Nothing in this Agreement shall be construed to create an employer-employee, partnership, joint venture, or agency relationship. The Company provides no benefits to Vendor, including unemployment insurance, health or disability insurance, worker's compensation, paid leave, or retirement benefits. Vendor is solely responsible for payment of all applicable federal, state, and local income taxes, self-employment taxes, and any other taxes arising from compensation received." },
  { num: 4, title: "Tools, Equipment & Materials", text: "Vendor shall furnish all tools, equipment, vehicles, and materials necessary to complete each work order unless otherwise agreed in writing prior to job commencement. The Company is only concerned with the quality of work and results delivered. Vendor assumes full responsibility for the condition and safe operation of all equipment used on Company-assigned jobs." },
  { num: 5, title: "Professional Standards & Conduct", text: "Vendor agrees to: arrive on time and communicate proactively regarding any delays or issues; perform all work in a safe, workmanlike manner consistent with industry standards; treat all property, tenants, and client contacts with professionalism and respect; leave the job site clean and in the same or better condition than upon arrival; promptly notify the Company of any site conditions, safety hazards, or scope changes; comply with all applicable laws, regulations, and safety codes; maintain any required licenses, permits, or certifications." },
  { num: 6, title: "Term & Termination", text: "This Agreement is continuous until canceled by either party. The Company reserves the right to terminate this Agreement and any active work orders at any time, with or without cause, and without prior notice. Upon termination, Vendor shall be entitled to payment only for work satisfactorily completed up to the date of termination, in accordance with the Net 30 payment policy. Sections 8 through 11 survive termination." },
  { num: 7, title: "Insurance & Liability", text: "The Company does not provide insurance coverage for Vendor's work, employees, equipment, or operations. Vendor is strongly encouraged to carry general liability insurance appropriate to the services performed. Vendor agrees to indemnify, defend, and hold harmless Groves Property Services LLC, its representatives, clients, and assigns from any claims, damages, losses, or expenses (including reasonable attorney fees) arising out of or relating to Vendor's performance of services." },
  { num: 8, title: "Confidentiality", text: "During and after the term of this Agreement, Vendor agrees to keep confidential all non-public information regarding the Company's clients, pricing, business operations, vendor relationships, and internal processes. Vendor shall not disclose such information to any third party without prior written consent, nor use it for any purpose other than fulfilling obligations under this Agreement." },
  { num: 9, title: "Non-Solicitation of Clients", text: "During the term of this Agreement and for twelve (12) months following its termination, Vendor agrees not to directly solicit, contact, or accept work from any client or property to which Vendor was introduced or assigned through Groves Property Services, without prior written consent. This does not prohibit Vendor from serving clients with whom Vendor had a pre-existing, independent business relationship." },
  { num: 10, title: "Work Quality & Warranty", text: "Vendor warrants that all services performed will meet or exceed industry-standard quality. If a deficiency or incomplete work is identified, Vendor agrees to return and correct the issue in a timely manner at no additional charge, provided it relates to Vendor's original scope. Repeated quality failures may result in removal from the Company's active vendor roster." },
  { num: 11, title: "Dispute Resolution", text: "In the event of a dispute, both parties agree to first attempt resolution through good-faith written communication. If unresolved within fifteen (15) business days, either party may pursue remedies under the laws of the State of Georgia. This Agreement shall be governed by Georgia law." },
  { num: 12, title: "General Provisions", text: "This Agreement constitutes the entire understanding between the parties and supersedes all prior agreements. Any modification must be in writing and signed by both parties. If any provision is found unenforceable, the remaining provisions remain in full force. This Agreement may be executed in counterparts, including digital or electronic signatures." },
];

const STEPS = [
  { id: "vendor", label: "Vendor Info" },
  { id: "services", label: "Services" },
  { id: "documents", label: "Documents" },
  { id: "agreement", label: "Agreement" },
  { id: "sign", label: "Sign" },
  { id: "complete", label: "Complete" },
];

const DOC_TYPES = [
  { key: "generalLiability", bucket: "general-liability", label: "General Liability Policy", desc: "Upload your current general liability insurance certificate", required: true },
  { key: "w9", bucket: "w9-documents", label: "Company W-9", desc: "IRS Form W-9 for tax reporting purposes", required: true },
  { key: "workersComp", bucket: "workers-comp", label: "Workers' Compensation", desc: "Workers' comp certificate or exemption letter", required: false },
];

const ADMIN_ALLOWED_EMAILS = new Set([
  "abondsjr@thegroveslandscaping.com",
  "info@thegroveslandscaping.com",
  "chayne@thegroveslandscaping.com",
]);

const normalizeEmail = (email: string) => email.trim().toLowerCase();
const isAllowedAdminEmail = (email: string) => ADMIN_ALLOWED_EMAILS.has(normalizeEmail(email));

// ── Signature Pad ──
function SignaturePad({ sigRef, onClear }: { sigRef: React.MutableRefObject<any>; onClear?: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const lastPos = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * 2;
    canvas.height = rect.height * 2;
    ctx.scale(2, 2);
    ctx.strokeStyle = BRAND.darkBlue;
    ctx.lineWidth = 2.4;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    sigRef.current = { canvas, ctx, hasDrawn: false };
  }, []);

  const getPos = (e: any) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return { x: clientX - rect.left, y: clientY - rect.top };
  };
  const start = (e: any) => { e.preventDefault(); drawing.current = true; lastPos.current = getPos(e); };
  const move = (e: any) => {
    if (!drawing.current) return;
    e.preventDefault();
    const pos = getPos(e);
    const ctx = sigRef.current.ctx;
    ctx.beginPath();
    ctx.moveTo(lastPos.current.x, lastPos.current.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    lastPos.current = pos;
    sigRef.current.hasDrawn = true;
  };
  const end = () => { drawing.current = false; };
  const clear = () => {
    const { canvas, ctx } = sigRef.current;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    sigRef.current.hasDrawn = false;
    onClear?.();
  };

  return (
    <div>
      <canvas
        ref={canvasRef}
        className="gps-signature-pad"
        style={{
          width: "100%",
          height: 132,
          border: `2px solid ${BRAND.border}`,
          borderRadius: 14,
          background: "linear-gradient(180deg, #FFFFFF 0%, #F8FBFF 100%)",
          cursor: "crosshair",
          touchAction: "none",
          boxShadow: "inset 0 1px 0 rgba(255,255,255,0.9)",
        }}
        onMouseDown={start}
        onMouseMove={move}
        onMouseUp={end}
        onMouseLeave={end}
        onTouchStart={start}
        onTouchMove={move}
        onTouchEnd={end}
      />
      <button
        onClick={clear}
        className="gps-secondary-btn"
        style={{ marginTop: 10, fontSize: 13, padding: "7px 14px" }}
      >
        Clear
      </button>
    </div>
  );
}

// ── File Upload Card ──
function FileUploadCard({ doc, file, onFileChange, error }: { doc: typeof DOC_TYPES[0]; file: File | null; onFileChange: (f: File | null) => void; error?: string }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const stateStyles = file
    ? { border: BRAND.subtleGreenBorder, background: "linear-gradient(180deg, #FBFDF5 0%, #F3F8E8 100%)", accent: BRAND.darkGreen }
    : error
      ? { border: BRAND.dangerBorder, background: "#FFF8F7", accent: BRAND.danger }
      : { border: BRAND.border, background: "linear-gradient(180deg, #FFFFFF 0%, #F9FBFE 100%)", accent: BRAND.primaryBlue };
  return (
    <div
      style={{
        padding: 18,
        borderRadius: 16,
        border: `1px solid ${stateStyles.border}`,
        background: stateStyles.background,
        transition: "all 0.2s",
        boxShadow: file ? BRAND.shadowSm : "none",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6, gap: 12 }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 15, color: BRAND.text }}>
            {doc.label} {doc.required && <span style={{ color: BRAND.danger }}>*</span>}
          </div>
          <div style={{ fontSize: 13, color: BRAND.muted, marginTop: 4, lineHeight: 1.45 }}>{doc.desc}</div>
        </div>
        {file && (
          <span
            style={{
              fontSize: 12,
              color: BRAND.white,
              background: BRAND.darkGreen,
              borderRadius: 999,
              padding: "5px 10px",
              fontWeight: 700,
              letterSpacing: 0.4,
              textTransform: "uppercase",
            }}
          >
            Ready
          </span>
        )}
      </div>
      <input ref={inputRef} type="file" accept=".pdf,.jpg,.jpeg,.png" style={{ display: "none" }}
        onChange={(e) => onFileChange(e.target.files?.[0] || null)} />
      {file ? (
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 10 }}>
          <div style={{ fontSize: 13, color: BRAND.text, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {file.name} <span style={{ color: BRAND.muted }}>({(file.size / 1024).toFixed(0)} KB)</span>
          </div>
          <button
            onClick={() => onFileChange(null)}
            className="gps-secondary-btn"
            style={{ fontSize: 12, color: BRAND.danger, borderColor: BRAND.dangerBorder, padding: "6px 12px" }}
          >
            Remove
          </button>
        </div>
      ) : (
        <button
          onClick={() => inputRef.current?.click()}
          className="gps-upload-btn"
          style={{ marginTop: 12, width: "100%", padding: "12px 14px", fontSize: 14, fontWeight: 700, color: stateStyles.accent, borderColor: stateStyles.border }}
        >
          Choose File (PDF, JPG, PNG)
        </button>
      )}
      {error && <div style={{ color: BRAND.danger, fontSize: 12, marginTop: 8 }}>{error}</div>}
    </div>
  );
}

// ── Admin Dashboard ──
function AdminDashboard({ onLogout }: { onLogout: () => void }) {
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<any>(null);
  const [downloadingDoc, setDownloadingDoc] = useState<string | null>(null);
  const [generatingReport, setGeneratingReport] = useState<string | null>(null);

  const font = `'Source Serif 4', 'Georgia', serif`;
  const sansFont = `'DM Sans', 'Segoe UI', sans-serif`;

  useEffect(() => { loadSubmissions(); }, []);

  const loadSubmissions = async () => {
    setLoading(true);
    const { data } = await supabase.from("vendor_submissions").select("*").order("created_at", { ascending: false });
    setSubmissions(data || []);
    setLoading(false);
  };

  const updateStatus = async (id: string, status: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from("vendor_submissions").update({ status, reviewed_by: user?.id, reviewed_at: new Date().toISOString() }).eq("id", id);
    loadSubmissions();
    if (selected?.id === id) setSelected({ ...selected, status });
  };

  const downloadDoc = async (bucket: string, path: string, filename: string, docKey: string) => {
    setDownloadingDoc(docKey);
    const { data } = await supabase.storage.from(bucket).createSignedUrl(path, 300);
    if (data?.signedUrl) {
      const a = document.createElement("a");
      a.href = data.signedUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
    setDownloadingDoc(null);
  };

  const generateReport = async (vendor: any) => {
    const reportKey = `${vendor.id}_report`;
    setGeneratingReport(reportKey);

    try {
      // ── Fetch signature as base64 ──
      let signatureBase64: string | null = null;
      if (vendor.signature_url) {
        const { data: sigData } = await supabase.storage.from("signatures").createSignedUrl(vendor.signature_url, 60);
        if (sigData?.signedUrl) {
          try {
            const res = await fetch(sigData.signedUrl);
            const blob = await res.blob();
            signatureBase64 = await new Promise<string>((resolve, reject) => {
              const reader = new FileReader();
              reader.onloadend = () => resolve(reader.result as string);
              reader.onerror = reject;
              reader.readAsDataURL(blob);
            });
          } catch { /* continue without signature */ }
        }
      }

      // ── Document setup ──
      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "letter" });
      const pageW = doc.internal.pageSize.getWidth();
      const pageH = doc.internal.pageSize.getHeight();
      const margin = 20;
      const usableW = pageW - margin * 2;
      const today = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
      const genDate = new Date().toISOString().slice(0, 10);

      // Colors (as explicit tuples — no spread into typed params)
      const [P1, P2, P3] = REPORT.darkBlue;
      const [A1, A2, A3] = REPORT.green;
      const [B1, B2, B3] = REPORT.text;
      const [M1, M2, M3] = REPORT.muted;

      // Vertical zones
      const coverHeaderH = 50;  // taller to fit centered square logo (40×40mm)
      const runHeaderH = 26;    // stacked: logo 16mm + 2 text lines + gap
      const footerLineY = pageH - 14;
      const coverContentY = coverHeaderH + 6;
      const runContentY = runHeaderH + 5;

      // ── Helpers ──
      // FIX 3 — sub-page header: logo centered above centered text, no 3-column layout
      const drawRunningHeader = (vendorName: string) => {
        const rLogoW = 16;  // square logo — 1:1 ratio
        const rLogoX = (pageW - rLogoW) / 2;
        try { doc.addImage(LOGO_B64, "PNG", rLogoX, 2, rLogoW, rLogoW); } catch { /* skip */ }
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8.5);
        doc.setTextColor(P1, P2, P3);
        doc.text("Groves Property Services \u2014 Independent Contractor Agreement", pageW / 2, 21, { align: "center" });
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7.5);
        doc.setTextColor(M1, M2, M3);
        doc.text(vendorName, pageW / 2, 25, { align: "center" });
        doc.setDrawColor(A1, A2, A3);
        doc.setLineWidth(0.5);
        doc.line(margin, runHeaderH, pageW - margin, runHeaderH);
      };

      const drawFooter = (p: number, total: number, vendorName: string) => {
        doc.setDrawColor(P1, P2, P3);
        doc.setLineWidth(0.3);
        doc.line(margin, footerLineY, pageW - margin, footerLineY);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7);
        doc.setTextColor(M1, M2, M3);
        doc.text(
          `CONFIDENTIAL \u2014 ${vendorName} \u2014 Page ${p} of ${total}`,
          pageW / 2, footerLineY + 5, { align: "center" }
        );
      };

      // ── Precompute shared values ──
      const vendorName: string = vendor.vendor_name ?? "Vendor";
      const statusLabel: string = vendor.status ?? "pending";
      const formattedStatus = statusLabel.charAt(0).toUpperCase() + statusLabel.slice(1);
      const formattedSignedDate = vendor.signed_date
        ? new Date(vendor.signed_date).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
        : "\u2014";

      const serviceMap: Record<string, string> = {
        tree: "Tree Services", landscape: "Landscaping / Grounds",
        cleaning: "Cleaning Services", gutter: "Gutter Cleaning / Repairs",
        pressure: "Pressure Washing", junk: "Junk Removal / Hauling",
      };
      const servicesDisplay = (vendor.services ?? [])
        .map((s: string) => serviceMap[s] ?? s).join(", ") || "\u2014";

      // ════════════════════════════════════════════════
      // PAGE 1 — COVER / SUMMARY
      // ════════════════════════════════════════════════

      // Header bar
      doc.setFillColor(P1, P2, P3);
      doc.rect(0, 0, pageW, coverHeaderH, "F");

      // FIX 2 — logo centered and enlarged in cover header (logo is square 1:1)
      const cLogoW = 40;
      const cLogoX = (pageW - cLogoW) / 2;
      const cLogoY = (coverHeaderH - cLogoW) / 2; // vertically centered in 50mm bar = 5mm
      try { doc.addImage(LOGO_B64, "PNG", cLogoX, cLogoY, cLogoW, cLogoW); } catch { /* skip */ }

      // Header text — positioned to the right of and below the logo to avoid overlap
      // Logo spans x≈88–128mm; right-aligned text at 9pt starts at ≈141mm (no collision)
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(255, 255, 255);
      doc.text("Independent Contractor Agreement", pageW - margin, 22, { align: "right" });
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(...REPORT.border);
      doc.text(`Generated: ${today}`, pageW - margin, 30, { align: "right" });
      doc.setTextColor(...REPORT.green);
      doc.text("CONFIDENTIAL", margin, 44);

      let y = coverContentY;

      // Vendor name
      doc.setFont("helvetica", "bold");
      doc.setFontSize(22);
      doc.setTextColor(P1, P2, P3);
      doc.text(vendorName, margin, y);
      y += 9;

      if (vendor.business_name) {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(12);
        doc.setTextColor(M1, M2, M3);
        doc.text(vendor.business_name, margin, y);
        y += 7;
      }

      // Status badge
      const statusBadgeRgb: Record<string, [number, number, number]> = {
        approved: REPORT.darkGreen, rejected: [192, 57, 43], pending: REPORT.blue,
      };
      const [sr, sg, sb] = statusBadgeRgb[statusLabel] ?? [100, 100, 100];
      doc.setFillColor(sr, sg, sb);
      doc.roundedRect(margin, y, 32, 8, 2, 2, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.5);
      doc.setTextColor(255, 255, 255);
      doc.text(statusLabel.toUpperCase(), margin + 16, y + 5.5, { align: "center" });
      y += 14;

      // Accent divider
      doc.setDrawColor(A1, A2, A3);
      doc.setLineWidth(0.6);
      doc.line(margin, y, pageW - margin, y);
      y += 7;

      // Section label
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(P1, P2, P3);
      doc.text("Vendor Summary", margin, y);
      y += 5;

      const summaryRows: string[][] = [
        ["Full Name", vendorName],
        ["Business Name", vendor.business_name ?? "\u2014"],
        ["Email", vendor.email ?? "\u2014"],
        ["Phone", vendor.phone ?? "\u2014"],
        ["Services", servicesDisplay],
        ["Date Signed", formattedSignedDate],
        ["Agreement Status", formattedStatus],
        ["Sections Acknowledged", `${vendor.sections_acknowledged ?? 0} of 12`],
        ["All Sections Agreed", vendor.all_sections_agreed ? "Yes" : "No"],
      ];
      if (vendor.other_service) summaryRows.push(["Other Service", vendor.other_service]);

      autoTable(doc, {
        startY: y,
        body: summaryRows,
        theme: "plain",
        bodyStyles: { fontSize: 10, textColor: [B1, B2, B3] as any },
        alternateRowStyles: { fillColor: REPORT.light as any },
        columnStyles: {
          0: { cellWidth: 55, fontStyle: "bold", textColor: [P1, P2, P3] as any },
          1: { cellWidth: usableW - 55 },
        },
        margin: { left: margin, right: margin },
        tableLineColor: REPORT.border as any,
        tableLineWidth: 0.3,
      });
      y = (doc as any).lastAutoTable.finalY + 8;

      // Intro paragraph
      const introText = `This document constitutes the Independent Contractor Agreement between Groves Property Services LLC and ${vendorName}. The vendor has reviewed and acknowledged all 12 sections of this agreement and has provided their electronic signature as confirmation of understanding and acceptance of all terms herein.`;
      const introLines = doc.splitTextToSize(introText, usableW);
      doc.setFont("helvetica", "italic");
      doc.setFontSize(9.5);
      doc.setTextColor(M1, M2, M3);
      doc.text(introLines, margin, y);

      // ════════════════════════════════════════════════
      // PAGES 2–13 — ONE PAGE PER ICA SECTION
      // ════════════════════════════════════════════════

      // Start ICA sections on a fresh page
      doc.addPage();
      drawRunningHeader(vendorName);
      y = runContentY;

      const sectionHeaderH = 16; // height of the combined green header block (mm)
      const lineH = 5.0;         // mm per line at 10pt

      for (const section of AGREEMENT_SECTIONS) {
        // Pre-measure body text so we know total height needed
        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        const bodyLines = doc.splitTextToSize(section.text, usableW);
        // sectionHeaderH + 4 gap + body + 10 inter-section gap
        const neededH = sectionHeaderH + 4 + (bodyLines.length * lineH) + 10;

        // Only break to a new page if this section won't fit above the footer
        if (y + neededH > footerLineY - 6) {
          doc.addPage();
          drawRunningHeader(vendorName);
          y = runContentY;
        }

        // Combined header block: section number (small) + title (large), single green rect
        doc.setFillColor(P1, P2, P3);
        doc.rect(margin, y, usableW, sectionHeaderH, "F");
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7.5);
        doc.setTextColor(...REPORT.border);
        doc.text(`SECTION ${section.num} OF 12`, margin + 4, y + 5.5);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(11.5);
        doc.setTextColor(255, 255, 255);
        doc.text(section.title, margin + 4, y + 13);
        y += sectionHeaderH + 4; // header + gap before body

        // Body text
        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        doc.setTextColor(B1, B2, B3);
        doc.text(bodyLines, margin, y);
        y += (bodyLines.length * lineH) + 10; // body + inter-section gap
      }

      // ════════════════════════════════════════════════
      // FINAL PAGE — SIGNATURE & CERTIFICATION
      // ════════════════════════════════════════════════

      doc.addPage();
      drawRunningHeader(vendorName);
      y = runContentY;

      // Heading
      doc.setFont("helvetica", "bold");
      doc.setFontSize(15);
      doc.setTextColor(P1, P2, P3);
      doc.text("Vendor Certification & Signature", margin, y);
      y += 7;

      doc.setDrawColor(A1, A2, A3);
      doc.setLineWidth(0.6);
      doc.line(margin, y, pageW - margin, y);
      y += 8;

      // Certification paragraph
      const certText = `By signing below, ${vendorName} confirms they have read, understood, and agreed to all 12 sections of this Independent Contractor Agreement with Groves Property Services. This electronic signature constitutes a legally binding acknowledgment of all terms and conditions set forth in this agreement.`;
      const certLines = doc.splitTextToSize(certText, usableW);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(B1, B2, B3);
      doc.text(certLines, margin, y);
      y += (certLines.length * 5.6) + 8;

      // Vendor detail table
      autoTable(doc, {
        startY: y,
        body: [
          ["Full Name", vendorName],
          ["Business", vendor.business_name ?? "\u2014"],
          ["Email", vendor.email ?? "\u2014"],
          ["Date Signed", formattedSignedDate],
        ],
        theme: "plain",
        bodyStyles: { fontSize: 10, textColor: [B1, B2, B3] as any },
        alternateRowStyles: { fillColor: REPORT.light as any },
        columnStyles: {
          0: { cellWidth: 40, fontStyle: "bold", textColor: [P1, P2, P3] as any },
          1: { cellWidth: usableW - 40 },
        },
        margin: { left: margin, right: margin },
        tableLineColor: REPORT.border as any,
        tableLineWidth: 0.3,
      });
      y = (doc as any).lastAutoTable.finalY + 10;

      // Signature label
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(P1, P2, P3);
      doc.text("Electronic Signature", margin, y);
      y += 4;

      // Centered signature box
      const sigW = usableW * 0.65;
      const sigH = 46;
      const sigX = margin + (usableW - sigW) / 2;

      doc.setDrawColor(A1, A2, A3);
      doc.setLineWidth(0.5);
      doc.setFillColor(...REPORT.light);
      doc.rect(sigX, y, sigW, sigH, "FD");

      if (signatureBase64) {
        try {
          doc.addImage(signatureBase64, "PNG", sigX + 3, y + 3, sigW - 6, sigH - 6);
        } catch {
          doc.setFont("helvetica", "italic");
          doc.setFontSize(9);
          doc.setTextColor(M1, M2, M3);
          doc.text("Signature on file", sigX + sigW / 2, y + sigH / 2, { align: "center" });
        }
      } else {
        doc.setFont("helvetica", "italic");
        doc.setFontSize(9);
        doc.setTextColor(M1, M2, M3);
        doc.text("Signature on file", sigX + sigW / 2, y + sigH / 2, { align: "center" });
      }

      y += sigH + 3;

      // Name / date under signature line
      doc.setDrawColor(...REPORT.border);
      doc.setLineWidth(0.3);
      doc.line(sigX, y, sigX + sigW, y);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(M1, M2, M3);
      doc.text(vendorName, sigX + sigW / 2, y + 4.5, { align: "center" });
      doc.text(formattedSignedDate, sigX + sigW / 2, y + 9, { align: "center" });
      y += 18;

      // Document checklist
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(P1, P2, P3);
      doc.text("Document Checklist", margin, y);
      y += 4;

      const checklistDocs: [string, boolean][] = [
        ["Electronic Signature", !!vendor.signature_url],
        ["General Liability Insurance Certificate", !!vendor.general_liability_url],
        ["W-9 Form", !!vendor.w9_url],
        ["Workers\u2019 Compensation Certificate", !!vendor.workers_comp_url],
      ];

      // FIX 1 — plain ASCII status strings (no Unicode glyphs that garble in Helvetica)
      // Colors applied via didParseCell: #166534 (22,101,52) submitted, #991B1B (153,27,27) missing
      autoTable(doc, {
        startY: y,
        head: [["Document", "Status"]],
        body: checklistDocs.map(([name, sub]) => [name, sub ? "Submitted" : "Not Submitted"]),
        theme: "striped",
        headStyles: { fillColor: [P1, P2, P3] as any, textColor: [255, 255, 255] as any, fontSize: 9, fontStyle: "bold" },
        bodyStyles: { fontSize: 9, textColor: [B1, B2, B3] as any },
        alternateRowStyles: { fillColor: REPORT.light as any },
        columnStyles: {
          0: { cellWidth: usableW * 0.72 },
          1: { cellWidth: usableW * 0.28, halign: "center" },
        },
        didParseCell: (data: any) => {
          if (data.section === "body" && data.column.index === 1) {
            const sub = checklistDocs[data.row.index]?.[1] ?? false;
            data.cell.styles.textColor = sub ? REPORT.darkGreen : [153, 27, 27];
            data.cell.styles.fontStyle = "bold";
          }
        },
        margin: { left: margin, right: margin },
      });

      y = (doc as any).lastAutoTable.finalY + 10;

      // Contact footer note
      const contactText = `This document was generated by Groves Property Services Vendor Management System on ${today}. For questions contact abondsjr@grovesps.com`;
      const contactLines = doc.splitTextToSize(contactText, usableW);
      doc.setFont("helvetica", "italic");
      doc.setFontSize(8);
      doc.setTextColor(M1, M2, M3);
      doc.text(contactLines, pageW / 2, y, { align: "center" });

      // ── Footers on all pages ──
      const totalPages = doc.getNumberOfPages();
      for (let p = 1; p <= totalPages; p++) {
        doc.setPage(p);
        drawFooter(p, totalPages, vendorName);
      }

      // ── Save ──
      const nameParts = vendorName.trim().split(/\s+/);
      const lastName = nameParts.length > 1 ? nameParts[nameParts.length - 1] : nameParts[0];
      const firstName = nameParts.length > 1 ? nameParts.slice(0, -1).join("_") : "";
      const safeLast = lastName.replace(/[^a-zA-Z0-9]/g, "_");
      const safeFirst = firstName.replace(/[^a-zA-Z0-9]/g, "_");
      const fileParts = [safeLast, safeFirst].filter(Boolean);
      doc.save(`${fileParts.join("_")}_ICA_${genDate}.pdf`);

    } finally {
      setGeneratingReport(null);
    }
  };

  const statusColors = STATUS_STYLES;

  if (loading) return <div style={{ padding: 40, textAlign: "center", fontFamily: sansFont, color: BRAND.muted }}>Loading submissions...</div>;

  return (
    <div style={{ ...shellStyles.page, fontFamily: sansFont }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Source+Serif+4:wght@400;600;700&display=swap" rel="stylesheet" />

      <div style={{ background: BRAND.headerGradient, padding: "22px 24px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <BrandMark size={50} tone="dark" />
          <div>
            <div style={{ color: "white", fontSize: 12, fontWeight: 700, letterSpacing: 1.8, textTransform: "uppercase", marginBottom: 5 }}>Groves Property Services</div>
            <div style={{ color: "white", fontSize: 26, fontWeight: 700, fontFamily: font }}>Vendor Management</div>
            <div style={{ color: "rgba(255,255,255,0.75)", fontSize: 13, marginTop: 4 }}>Review onboarding submissions and export agreement reports.</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <span style={{ background: "rgba(255,255,255,0.14)", color: "white", padding: "6px 12px", borderRadius: 999, fontSize: 12, fontWeight: 700 }}>
            {submissions.length} vendors
          </span>
          <button onClick={onLogout} className="gps-secondary-btn" style={{ fontSize: 13, color: BRAND.white, background: "rgba(255,255,255,0.12)", borderColor: "rgba(255,255,255,0.16)", padding: "8px 12px" }}>
            Sign Out
          </button>
        </div>
      </div>

      <div style={shellStyles.shell}>
        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12, marginBottom: 24 }}>
          {["pending", "approved", "rejected"].map((s) => (
            <div key={s} style={{ ...shellStyles.card, padding: "16px 18px", borderRadius: 18, boxShadow: BRAND.shadowSm }}>
              <div style={{ fontSize: 24, fontWeight: 700, color: statusColors[s]?.text || BRAND.text }}>{submissions.filter((v) => v.status === s).length}</div>
              <div style={{ fontSize: 12, color: BRAND.muted, textTransform: "capitalize", fontWeight: 700 }}>{s}</div>
            </div>
          ))}
        </div>

        {/* Detail panel */}
        {selected && (
          <div style={{ background: "white", borderRadius: 12, border: "2px solid #2d7a2d", padding: 24, marginBottom: 20, position: "relative" }}>
            <button onClick={() => setSelected(null)} style={{ position: "absolute", top: 12, right: 16, background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "#8a9f86" }}>×</button>
            <h3 style={{ fontFamily: font, fontSize: 20, color: "#1a2e1a", margin: "0 0 16px" }}>{selected.vendor_name}</h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, fontSize: 14, color: "#3a5a3a", marginBottom: 16 }}>
              <div><span style={{ color: "#8a9f86" }}>Business:</span> {selected.business_name || "—"}</div>
              <div><span style={{ color: "#8a9f86" }}>Phone:</span> {selected.phone}</div>
              <div><span style={{ color: "#8a9f86" }}>Email:</span> {selected.email}</div>
              <div><span style={{ color: "#8a9f86" }}>Signed:</span> {new Date(selected.signed_date).toLocaleDateString()}</div>
              <div><span style={{ color: "#8a9f86" }}>Services:</span> {(selected.services || []).join(", ")}</div>
              {selected.other_service && <div><span style={{ color: "#8a9f86" }}>Other:</span> {selected.other_service}</div>}
            </div>

            {/* Document links */}
            <div style={{ fontSize: 13, fontWeight: 600, color: "#2d5a2d", marginBottom: 8 }}>Documents</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
              {selected.signature_url && (
                <button onClick={() => downloadDoc("signatures", selected.signature_url, `${selected.vendor_name}_Signature`, `${selected.id}_sig`)}
                  style={{ fontSize: 13, padding: "6px 14px", borderRadius: 6, border: "1px solid #c5d4c0", background: "#fafdf8", cursor: "pointer", color: "#2d5a2d", opacity: downloadingDoc === `${selected.id}_sig` ? 0.5 : 1 }}>
                  {downloadingDoc === `${selected.id}_sig` ? "⏳ Signature…" : "📝 Signature"}
                </button>
              )}
              {selected.general_liability_url && (
                <button onClick={() => downloadDoc("general-liability", selected.general_liability_url, `${selected.vendor_name}_GeneralLiability`, `${selected.id}_gl`)}
                  style={{ fontSize: 13, padding: "6px 14px", borderRadius: 6, border: "1px solid #c5d4c0", background: "#fafdf8", cursor: "pointer", color: "#2d5a2d", opacity: downloadingDoc === `${selected.id}_gl` ? 0.5 : 1 }}>
                  {downloadingDoc === `${selected.id}_gl` ? "⏳ General Liability…" : "🛡️ General Liability"}
                </button>
              )}
              {selected.w9_url && (
                <button onClick={() => downloadDoc("w9-documents", selected.w9_url, `${selected.vendor_name}_W9`, `${selected.id}_w9`)}
                  style={{ fontSize: 13, padding: "6px 14px", borderRadius: 6, border: "1px solid #c5d4c0", background: "#fafdf8", cursor: "pointer", color: "#2d5a2d", opacity: downloadingDoc === `${selected.id}_w9` ? 0.5 : 1 }}>
                  {downloadingDoc === `${selected.id}_w9` ? "⏳ W-9…" : "📋 W-9"}
                </button>
              )}
              {selected.workers_comp_url && (
                <button onClick={() => downloadDoc("workers-comp", selected.workers_comp_url, `${selected.vendor_name}_WorkersComp`, `${selected.id}_wc`)}
                  style={{ fontSize: 13, padding: "6px 14px", borderRadius: 6, border: "1px solid #c5d4c0", background: "#fafdf8", cursor: "pointer", color: "#2d5a2d", opacity: downloadingDoc === `${selected.id}_wc` ? 0.5 : 1 }}>
                  {downloadingDoc === `${selected.id}_wc` ? "⏳ Workers' Comp…" : "🏥 Workers' Comp"}
                </button>
              )}
            </div>

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
              {["approved", "rejected"].map((s) => (
                <button key={s} onClick={() => updateStatus(selected.id, s)}
                  style={{
                    padding: "8px 18px", fontSize: 13, fontWeight: 600, borderRadius: 8, cursor: "pointer",
                    border: selected.status === s ? "2px solid " + (statusColors[s]?.text || "#333") : "1px solid #dce8d8",
                    background: selected.status === s ? statusColors[s]?.bg : "white",
                    color: statusColors[s]?.text || "#333", textTransform: "capitalize",
                  }}>
                  {s === selected.status ? `✓ ${s}` : s}
                </button>
              ))}
              <button
                onClick={() => generateReport(selected)}
                disabled={generatingReport === `${selected.id}_report`}
                style={{
                  padding: "8px 18px", fontSize: 13, fontWeight: 600, borderRadius: 8, cursor: "pointer",
                  border: "1px solid #b8c4b4",
                  background: "white",
                  color: "#4a5e48",
                  opacity: generatingReport === `${selected.id}_report` ? 0.55 : 1,
                  marginLeft: "auto",
                }}>
                {generatingReport === `${selected.id}_report` ? "⏳ Generating…" : "📄 Generate Report"}
              </button>
            </div>
          </div>
        )}

        {/* Table */}
        <div style={{ background: "white", borderRadius: 12, border: "1px solid #e8f0e4", overflow: "hidden" }}>
          {submissions.map((v, i) => (
            <div key={v.id} onClick={() => setSelected(v)}
              style={{
                display: "grid", gridTemplateColumns: "1fr 1fr auto auto", gap: 12, alignItems: "center",
                padding: "14px 18px", cursor: "pointer", borderBottom: i < submissions.length - 1 ? "1px solid #f0f5ee" : "none",
                background: selected?.id === v.id ? "#f1f8e9" : "transparent",
                transition: "background 0.15s",
              }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 14, color: "#1a2e1a" }}>{v.vendor_name}</div>
                <div style={{ fontSize: 12, color: "#8a9f86" }}>{v.business_name || v.email}</div>
              </div>
              <div style={{ fontSize: 13, color: "#6b8068" }}>{(v.services || []).slice(0, 2).join(", ")}{(v.services || []).length > 2 ? ` +${v.services.length - 2}` : ""}</div>
              <div style={{ display: "flex", gap: 4 }}>
                {v.general_liability_url && (
                  <button
                    title="Download GL Policy"
                    onClick={(e) => { e.stopPropagation(); downloadDoc("general-liability", v.general_liability_url, `${v.vendor_name}_GeneralLiability`, `${v.id}_gl`); }}
                    style={{ fontSize: 14, background: "none", border: "none", cursor: "pointer", padding: 2, opacity: downloadingDoc === `${v.id}_gl` ? 0.4 : 1 }}
                  >{downloadingDoc === `${v.id}_gl` ? "⏳" : "🛡️"}</button>
                )}
                {v.w9_url && (
                  <button
                    title="Download W-9"
                    onClick={(e) => { e.stopPropagation(); downloadDoc("w9-documents", v.w9_url, `${v.vendor_name}_W9`, `${v.id}_w9`); }}
                    style={{ fontSize: 14, background: "none", border: "none", cursor: "pointer", padding: 2, opacity: downloadingDoc === `${v.id}_w9` ? 0.4 : 1 }}
                  >{downloadingDoc === `${v.id}_w9` ? "⏳" : "📋"}</button>
                )}
                {v.workers_comp_url && (
                  <button
                    title="Download Workers Comp"
                    onClick={(e) => { e.stopPropagation(); downloadDoc("workers-comp", v.workers_comp_url, `${v.vendor_name}_WorkersComp`, `${v.id}_wc`); }}
                    style={{ fontSize: 14, background: "none", border: "none", cursor: "pointer", padding: 2, opacity: downloadingDoc === `${v.id}_wc` ? 0.4 : 1 }}
                  >{downloadingDoc === `${v.id}_wc` ? "⏳" : "🏥"}</button>
                )}
              </div>
              <span style={{
                fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5,
                padding: "4px 10px", borderRadius: 6,
                background: statusColors[v.status]?.bg || "#f0f0f0",
                color: statusColors[v.status]?.text || "#666",
              }}>
                {v.status}
              </span>
            </div>
          ))}
          {submissions.length === 0 && (
            <div style={{ padding: 40, textAlign: "center", color: "#8a9f86", fontSize: 14 }}>No vendor submissions yet.</div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Set Password ──
function SetPassword({ onSuccess }: { onSuccess: () => void }) {
  const font = `'Source Serif 4', 'Georgia', serif`;
  const sansFont = `'DM Sans', 'Segoe UI', sans-serif`;

  // Parse hash params (Supabase puts token info in the URL hash)
  const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  const isExpired = hashParams.get("error_code") === "otp_expired";
  const errorDesc = hashParams.get("error_description") ?? "Your password reset link has expired.";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetSent, setResetSent] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState("");

  const handleSubmit = async () => {
    setError("");
    if (!password) { setError("Please enter a new password."); return; }
    if (password.length < 8) { setError("Password must be at least 8 characters."); return; }
    if (password !== confirm) { setError("Passwords do not match."); return; }
    setLoading(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (updateError) { setError(updateError.message); return; }
    setSuccess(true);
    setTimeout(() => {
      window.location.hash = "#admin";
      onSuccess();
    }, 1800);
  };

  const handleRequestLink = async () => {
    setResetError("");
    if (!resetEmail.trim()) { setResetError("Please enter your email address."); return; }
    setResetLoading(true);
    const { error: resetErr } = await supabase.auth.resetPasswordForEmail(resetEmail, {
      redirectTo: `${window.location.origin}${window.location.pathname}`,
    });
    setResetLoading(false);
    if (resetErr) { setResetError(resetErr.message); return; }
    setResetSent(true);
  };

  const card: React.CSSProperties = {
    width: "100%",
    maxWidth: 420,
    padding: 34,
    background: BRAND.panelGradient,
    borderRadius: 22,
    border: `1px solid ${BRAND.border}`,
    boxShadow: BRAND.shadowLg,
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "13px 14px",
    fontSize: 15,
    border: `1px solid ${BRAND.border}`,
    borderRadius: 12,
    outline: "none",
    background: BRAND.white,
    boxSizing: "border-box",
    color: BRAND.text,
  };

  const btnStyle = (disabled: boolean): React.CSSProperties => ({
    padding: "12px 14px",
    fontSize: 15,
    fontWeight: 700,
    color: "white",
    border: "none",
    borderRadius: 12,
    cursor: disabled ? "default" : "pointer",
    opacity: disabled ? 0.7 : 1,
    width: "100%",
  });

  const wrap: React.CSSProperties = {
    minHeight: "100vh",
    background: BRAND.pageGradient,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: sansFont,
    padding: "24px",
  };

  const logo = (
    <div style={{ textAlign: "center", marginBottom: 28 }}>
      <div style={{ display: "flex", justifyContent: "center", marginBottom: 14 }}>
        <BrandMark size={56} tone="light" />
      </div>
      <div style={{ fontSize: 12, color: BRAND.primaryBlue, letterSpacing: 1.8, textTransform: "uppercase", fontWeight: 700, marginBottom: 8 }}>
        Groves Property Services
      </div>
      <div style={{ fontFamily: font, fontSize: 24, fontWeight: 700, color: BRAND.text }}>Set New Password</div>
      <div style={{ fontSize: 13, color: BRAND.muted, marginTop: 6 }}>Secure access for vendor management</div>
    </div>
  );

  if (isExpired) {
    return (
      <div style={wrap}>
        <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Source+Serif+4:wght@400;600;700&display=swap" rel="stylesheet" />
        <div style={card}>
          {logo}
          <div style={{ background: BRAND.dangerBg, border: `1px solid ${BRAND.dangerBorder}`, borderRadius: 12, padding: "14px 16px", marginBottom: 20, color: BRAND.danger, fontSize: 14 }}>
            {decodeURIComponent(errorDesc.replace(/\+/g, " "))}
          </div>
          {resetSent ? (
            <div style={{ color: BRAND.darkGreen, fontSize: 14, textAlign: "center", fontWeight: 600 }}>
              Check your inbox. A new link is on its way.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <input
                placeholder="Your email address"
                type="email"
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                className="gps-input"
                style={inputStyle}
              />
              {resetError && <div style={{ color: BRAND.danger, fontSize: 13 }}>{resetError}</div>}
              <button onClick={handleRequestLink} disabled={resetLoading} className="gps-primary-btn" style={btnStyle(resetLoading)}>
                {resetLoading ? "Sending..." : "Request New Link"}
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div style={wrap}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Source+Serif+4:wght@400;600;700&display=swap" rel="stylesheet" />
      <div style={card}>
        {logo}
        {success ? (
          <div style={{ color: BRAND.darkGreen, fontWeight: 700, textAlign: "center", fontSize: 15 }}>
            Password updated! Redirecting...
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <input
              placeholder="New Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="gps-input"
              style={inputStyle}
            />
            <input
              placeholder="Confirm Password"
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              className="gps-input"
              style={inputStyle}
            />
            {error && <div style={{ color: BRAND.danger, fontSize: 13 }}>{error}</div>}
            <button onClick={handleSubmit} disabled={loading} className="gps-primary-btn" style={btnStyle(loading)}>
              {loading ? "Updating..." : "Set Password"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Admin Login ──
function AdminLogin({ onLogin, onReturn }: { onLogin: () => void; onReturn: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const font = `'Source Serif 4', 'Georgia', serif`;
  const sansFont = `'DM Sans', 'Segoe UI', sans-serif`;

  const handleLogin = async () => {
    const normalizedEmail = normalizeEmail(email);
    setLoading(true);
    setError("");
    if (!isAllowedAdminEmail(normalizedEmail)) {
      setError("Access denied. Admin role required.");
      setLoading(false);
      return;
    }

    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    });
    if (authError) { setError(authError.message); setLoading(false); return; }

    if (!isAllowedAdminEmail(authData.user?.email ?? "")) {
      await supabase.auth.signOut();
      setError("Access denied. Admin role required.");
      setLoading(false);
      return;
    }

    const { data } = await supabase.rpc("get_user_role");
    if (!data || !["super_admin", "admin"].includes(data)) {
      await supabase.auth.signOut();
      setError("Access denied. Admin role required.");
      setLoading(false);
      return;
    }
    onLogin();
    setLoading(false);
  };

  return (
    <div style={{ minHeight: "100vh", background: BRAND.pageGradient, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: sansFont, padding: "24px" }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Source+Serif+4:wght@400;600;700&display=swap" rel="stylesheet" />
      <div style={{ width: "100%", maxWidth: 420, padding: 34, background: BRAND.panelGradient, borderRadius: 22, border: `1px solid ${BRAND.border}`, boxShadow: BRAND.shadowLg }}>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 14 }}>
            <BrandMark size={56} tone="light" />
          </div>
          <div style={{ fontSize: 12, color: BRAND.primaryBlue, letterSpacing: 1.8, textTransform: "uppercase", fontWeight: 700, marginBottom: 8 }}>Groves Property Services</div>
          <div style={{ fontFamily: font, fontSize: 24, fontWeight: 700, color: BRAND.text }}>Admin Access</div>
          <div style={{ fontSize: 13, color: BRAND.muted, marginTop: 6 }}>Review vendor onboarding submissions</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <input placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)}
            className="gps-input"
            style={{ width: "100%", padding: "13px 14px", fontSize: 15, border: `1px solid ${BRAND.border}`, borderRadius: 12, outline: "none", background: BRAND.white, boxSizing: "border-box", color: BRAND.text }} />
          <input placeholder="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleLogin()}
            className="gps-input"
            style={{ width: "100%", padding: "13px 14px", fontSize: 15, border: `1px solid ${BRAND.border}`, borderRadius: 12, outline: "none", background: BRAND.white, boxSizing: "border-box", color: BRAND.text }} />
          {error && <div style={{ color: BRAND.danger, fontSize: 13 }}>{error}</div>}
          <button onClick={handleLogin} disabled={loading} className="gps-primary-btn"
            style={{ padding: "12px 14px", fontSize: 15, fontWeight: 700, color: "white", border: "none", borderRadius: 12, cursor: "pointer", opacity: loading ? 0.7 : 1 }}>
            {loading ? "Signing in..." : "Sign In"}
          </button>
          <button
            type="button"
            onClick={onReturn}
            className="gps-secondary-btn"
            style={{
              padding: "12px 14px",
              fontSize: 15,
              fontWeight: 700,
              borderRadius: 12,
              color: BRAND.darkBlue,
              background: "linear-gradient(180deg, rgba(234, 241, 251, 0.96) 0%, rgba(239, 246, 223, 0.92) 100%)",
              border: `1px solid ${BRAND.subtleBlueBorder}`,
            }}
          >
            Return to Main Screen
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main App ──
export default function GPSVendorICA() {
  const [view, setView] = useState<"form" | "admin-login" | "admin" | "set-password">("form");
  const [step, setStep] = useState(0);
  const [vendor, setVendor] = useState({ name: "", business: "", phone: "", email: "" });
  const [services, setServices] = useState<string[]>([]);
  const [otherService, setOtherService] = useState("");
  const [documents, setDocuments] = useState<Record<string, File | null>>({ generalLiability: null, w9: null, workersComp: null });
  const [agreedSections, setAgreedSections] = useState<Set<number>>(new Set());
  const [expandedSection, setExpandedSection] = useState<number | null>(null);
  const [signDate, setSignDate] = useState(new Date().toISOString().split("T")[0]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const sigRef = useRef<any>(null);
  const topRef = useRef<HTMLDivElement>(null);

  const font = `'Source Serif 4', 'Georgia', serif`;
  const sansFont = `'DM Sans', 'Segoe UI', sans-serif`;

  useEffect(() => { topRef.current?.scrollIntoView({ behavior: "smooth" }); }, [step]);

  // Check for admin route and password-reset routes
  useEffect(() => {
    const hash = window.location.hash;
    const params = new URLSearchParams(hash.replace(/^#/, ""));
    if (params.get("type") === "recovery" || params.get("error_code") === "otp_expired") {
      setView("set-password");
    } else if (hash === "#admin") {
      setView("admin-login");
    } else {
      // Also show set-password if there's already an active session (user navigated here directly)
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session && hash === "#set-password") setView("set-password");
      });
    }
  }, []);

  const toggleService = (id: string) => setServices((prev) => prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]);
  const toggleAgreed = (num: number) => setAgreedSections((prev) => { const next = new Set(prev); next.has(num) ? next.delete(num) : next.add(num); return next; });

  const validateStep = () => {
    const e: Record<string, string> = {};
    if (step === 0) {
      if (!vendor.name.trim()) e.name = "Required";
      if (!vendor.phone.trim()) e.phone = "Required";
      if (!vendor.email.trim()) e.email = "Required";
      else if (!/\S+@\S+\.\S+/.test(vendor.email)) e.email = "Invalid email";
    }
    if (step === 1) {
      if (services.length === 0 && !otherService.trim()) e.services = "Select at least one service";
    }
    if (step === 2) {
      DOC_TYPES.forEach((d) => { if (d.required && !documents[d.key]) e[d.key] = `${d.label} is required`; });
    }
    if (step === 3) {
      if (agreedSections.size < AGREEMENT_SECTIONS.length) e.agreement = `Review and acknowledge all ${AGREEMENT_SECTIONS.length} sections`;
    }
    if (step === 4) {
      if (!sigRef.current?.hasDrawn) e.signature = "Signature required";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const uploadFile = async (bucket: string, file: File, prefix: string): Promise<string | null> => {
    const ext = file.name.split(".").pop();
    const path = `${prefix}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from(bucket).upload(path, file);
    if (error) { console.error("Upload error:", bucket, error); return null; }
    return path;
  };

  const handleSubmit = async () => {
    if (!validateStep()) return;
    setSubmitting(true);
    setSubmitError("");

    try {
      // Upload signature
      const canvas = sigRef.current?.canvas;
      let signatureUrl: string | null = null;
      if (canvas) {
        const blob = await new Promise<Blob>((res) => canvas.toBlob((b: Blob) => res(b), "image/png"));
        signatureUrl = await uploadFile("signatures", new File([blob], "signature.png"), vendor.email.replace(/[^a-zA-Z0-9]/g, "_"));
      }

      // Upload documents
      const prefix = vendor.email.replace(/[^a-zA-Z0-9]/g, "_");
      const glUrl = documents.generalLiability ? await uploadFile("general-liability", documents.generalLiability, prefix) : null;
      const w9Url = documents.w9 ? await uploadFile("w9-documents", documents.w9, prefix) : null;
      const wcUrl = documents.workersComp ? await uploadFile("workers-comp", documents.workersComp, prefix) : null;

      // Insert submission
      const { error: insertError } = await supabase.from("vendor_submissions").insert({
        vendor_name: vendor.name.trim(),
        business_name: vendor.business.trim() || null,
        phone: vendor.phone.trim(),
        email: vendor.email.trim(),
        services,
        other_service: otherService.trim() || null,
        sections_acknowledged: agreedSections.size,
        all_sections_agreed: agreedSections.size === AGREEMENT_SECTIONS.length,
        signature_url: signatureUrl,
        signed_date: signDate,
        general_liability_url: glUrl,
        w9_url: w9Url,
        workers_comp_url: wcUrl,
      });

      if (insertError) throw insertError;
      setStep(5); // complete
    } catch (err: any) {
      setSubmitError(err.message || "Submission failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const next = () => {
    if (validateStep()) {
      if (step === 4) handleSubmit();
      else setStep((s) => s + 1);
    }
  };
  const back = () => setStep((s) => Math.max(0, s - 1));

  const allAgreed = agreedSections.size === AGREEMENT_SECTIONS.length;
  const totalSteps = STEPS.length - 1;
  const progress = Math.round(((step + (step >= totalSteps ? 1 : 0)) / totalSteps) * 100);

  const inputStyle = (field: string) => ({
    width: "100%",
    padding: "13px 14px",
    fontSize: 15,
    fontFamily: sansFont,
    border: `1px solid ${errors[field] ? BRAND.dangerBorder : BRAND.border}`,
    borderRadius: 12,
    outline: "none",
    background: BRAND.white,
    color: BRAND.text,
    boxSizing: "border-box" as const,
    transition: "border-color 0.2s, box-shadow 0.2s",
  });

  const stepCardStyle: React.CSSProperties = {
    ...shellStyles.card,
    padding: 28,
  };

  const stepTitleStyle: React.CSSProperties = {
    fontFamily: font,
    fontSize: 28,
    color: BRAND.text,
    margin: "0 0 6px",
    fontWeight: 700,
  };

  const stepSubtitleStyle: React.CSSProperties = {
    color: BRAND.muted,
    fontSize: 14,
    margin: "0 0 28px",
    lineHeight: 1.6,
  };

  const labelStyle: React.CSSProperties = {
    display: "block",
    fontSize: 13,
    fontWeight: 700,
    color: BRAND.text,
    marginBottom: 8,
    letterSpacing: 0.1,
  };

  const helperStyle: React.CSSProperties = {
    fontWeight: 500,
    color: BRAND.muted,
  };

  // ── Admin views ──
  if (view === "set-password") return <SetPassword onSuccess={() => setView("admin-login")} />;
  if (view === "admin-login") {
    return (
      <AdminLogin
        onLogin={() => setView("admin")}
        onReturn={() => {
          window.location.hash = "";
          setView("form");
        }}
      />
    );
  }
  if (view === "admin") return <AdminDashboard onLogout={async () => { await supabase.auth.signOut(); setView("admin-login"); }} />;

  // ── Vendor form ──
  return (
    <div style={{ ...shellStyles.page, fontFamily: sansFont }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Source+Serif+4:wght@400;600;700&display=swap" rel="stylesheet" />
      <div ref={topRef} />

      {/* Header */}
      <div style={{ background: BRAND.headerGradient, padding: "30px 24px 26px", position: "relative", overflow: "hidden", borderBottom: "1px solid rgba(255,255,255,0.14)" }}>
        <div style={{ position: "absolute", top: -38, right: -42, width: 168, height: 168, borderRadius: "50%", background: "rgba(255,255,255,0.06)" }} />
        <div style={{ position: "absolute", bottom: -54, left: -36, width: 180, height: 180, borderRadius: "50%", background: "rgba(255,255,255,0.04)" }} />
        <div style={{ maxWidth: 720, margin: "0 auto", position: "relative" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16, justifyContent: "space-between", flexWrap: "wrap" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <BrandMark size={52} tone="dark" />
              <div>
                <div style={{ color: "white", fontSize: 12, fontWeight: 700, letterSpacing: 1.8, textTransform: "uppercase", marginBottom: 6 }}>Groves Property Services</div>
                <div style={{ color: "white", fontSize: 26, fontWeight: 700, fontFamily: font, letterSpacing: 0.3 }}>Vendor Onboarding</div>
                <div style={{ color: "rgba(255,255,255,0.78)", fontSize: 13, marginTop: 4, lineHeight: 1.5 }}>
                  Complete your contractor setup, document upload, and agreement acknowledgment
                </div>
              </div>
            </div>
            <button
              onClick={() => setView("admin-login")}
              className="gps-secondary-btn"
              style={{ fontSize: 12, color: BRAND.white, background: "rgba(255,255,255,0.12)", borderColor: "rgba(255,255,255,0.16)", padding: "9px 14px" }}
            >
              Admin
            </button>
          </div>
        </div>
      </div>

      {/* Progress */}
      {step < 5 && (
        <div style={{ maxWidth: 720, margin: "0 auto", padding: "22px 24px 0" }}>
          <div style={{ ...shellStyles.card, padding: "18px 18px 16px", borderRadius: 18 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, gap: 12, flexWrap: "wrap" }}>
              <span style={{ fontSize: 13, color: BRAND.muted, fontWeight: 700, letterSpacing: 0.2 }}>Step {step + 1} of {totalSteps}: {STEPS[step].label}</span>
              <span style={{ fontSize: 13, color: BRAND.darkGreen, fontWeight: 700 }}>{progress}% complete</span>
            </div>
            <div style={{ height: 8, background: "#DFE8F4", borderRadius: 999, overflow: "hidden", marginBottom: 14 }}>
              <div style={{ height: "100%", width: `${progress}%`, background: "linear-gradient(90deg, #2558A4 0%, #1A3F7C 55%, #79B61D 100%)", borderRadius: 999, transition: "width 0.5s ease" }} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(5, minmax(0, 1fr))", gap: 8 }} className="gps-mobile-stack">
              {STEPS.slice(0, totalSteps).map((item, index) => {
                const isCurrent = index === step;
                const isComplete = index < step;
                return (
                  <div
                    key={item.id}
                    style={{
                      padding: "10px 12px",
                      borderRadius: 14,
                      border: `1px solid ${isCurrent ? BRAND.subtleBlueBorder : isComplete ? BRAND.subtleGreenBorder : BRAND.border}`,
                      background: isCurrent ? BRAND.subtleBlue : isComplete ? BRAND.subtleGreen : "rgba(255,255,255,0.82)",
                      color: isCurrent ? BRAND.darkBlue : isComplete ? BRAND.darkGreen : BRAND.muted,
                      minHeight: 56,
                    }}
                  >
                    <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.2, textTransform: "uppercase", marginBottom: 4 }}>
                      {isComplete ? "Done" : `Step ${index + 1}`}
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 700, lineHeight: 1.35 }}>{item.label}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Body */}
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "20px 24px 104px" }}>

        {/* Step 0: Vendor Info */}
        {step === 0 && (
          <div style={{ ...stepCardStyle, animation: "fadeIn 0.3s ease" }}>
            <h2 style={stepTitleStyle}>Vendor Information</h2>
            <p style={stepSubtitleStyle}>Tell us about yourself or your business. Fields marked with * are required.</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
              <div>
                <label style={labelStyle}>Full Name *</label>
                <input className="gps-input" style={inputStyle("name")} placeholder="Your full legal name" value={vendor.name} onChange={(e) => setVendor({ ...vendor, name: e.target.value })} />
                {errors.name && <span style={{ color: BRAND.danger, fontSize: 12, marginTop: 6, display: "block" }}>{errors.name}</span>}
              </div>
              <div>
                <label style={labelStyle}>Business Name <span style={helperStyle}>(if applicable)</span></label>
                <input className="gps-input" style={inputStyle("business")} placeholder="Your registered business name" value={vendor.business} onChange={(e) => setVendor({ ...vendor, business: e.target.value })} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }} className="gps-mobile-stack">
                <div>
                  <label style={labelStyle}>Phone *</label>
                  <input className="gps-input" style={inputStyle("phone")} placeholder="(xxx) xxx-xxxx" value={vendor.phone} onChange={(e) => setVendor({ ...vendor, phone: e.target.value })} />
                  {errors.phone && <span style={{ color: BRAND.danger, fontSize: 12, marginTop: 6, display: "block" }}>{errors.phone}</span>}
                </div>
                <div>
                  <label style={labelStyle}>Email *</label>
                  <input className="gps-input" style={inputStyle("email")} type="email" placeholder="you@email.com" value={vendor.email} onChange={(e) => setVendor({ ...vendor, email: e.target.value })} />
                  {errors.email && <span style={{ color: BRAND.danger, fontSize: 12, marginTop: 6, display: "block" }}>{errors.email}</span>}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 1: Services */}
        {step === 1 && (
          <div style={{ ...stepCardStyle, animation: "fadeIn 0.3s ease" }}>
            <h2 style={stepTitleStyle}>Services to Be Performed</h2>
            <p style={stepSubtitleStyle}>Select all services you will provide under this agreement.</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {SERVICES.map((s) => {
                const active = services.includes(s.id);
                return (
                  <div key={s.id} onClick={() => toggleService(s.id)}
                    style={{ padding: "15px 16px", borderRadius: 16, cursor: "pointer", border: `1px solid ${active ? BRAND.subtleBlueBorder : BRAND.border}`, background: active ? "linear-gradient(135deg, #EAF1FB 0%, #F6FAFF 60%, #EFF6DF 100%)" : BRAND.white, transition: "all 0.2s", display: "flex", alignItems: "center", gap: 14, boxShadow: active ? BRAND.shadowSm : "none" }}>
                    <div style={{ width: 24, height: 24, borderRadius: 7, flexShrink: 0, border: `1px solid ${active ? BRAND.primaryBlue : BRAND.border}`, background: active ? BRAND.buttonGradient : "transparent", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s", color: "white", fontSize: 14, fontWeight: 700 }}>
                      {active && "✓"}
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, color: BRAND.text, fontSize: 15 }}>{s.label}</div>
                      <div style={{ fontSize: 13, color: BRAND.muted, marginTop: 3 }}>{s.desc}</div>
                    </div>
                  </div>
                );
              })}
              <div style={{ marginTop: 6 }}>
                <label style={labelStyle}>Other Services</label>
                <input className="gps-input" style={inputStyle("other")} placeholder="Describe any additional services..." value={otherService} onChange={(e) => setOtherService(e.target.value)} />
              </div>
            </div>
            {errors.services && <div style={{ color: BRAND.danger, fontSize: 13, marginTop: 14 }}>{errors.services}</div>}
          </div>
        )}

        {/* Step 2: Documents */}
        {step === 2 && (
          <div style={{ ...stepCardStyle, animation: "fadeIn 0.3s ease" }}>
            <h2 style={stepTitleStyle}>Vendor Documents</h2>
            <p style={stepSubtitleStyle}>Upload required documentation. Accepted formats: PDF, JPG, PNG.</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {DOC_TYPES.map((d) => (
                <FileUploadCard key={d.key} doc={d} file={documents[d.key]} error={errors[d.key]}
                  onFileChange={(f) => setDocuments((prev) => ({ ...prev, [d.key]: f }))} />
              ))}
            </div>
          </div>
        )}

        {/* Step 3: Agreement */}
        {step === 3 && (
          <div style={{ ...stepCardStyle, animation: "fadeIn 0.3s ease" }}>
            <h2 style={stepTitleStyle}>Independent Contractor Agreement</h2>
            <p style={{ ...stepSubtitleStyle, marginBottom: 14 }}>Review each section and confirm you understand the terms.</p>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20, padding: "10px 12px", background: allAgreed ? BRAND.subtleGreen : BRAND.subtleBlue, border: `1px solid ${allAgreed ? BRAND.subtleGreenBorder : BRAND.subtleBlueBorder}`, borderRadius: 12, fontSize: 13, fontWeight: 700, color: allAgreed ? BRAND.darkGreen : BRAND.darkBlue }}>
              {agreedSections.size} / {AGREEMENT_SECTIONS.length} sections acknowledged
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {AGREEMENT_SECTIONS.map((s) => {
                const agreed = agreedSections.has(s.num);
                const expanded = expandedSection === s.num;
                return (
                  <div key={s.num} style={{ border: `1px solid ${agreed ? BRAND.subtleGreenBorder : BRAND.border}`, borderRadius: 16, overflow: "hidden", transition: "border-color 0.2s", background: BRAND.white, boxShadow: agreed ? BRAND.shadowSm : "none" }}>
                    <div onClick={() => setExpandedSection(expanded ? null : s.num)}
                      style={{ display: "flex", alignItems: "center", gap: 12, padding: "13px 15px", cursor: "pointer", background: agreed ? "linear-gradient(135deg, #F7FBF0 0%, #FFFFFF 100%)" : BRAND.surfaceTint }}>
                      <div style={{ width: 30, height: 30, borderRadius: "50%", flexShrink: 0, background: agreed ? BRAND.buttonGradient : BRAND.subtleBlue, color: agreed ? "white" : BRAND.darkBlue, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700 }}>
                        {agreed ? "✓" : s.num}
                      </div>
                      <div style={{ flex: 1, fontWeight: 700, fontSize: 14, color: BRAND.text }}>{s.title}</div>
                      <span style={{ fontSize: 18, color: BRAND.muted, transform: expanded ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}>▾</span>
                    </div>
                    {expanded && (
                      <div style={{ padding: "0 15px 15px" }}>
                        <p style={{ fontSize: 13.5, lineHeight: 1.72, color: BRAND.text, margin: "10px 0 14px", fontFamily: font }}>{s.text}</p>
                        <div onClick={() => toggleAgreed(s.num)}
                          style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", padding: "10px 12px", borderRadius: 12, background: agreed ? BRAND.subtleGreen : "#F8FAFD", border: `1px solid ${agreed ? BRAND.subtleGreenBorder : BRAND.border}` }}>
                          <div style={{ width: 20, height: 20, borderRadius: 5, border: `1px solid ${agreed ? BRAND.darkGreen : BRAND.border}`, background: agreed ? BRAND.buttonGradient : "transparent", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontSize: 12, fontWeight: 700 }}>
                            {agreed && "✓"}
                          </div>
                          <span style={{ fontSize: 13, fontWeight: 600, color: agreed ? BRAND.darkGreen : BRAND.muted }}>I have read and understand Section {s.num}</span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            {errors.agreement && <div style={{ color: BRAND.danger, fontSize: 13, marginTop: 14 }}>{errors.agreement}</div>}
            {!allAgreed && (
              <button onClick={() => setAgreedSections(new Set(AGREEMENT_SECTIONS.map(s => s.num)))}
                className="gps-secondary-btn"
                style={{ marginTop: 18, width: "100%", padding: "11px 14px", fontSize: 13, fontWeight: 700 }}>
                Acknowledge All Sections
              </button>
            )}
          </div>
        )}

        {/* Step 4: Signature */}
        {step === 4 && (
          <div style={{ ...stepCardStyle, animation: "fadeIn 0.3s ease" }}>
            <h2 style={stepTitleStyle}>Sign Agreement</h2>
            <p style={stepSubtitleStyle}>
              By signing below, you acknowledge you have read, understood, and agree to all terms of this Independent Contractor Agreement.
            </p>
            <div style={{ background: BRAND.surfaceTint, border: `1px solid ${BRAND.border}`, borderRadius: 18, padding: 20, marginBottom: 20 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: BRAND.darkBlue, marginBottom: 10, textTransform: "uppercase", letterSpacing: 1.1 }}>Summary</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, fontSize: 14, color: BRAND.text }} className="gps-mobile-stack">
                <div><span style={{ color: BRAND.muted }}>Name:</span> {vendor.name}</div>
                <div><span style={{ color: BRAND.muted }}>Phone:</span> {vendor.phone}</div>
                <div><span style={{ color: BRAND.muted }}>Email:</span> {vendor.email}</div>
                {vendor.business && <div><span style={{ color: BRAND.muted }}>Business:</span> {vendor.business}</div>}
              </div>
              <div style={{ marginTop: 10, fontSize: 13, color: BRAND.muted }}>
                Services: {services.map(id => SERVICES.find(s => s.id === id)?.label).filter(Boolean).join(", ")}{otherService ? (services.length > 0 ? ", " : "") + otherService : ""}
              </div>
              <div style={{ marginTop: 8, fontSize: 13, color: BRAND.darkBlue, display: "flex", gap: 8, flexWrap: "wrap" }}>
                {documents.generalLiability && <span style={{ background: BRAND.subtleBlue, border: `1px solid ${BRAND.subtleBlueBorder}`, padding: "6px 10px", borderRadius: 999 }}>GL Policy</span>}
                {documents.w9 && <span style={{ background: BRAND.subtleBlue, border: `1px solid ${BRAND.subtleBlueBorder}`, padding: "6px 10px", borderRadius: 999 }}>W-9</span>}
                {documents.workersComp && <span style={{ background: BRAND.subtleBlue, border: `1px solid ${BRAND.subtleBlueBorder}`, padding: "6px 10px", borderRadius: 999 }}>Workers' Comp</span>}
              </div>
            </div>
            <div style={{ marginBottom: 18 }}>
              <label style={labelStyle}>Date</label>
              <input className="gps-input" type="date" style={{ ...inputStyle("date"), maxWidth: 220 }} value={signDate} onChange={(e) => setSignDate(e.target.value)} />
            </div>
            <div>
              <label style={labelStyle}>Vendor Signature *</label>
              <SignaturePad sigRef={sigRef} onClear={() => setErrors({})} />
              {errors.signature && <div style={{ color: BRAND.danger, fontSize: 12, marginTop: 8 }}>{errors.signature}</div>}
            </div>
            {submitError && (
              <div style={{ marginTop: 14, padding: "10px 14px", background: BRAND.dangerBg, border: `1px solid ${BRAND.dangerBorder}`, borderRadius: 12, color: BRAND.danger, fontSize: 13 }}>{submitError}</div>
            )}
          </div>
        )}

        {/* Step 5: Complete */}
        {step === 5 && (
          <div style={{ ...stepCardStyle, textAlign: "center", animation: "fadeIn 0.4s ease", paddingTop: 34 }}>
            <div style={{ width: 76, height: 76, borderRadius: "50%", background: BRAND.buttonGradient, boxShadow: BRAND.shadowMd, margin: "0 auto 20px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 34, color: "white" }}>✓</div>
            <h2 style={{ fontFamily: font, fontSize: 30, color: BRAND.text, margin: "0 0 8px", fontWeight: 700 }}>Agreement Submitted</h2>
            <p style={{ color: BRAND.muted, fontSize: 15, lineHeight: 1.7, maxWidth: 420, margin: "0 auto 28px" }}>
              Thank you, {vendor.name}. Your Independent Contractor Agreement and documents have been submitted to Groves Property Services for review.
            </p>
            <div style={{ background: BRAND.surfaceTint, border: `1px solid ${BRAND.border}`, borderRadius: 18, padding: 22, textAlign: "left", maxWidth: 500, margin: "0 auto" }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: BRAND.darkBlue, marginBottom: 12, textTransform: "uppercase", letterSpacing: 1.1 }}>Confirmation Details</div>
              <div style={{ fontSize: 14, color: BRAND.text, lineHeight: 2 }}>
                <div><span style={{ color: BRAND.muted }}>Vendor:</span> {vendor.name}</div>
                {vendor.business && <div><span style={{ color: BRAND.muted }}>Business:</span> {vendor.business}</div>}
                <div><span style={{ color: BRAND.muted }}>Contact:</span> {vendor.phone} · {vendor.email}</div>
                <div><span style={{ color: BRAND.muted }}>Services:</span> {services.map(id => SERVICES.find(s => s.id === id)?.label).filter(Boolean).join(", ")}{otherService ? (services.length > 0 ? ", " : "") + otherService : ""}</div>
                <div><span style={{ color: BRAND.muted }}>Documents:</span> {[documents.generalLiability && "GL Policy", documents.w9 && "W-9", documents.workersComp && "Workers' Comp"].filter(Boolean).join(", ")}</div>
                <div><span style={{ color: BRAND.muted }}>Signed:</span> {new Date(signDate).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</div>
                <div><span style={{ color: BRAND.muted }}>Sections:</span> All 12 acknowledged</div>
              </div>
            </div>
            <div style={{ marginTop: 28, padding: "14px 20px", background: BRAND.subtleBlue, border: `1px solid ${BRAND.subtleBlueBorder}`, borderRadius: 14, fontSize: 13, color: BRAND.darkBlue, lineHeight: 1.6 }}>
              A Groves Property Services representative will follow up within 1–2 business days with next steps and your first work order details.
            </div>
          </div>
        )}
      </div>

      {/* Navigation */}
      {step < 5 && (
        <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: "rgba(255,255,255,0.92)", backdropFilter: "blur(14px)", borderTop: `1px solid ${BRAND.border}`, padding: "14px 24px" }}>
          <div style={{ maxWidth: 720, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
            {step > 0 ? (
              <button onClick={back} className="gps-secondary-btn" style={{ padding: "11px 20px", fontSize: 14, fontWeight: 700 }}>← Back</button>
            ) : <div />}
            <button onClick={next} disabled={submitting} className="gps-primary-btn"
              style={{
                padding: "11px 28px", fontSize: 14, fontWeight: 700, color: "white",
                border: "none", borderRadius: 12, cursor: submitting ? "wait" : "pointer",
                opacity: submitting ? 0.75 : 1,
              }}>
              {submitting ? "Submitting..." : step === 4 ? "Submit Agreement" : "Next →"}
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
}
