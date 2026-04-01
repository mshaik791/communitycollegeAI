import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.ALERT_EMAIL_FROM,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

export interface AlertPayload {
  sessionId: string;
  riskScore: number;
  riskLabel: string;
  studentName: string | null;
  caseSummary: string;
  barriers: { code: string; severity: string; notes: string | null }[];
  nextSteps: string[];
  emotionalInsight: string | null;
  urgency: string;
}

const URGENCY_COLOR: Record<string, string> = {
  CRISIS:          "#c05050",
  URGENT:          "#c07030",
  FOLLOW_UP_SOON:  "#c08830",
  ROUTINE:         "#4a9e95",
};

export async function sendCounselorAlert(payload: AlertPayload): Promise<void> {
  const threshold = parseInt(process.env.ALERT_RISK_THRESHOLD ?? "70", 10);
  if (payload.riskScore < threshold) return;

  // Skip if email is not configured
  if (!process.env.ALERT_EMAIL_FROM || !process.env.GMAIL_APP_PASSWORD) {
    // eslint-disable-next-line no-console
    console.log(`📧 [EMAIL MOCK] Alert would be sent for session ${payload.sessionId} | Risk: ${payload.riskScore}`);
    return;
  }

  const color = URGENCY_COLOR[payload.urgency] ?? "#4a9e95";
  const webUrl = process.env.NEXT_PUBLIC_WEB_URL ?? "http://localhost:3000";

  const barrierRows = payload.barriers
    .map((b) => `<div class="barrier-item">• <strong>${b.code}</strong> (${b.severity})${b.notes ? ": " + b.notes : ""}</div>`)
    .join("");

  const stepRows = payload.nextSteps
    .map((s, i) => `<div class="step-item">${i + 1}. ${s}</div>`)
    .join("");

  const html = `<!DOCTYPE html>
<html>
<head>
  <style>
    body{font-family:'Helvetica Neue',sans-serif;background:#f8f5fc;margin:0;padding:20px}
    .container{max-width:600px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(155,142,196,.12)}
    .header{background:linear-gradient(135deg,#7eb8b0,#9b8ec4);padding:28px 32px}
    .header h1{color:#fff;margin:0;font-size:20px;font-weight:500}
    .header p{color:rgba(255,255,255,.8);margin:4px 0 0;font-size:13px}
    .urgency-bar{background:${color};padding:10px 32px;color:#fff;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:.1em}
    .body{padding:28px 32px}
    .risk-row{display:flex;align-items:center;gap:16px;margin-bottom:24px;padding-bottom:24px;border-bottom:1px solid #f0eaf8}
    .risk-num{font-size:52px;font-weight:700;color:${color};line-height:1}
    .risk-label{font-size:16px;color:#2d2438;font-weight:500}
    .risk-sub{font-size:12px;color:#9a8fa0;margin-top:2px}
    .section{margin-bottom:20px}
    .section-title{font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.08em;color:#7eb8b0;margin-bottom:8px}
    .summary{font-size:14px;color:#2d2438;line-height:1.7;background:#f8f5fc;border-radius:10px;padding:14px}
    .insight{font-size:13px;color:#7a6d85;line-height:1.7;font-style:italic;background:#f0eaf8;border-radius:10px;padding:14px;border-left:3px solid #9b8ec4}
    .barriers{background:#fdf8f0;border-radius:10px;padding:14px}
    .barrier-item{font-size:13px;color:#2d2438;padding:4px 0;line-height:1.5}
    .steps{background:#f0f9f7;border-radius:10px;padding:14px}
    .step-item{font-size:13px;color:#2d2438;padding:4px 0;line-height:1.5}
    .cta{text-align:center;margin-top:24px;padding-top:24px;border-top:1px solid #f0eaf8}
    .cta a{background:linear-gradient(135deg,#7eb8b0,#9b8ec4);color:#fff;text-decoration:none;padding:12px 28px;border-radius:10px;font-size:14px;font-weight:500;display:inline-block}
    .footer{background:#f8f5fc;padding:16px 32px;text-align:center;font-size:11px;color:#b0a4ba}
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>⚠️ High-Risk Student Alert</h1>
      <p>NOCE Navigator Suite — Automated Risk Detection</p>
    </div>
    <div class="urgency-bar">${payload.urgency.replace("_", " ")} — Immediate attention recommended</div>
    <div class="body">
      <div class="risk-row">
        <div class="risk-num">${payload.riskScore}</div>
        <div>
          <div class="risk-label">${payload.riskLabel} Risk</div>
          <div class="risk-sub">Student: ${payload.studentName ?? "Anonymous"}</div>
          <div class="risk-sub">Session ID: ${payload.sessionId}</div>
        </div>
      </div>
      <div class="section">
        <div class="section-title">Case Summary</div>
        <div class="summary">${payload.caseSummary}</div>
      </div>
      ${payload.emotionalInsight ? `
      <div class="section">
        <div class="section-title">Emotional Insight (Raven-1 Visual Analysis)</div>
        <div class="insight">"${payload.emotionalInsight}"</div>
      </div>` : ""}
      <div class="section">
        <div class="section-title">Detected Barriers</div>
        <div class="barriers">${barrierRows || "<div class='barrier-item'>No barriers detected</div>"}</div>
      </div>
      <div class="section">
        <div class="section-title">Recommended Next Steps</div>
        <div class="steps">${stepRows || "<div class='step-item'>Review session manually</div>"}</div>
      </div>
      <div class="cta">
        <a href="${webUrl}/staff">View in Staff Dashboard →</a>
      </div>
    </div>
    <div class="footer">
      NOCE Navigator Suite · Automated alert sent when risk score ≥ ${threshold}<br>
      To update alert settings, contact your system administrator.
    </div>
  </div>
</body>
</html>`;

  const plainText = [
    "HIGH RISK ALERT",
    "",
    `Risk Score: ${payload.riskScore} (${payload.riskLabel})`,
    `Student: ${payload.studentName ?? "Anonymous"}`,
    `Urgency: ${payload.urgency}`,
    "",
    "Case Summary:",
    payload.caseSummary,
    "",
    "Detected Barriers:",
    ...payload.barriers.map((b) => `• ${b.code} (${b.severity})${b.notes ? ": " + b.notes : ""}`),
    "",
    "Recommended Next Steps:",
    ...payload.nextSteps.map((s, i) => `${i + 1}. ${s}`),
    "",
    `View in staff dashboard: ${webUrl}/staff`,
  ].join("\n");

  try {
    await transporter.sendMail({
      from: `"NOCE Navigator Suite" <${process.env.ALERT_EMAIL_FROM}>`,
      to: process.env.ALERT_EMAIL_TO,
      subject: `🚨 High-Risk Student Alert — Score ${payload.riskScore} (${payload.riskLabel}) — ${payload.studentName ?? "Anonymous Student"}`,
      html,
      text: plainText,
    });
    // eslint-disable-next-line no-console
    console.log(`✅ Alert email sent for session: ${payload.sessionId} | Risk: ${payload.riskScore}`);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("❌ Failed to send alert email:", error);
  }
}
