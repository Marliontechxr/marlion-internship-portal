// PDF Generation utilities

export interface OfferLetterData {
  studentName: string;
  college: string;
  stream: string;
  startDate: Date;
  endDate: Date;
  offerDate: Date;
  refNumber?: string;
}

export interface CertificateData {
  studentName: string;
  college: string;
  stream: string;
  projectTitle: string;
  completionDate: Date;
  achievementSummary: string;
  verificationCode: string;
  qrCodeUrl: string;
  adminFeedback?: string;
}

export interface IdCardData {
  studentName: string;
  college: string;
  department: string;
  stream: string;
  photoUrl?: string;
  studentId: string;
  validFrom: Date;
  validTo: Date;
}

// Generate unique reference number for offer letter
export function generateOfferRefNumber(): string {
  const year = new Date().getFullYear().toString().slice(-2);
  const random = Math.floor(Math.random() * 9000) + 1000;
  return `INT/Win${year}/${random}`;
}

// Generate offer letter HTML template with Trust Seal
export function generateOfferLetterHTML(data: OfferLetterData): string {
  const formatDate = (date: Date) => date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const streamNames: Record<string, string> = {
    'ar-vr': 'Immersive Tech (AR/VR/Unity)',
    'fullstack': 'Full Stack Development',
    'agentic-ai': 'Agentic AI Development',
    'data-science': 'Data Science & Computer Vision',
  };

  const refNumber = data.refNumber || generateOfferRefNumber();
  const verifyId = refNumber.replace(/\//g, '-');
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=https://intern.marliontech.com/verify/${verifyId}`;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Marlion Internship Offer</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700&family=Source+Sans+Pro:wght@400;600&family=Great+Vibes&family=Dancing+Script:wght@600&display=swap');
    
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: 'Source Sans Pro', 'Georgia', serif;
      max-width: 800px;
      margin: 0 auto;
      padding: 40px;
      color: #333;
      position: relative;
      background: #fff;
    }
    
    .signature-text {
      font-family: 'Great Vibes', 'Dancing Script', cursive;
      font-size: 26px;
      color: #1e40af;
      margin-bottom: 2px;
    }

    /* WATERMARK */
    .watermark {
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%) rotate(-45deg);
      font-size: 120px;
      color: rgba(37, 99, 235, 0.03);
      z-index: -1;
      font-weight: bold;
      pointer-events: none;
      font-family: 'Playfair Display', serif;
      letter-spacing: 10px;
    }

    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 3px solid #2563eb;
      padding-bottom: 20px;
      margin-bottom: 25px;
    }

    .logo-section {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .logo-icon {
      width: 50px;
      height: 50px;
      background: linear-gradient(135deg, #2563eb, #7c3aed);
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: bold;
      font-size: 20px;
      font-family: 'Playfair Display', serif;
    }

    .logo-text {
      font-size: 22px;
      font-weight: bold;
      color: #2563eb;
      text-transform: uppercase;
      letter-spacing: 2px;
      font-family: 'Playfair Display', serif;
    }

    .logo-tagline {
      font-size: 10px;
      color: #666;
      letter-spacing: 1px;
    }
    
    .company-address {
      font-size: 11px;
      color: #666;
      text-align: right;
      line-height: 1.5;
    }

    .ref-block {
      font-size: 11px;
      color: #555;
      margin-bottom: 20px;
      display: flex;
      justify-content: space-between;
    }

    .title {
      font-size: 22px;
      text-align: center;
      text-decoration: underline;
      text-underline-offset: 6px;
      margin: 25px 0;
      font-weight: bold;
      font-family: 'Playfair Display', serif;
      color: #1e40af;
    }

    .content {
      line-height: 1.7;
      font-size: 14px;
    }

    .content p {
      margin-bottom: 12px;
    }

    .details-box {
      background: linear-gradient(135deg, #f8fafc, #eef2ff);
      border: 1px solid #c7d2fe;
      border-left: 4px solid #2563eb;
      padding: 18px 20px;
      border-radius: 0 8px 8px 0;
      margin: 20px 0;
    }

    .details-box ul {
      list-style: none;
      padding: 0;
      margin: 0;
    }

    .details-box li {
      padding: 6px 0;
      border-bottom: 1px dashed #e2e8f0;
    }

    .details-box li:last-child {
      border-bottom: none;
    }

    .terms-section {
      margin-top: 20px;
    }

    .terms-section h3 {
      font-size: 14px;
      color: #1e40af;
      margin-bottom: 10px;
    }

    .terms-section ol {
      padding-left: 20px;
      font-size: 13px;
      color: #555;
    }

    .terms-section li {
      margin-bottom: 6px;
    }

    /* TRUST SEAL SECTION */
    .auth-section {
      margin-top: 50px;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      page-break-inside: avoid;
    }

    .signature-block {
      position: relative;
      width: 220px;
      text-align: center;
      margin-left: auto;
    }

    /* Blue ink stamp seal */
    .stamp-seal {
      position: absolute;
      top: -50px;
      left: -80px;
      width: 100px;
      height: 100px;
      border: 3px solid #2563eb;
      border-radius: 50%;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      color: #2563eb;
      font-weight: bold;
      font-size: 8px;
      text-align: center;
      opacity: 0.85;
      transform: rotate(-12deg);
      z-index: 1;
      pointer-events: none;
      background: rgba(255,255,255,0.9);
    }

    .stamp-seal::before {
      content: '';
      position: absolute;
      inset: 4px;
      border: 2px solid #2563eb;
      border-radius: 50%;
    }

    .stamp-seal .seal-text {
      font-size: 7px;
      letter-spacing: 1px;
      text-transform: uppercase;
    }

    .stamp-seal .seal-company {
      font-size: 9px;
      font-weight: bold;
      margin: 4px 0;
    }

    .stamp-seal .seal-year {
      font-size: 10px;
      font-weight: bold;
    }

    .sign-line {
      border-top: 2px solid #333;
      width: 180px;
      margin: 0 auto 8px;
    }

    .auth-name {
      font-weight: bold;
      font-size: 14px;
      color: #1e3a8a;
    }

    .auth-title {
      font-size: 11px;
      color: #666;
    }

    /* DIGITAL VERIFICATION FOOTER */
    .digital-footer {
      margin-top: 40px;
      border-top: 2px dashed #c7d2fe;
      padding-top: 20px;
      display: flex;
      align-items: center;
      gap: 20px;
      background: #fafbff;
      padding: 20px;
      border-radius: 8px;
    }

    .qr-code {
      width: 80px;
      height: 80px;
      flex-shrink: 0;
    }

    .qr-code img {
      width: 100%;
      height: 100%;
    }

    .verify-text {
      font-size: 11px;
      color: #555;
      line-height: 1.6;
    }

    .verify-text strong {
      color: #1e40af;
    }

    .verify-link {
      color: #2563eb;
      text-decoration: none;
      font-weight: 600;
    }

    .doc-id {
      font-family: monospace;
      background: #e0e7ff;
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 10px;
    }

    @media print {
      body {
        padding: 20px;
      }
      .watermark {
        position: fixed;
      }
    }
  </style>
</head>
<body>

  <div class="watermark">MARLION</div>

  <div class="header">
    <div class="logo-section">
      <div class="logo-icon">M</div>
      <div>
        <div class="logo-text">Marlion Technologies</div>
        <div class="logo-tagline">AI + XR for Real Operations</div>
      </div>
    </div>
    <div class="company-address">
      A34, Kumarasamy Street,<br>
      Thirunagar, Madurai - 625006<br>
      Tamil Nadu, India<br>
      www.marliontech.com
    </div>
  </div>
  
  <div class="ref-block">
    <div><strong>Ref No:</strong> ${refNumber}</div>
    <div><strong>Date:</strong> ${formatDate(data.offerDate)}</div>
  </div>
  
  <h2 class="title">INTERNSHIP OFFER LETTER</h2>
  
  <div class="content">
    <p>Dear <strong>${data.studentName}</strong>,</p>
    
    <p>We are pleased to inform you that you have been selected for the <strong>Winter Internship 2025</strong> program at Marlion Technologies. This year's theme focuses on <em>Assistive Tech & IEP for Neurodiverse Children</em>.</p>
    
    <div class="details-box">
      <ul>
        <li><strong>Stream:</strong> ${streamNames[data.stream] || data.stream}</li>
        <li><strong>Duration:</strong> ${formatDate(data.startDate)} to ${formatDate(data.endDate)}</li>
        <li><strong>College:</strong> ${data.college}</li>
        <li><strong>Mode:</strong> On-site at Marlion Technologies, Madurai</li>
        <li><strong>Schedule:</strong> Monday to Saturday, 10:00 AM – 5:00 PM</li>
        <li><strong>Policy:</strong> BYOD (Bring Your Own Device)</li>
      </ul>
    </div>
    
    <div class="terms-section">
      <h3>Terms & Conditions:</h3>
      <ol>
        <li>Complete all bootcamp modules before starting project work</li>
        <li>Submit daily progress logs during the internship period</li>
        <li>Maintain professional conduct and adhere to data privacy protocols</li>
        <li>AI-assisted work must be disclosed; plagiarism will result in termination</li>
        <li>Completion certificate is conditional upon meeting all objectives</li>
      </ol>
    </div>
    
    <p style="margin-top: 20px;">We look forward to building the future of assistive technology with you.</p>
  </div>
  
  <div class="auth-section">
    <div class="signature-block">
      <div class="stamp-seal">
        <span class="seal-text">Official Seal</span>
        <span class="seal-company">MARLION</span>
        <span class="seal-text">Technologies</span>
        <span class="seal-year">2025</span>
      </div>
      
      <div class="signature-text" style="margin-top: 15px;">S. Vaidyanathan</div>
      <div class="sign-line"></div>
      <div class="auth-name">S. Vaidyanathan</div>
      <div class="auth-title">Founder & CEO</div>
    </div>
  </div>
  
  <div class="digital-footer">
    <img src="${qrCodeUrl}" class="qr-code" alt="Verify">
    
    <div class="verify-text">
      <strong>🔒 Authenticity Verification</strong><br>
      This document is digitally generated and tamper-evident.<br>
      To verify its authenticity, scan the QR code or visit:<br>
      <a href="https://intern.marliontech.com/verify/${verifyId}" class="verify-link">intern.marliontech.com/verify/${verifyId}</a><br>
      <span class="doc-id">Document ID: ${refNumber}</span>
    </div>
  </div>

</body>
</html>
  `;
}

// Generate certificate HTML template with Trust Seal - Clean Professional Design
export function generateCertificateHTML(data: CertificateData): string {
  const formatDate = (date: Date) => date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const streamNames: Record<string, string> = {
    'ar-vr': 'Immersive Tech (AR/VR/Unity)',
    'fullstack': 'Full Stack Development',
    'agentic-ai': 'Agentic AI Development',
    'data-science': 'Data Science & Computer Vision',
  };

  // Program Directors by stream
  const programDirectors: Record<string, string> = {
    'ar-vr': 'Harish Kumar',
    'fullstack': 'Boomika Krishnamoorthy',
    'agentic-ai': 'Sai Naveena Sri',
    'data-science': 'Gokul Raja',
  };

  const programDirector = programDirectors[data.stream] || 'Program Director';

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Marlion Certificate of Completion</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=Inter:wght@400;500;600&family=Dancing+Script:wght@600;700&family=Great+Vibes&display=swap');
    
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      background: #f8fafc;
      min-height: 100vh;
      padding: 40px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .certificate {
      max-width: 850px;
      width: 100%;
      background: white;
      padding: 60px 70px;
      box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06);
      position: relative;
    }

    /* Elegant border */
    .certificate::before {
      content: '';
      position: absolute;
      inset: 15px;
      border: 2px solid #1e40af;
      pointer-events: none;
    }

    /* Inner subtle border */
    .certificate::after {
      content: '';
      position: absolute;
      inset: 20px;
      border: 1px solid #dbeafe;
      pointer-events: none;
    }

    /* Corner accents */
    .corner {
      position: absolute;
      width: 40px;
      height: 40px;
    }

    .corner::before,
    .corner::after {
      content: '';
      position: absolute;
      background: #1e40af;
    }
    
    /* Signature style */
    .signature-text {
      font-family: 'Great Vibes', 'Dancing Script', cursive;
      font-size: 28px;
      color: #1e3a5f;
      margin-bottom: 4px;
    }

    .corner-tl { top: 25px; left: 25px; }
    .corner-tl::before { width: 40px; height: 3px; top: 0; left: 0; }
    .corner-tl::after { width: 3px; height: 40px; top: 0; left: 0; }

    .corner-tr { top: 25px; right: 25px; }
    .corner-tr::before { width: 40px; height: 3px; top: 0; right: 0; }
    .corner-tr::after { width: 3px; height: 40px; top: 0; right: 0; }

    .corner-bl { bottom: 25px; left: 25px; }
    .corner-bl::before { width: 40px; height: 3px; bottom: 0; left: 0; }
    .corner-bl::after { width: 3px; height: 40px; bottom: 0; left: 0; }

    .corner-br { bottom: 25px; right: 25px; }
    .corner-br::before { width: 40px; height: 3px; bottom: 0; right: 0; }
    .corner-br::after { width: 3px; height: 40px; bottom: 0; right: 0; }

    .header {
      text-align: center;
      margin-bottom: 35px;
      position: relative;
      z-index: 1;
    }

    .logo-section {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 12px;
      margin-bottom: 8px;
    }

    .logo-icon {
      width: 44px;
      height: 44px;
      background: linear-gradient(135deg, #1e40af, #3b82f6);
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: 700;
      font-size: 20px;
      font-family: 'Playfair Display', serif;
    }

    .logo {
      font-size: 24px;
      font-weight: 600;
      color: #1e40af;
      letter-spacing: 2px;
      font-family: 'Playfair Display', serif;
    }

    .program-name {
      font-size: 11px;
      color: #64748b;
      letter-spacing: 3px;
      text-transform: uppercase;
      font-weight: 500;
    }

    .title {
      font-size: 42px;
      color: #1e3a8a;
      margin: 30px 0 20px;
      text-align: center;
      font-family: 'Playfair Display', serif;
      font-weight: 600;
      letter-spacing: 1px;
    }

    .presented-to {
      text-align: center;
      font-size: 14px;
      color: #64748b;
      margin-bottom: 8px;
      letter-spacing: 1px;
    }

    .name {
      text-align: center;
      font-size: 36px;
      color: #0f172a;
      margin: 12px 0 20px;
      font-family: 'Playfair Display', serif;
      font-weight: 700;
    }

    .name-underline {
      width: 280px;
      height: 2px;
      background: linear-gradient(90deg, transparent, #1e40af, transparent);
      margin: 0 auto;
    }

    .details {
      text-align: center;
      margin: 28px 0;
      font-size: 14px;
      line-height: 2.2;
      color: #475569;
    }

    .stream-name {
      font-size: 18px;
      color: #1e40af;
      font-weight: 600;
    }

    .project-title {
      font-weight: 500;
      color: #1e40af;
    }

    .summary {
      text-align: center;
      font-style: italic;
      color: #475569;
      margin: 25px 40px;
      padding: 18px 25px;
      background: #f8fafc;
      border-left: 3px solid #1e40af;
      border-radius: 0 6px 6px 0;
      font-size: 13px;
      line-height: 1.7;
    }

    .auth-section {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      margin-top: 35px;
      padding-top: 25px;
    }

    .signature-block {
      text-align: center;
      width: 180px;
      position: relative;
    }

    /* Professional seal */
    .stamp-seal {
      position: absolute;
      top: -55px;
      left: 50%;
      transform: translateX(-50%) rotate(-8deg);
      width: 80px;
      height: 80px;
      border: 2px solid #1e40af;
      border-radius: 50%;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      color: #1e40af;
      font-weight: 600;
      font-size: 6px;
      text-align: center;
      opacity: 0.9;
      z-index: 1;
      background: white;
    }

    .stamp-seal::before {
      content: '';
      position: absolute;
      inset: 3px;
      border: 1px solid #1e40af;
      border-radius: 50%;
    }

    .sign-line {
      border-top: 1px solid #1e293b;
      width: 140px;
      margin: 0 auto 6px;
    }

    .auth-name {
      font-weight: 600;
      font-size: 12px;
      color: #0f172a;
    }

    .auth-title {
      font-size: 10px;
      color: #64748b;
    }

    .qr-section {
      text-align: center;
    }

    .qr-code {
      width: 70px;
      height: 70px;
      margin-bottom: 4px;
    }

    .scan-text {
      font-size: 9px;
      color: #64748b;
    }

    .verification-footer {
      margin-top: 25px;
      text-align: center;
      padding-top: 15px;
      border-top: 1px solid #e2e8f0;
    }

    .verification-footer p {
      font-size: 10px;
      color: #64748b;
    }

    .verify-code {
      font-family: 'SF Mono', Monaco, monospace;
      background: #f1f5f9;
      padding: 3px 8px;
      border-radius: 4px;
      font-size: 11px;
      color: #1e40af;
      font-weight: 500;
    }

    .verify-link {
      color: #1e40af;
      text-decoration: none;
    }

    @media print {
      body {
        background: white;
        padding: 0;
      }
      .certificate {
        box-shadow: none;
      }
    }
  </style>
</head>
<body>
  <div class="certificate">
    <div class="corner corner-tl"></div>
    <div class="corner corner-tr"></div>
    <div class="corner corner-bl"></div>
    <div class="corner corner-br"></div>

    <div class="header">
      <div class="logo-section">
        <div class="logo-icon">M</div>
        <div class="logo">MARLION TECHNOLOGIES</div>
      </div>
      <div class="program-name">Winter Internship Program 2025</div>
    </div>
    
    <h1 class="title">Certificate of Completion</h1>
    
    <p class="presented-to">This is to certify that</p>
    
    <div class="name">${data.studentName}</div>
    <div class="name-underline"></div>
    <p class="presented-to" style="margin-top: 8px; font-size: 12px;">${data.college}</p>
    
    <div class="details">
      <p>has successfully completed the internship program in</p>
      <p class="stream-name">${streamNames[data.stream] || data.stream}</p>
      <p>with the capstone project</p>
      <p class="project-title">"${data.projectTitle}"</p>
      <p>on <strong>${formatDate(data.completionDate)}</strong></p>
    </div>
    
    <div class="summary">
      ${data.achievementSummary}
    </div>
    
    ${data.adminFeedback ? `
    <div class="summary" style="border-left-color: #10b981; background: #f0fdf4;">
      <strong style="color: #10b981;">Message from Marlion:</strong> ${data.adminFeedback}
    </div>
    ` : ''}
    
    <div class="auth-section">
      <div class="signature-block">
        <div class="signature-text">${programDirector}</div>
        <div class="sign-line"></div>
        <div class="auth-name">${programDirector}</div>
        <div class="auth-title">Program Director</div>
      </div>

      <div class="qr-section">
        <img src="${data.qrCodeUrl}" class="qr-code" alt="Verify">
        <div class="scan-text">Scan to verify</div>
      </div>

      <div class="signature-block">
        <div class="stamp-seal">
          <span style="font-size: 5px; letter-spacing: 1px;">VERIFIED</span>
          <span style="font-size: 8px; font-weight: 600; margin: 2px 0;">MARLION</span>
          <span style="font-size: 5px;">TECHNOLOGIES</span>
          <span style="font-size: 9px; font-weight: 600;">2025</span>
        </div>
        <div class="signature-text" style="margin-top: 25px;">S. Vaidyanathan</div>
        <div class="sign-line"></div>
        <div class="auth-name">S. Vaidyanathan</div>
        <div class="auth-title">Founder & CEO</div>
      </div>
    </div>
    
    <div class="verification-footer">
      <p>
        <span class="verify-code">${data.verificationCode}</span>
        &nbsp;•&nbsp; Verify at: <a href="https://intern.marliontech.com/verify/${data.verificationCode}" class="verify-link">intern.marliontech.com/verify/${data.verificationCode}</a>
      </p>
    </div>
  </div>
</body>
</html>
  `;
}

// Generate unique verification code
export function generateVerificationCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = 'MT-';
  for (let i = 0; i < 8; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

// Generate ID Card HTML - Clean Minimalist Design
export function generateIdCardHTML(data: IdCardData): string {
  const formatDate = (date: Date) => date.toLocaleDateString('en-IN', {
    month: 'short',
    year: 'numeric',
  });

  const streamNames: Record<string, string> = {
    'ar-vr': 'AR/VR Development',
    'fullstack': 'Full Stack Dev',
    'agentic-ai': 'Agentic AI',
    'data-science': 'Data Science',
  };

  const streamColors: Record<string, string> = {
    'ar-vr': '#8b5cf6',
    'fullstack': '#3b82f6',
    'agentic-ai': '#10b981',
    'data-science': '#f59e0b',
  };

  const streamName = streamNames[data.stream] || data.stream;
  const streamColor = streamColors[data.stream] || '#3b82f6';
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=https://intern.marliontech.com/verify/${data.studentId}`;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Marlion Intern ID Card</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
    
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    @page {
      size: 85.6mm 53.98mm;
      margin: 0;
    }

    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      background: #f1f5f9;
      min-height: 100vh;
      padding: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .card-container {
      display: flex;
      gap: 20px;
      flex-wrap: wrap;
      justify-content: center;
    }

    .id-card {
      width: 340px;
      height: 214px;
      background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
      border-radius: 12px;
      padding: 16px;
      position: relative;
      overflow: hidden;
      box-shadow: 0 10px 40px rgba(0,0,0,0.3);
    }

    /* Accent stripe */
    .id-card::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 4px;
      background: ${streamColor};
    }

    /* Subtle pattern */
    .id-card::after {
      content: '';
      position: absolute;
      top: 0;
      right: 0;
      width: 150px;
      height: 150px;
      background: radial-gradient(circle at center, ${streamColor}10 0%, transparent 70%);
      pointer-events: none;
    }

    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 12px;
    }

    .logo {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .logo-icon {
      width: 28px;
      height: 28px;
      background: linear-gradient(135deg, #3b82f6, #8b5cf6);
      border-radius: 6px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      color: white;
      font-size: 14px;
    }

    .logo-text {
      font-size: 14px;
      font-weight: 600;
      color: white;
    }

    .logo-sub {
      font-size: 9px;
      color: #94a3b8;
      letter-spacing: 1px;
      text-transform: uppercase;
    }

    .stream-badge {
      background: ${streamColor}20;
      border: 1px solid ${streamColor}40;
      color: ${streamColor};
      padding: 4px 10px;
      border-radius: 20px;
      font-size: 10px;
      font-weight: 600;
    }

    .content {
      display: flex;
      gap: 14px;
    }

    .photo-section {
      flex-shrink: 0;
    }

    .photo {
      width: 72px;
      height: 90px;
      background: #334155;
      border-radius: 8px;
      overflow: hidden;
      border: 2px solid #475569;
    }

    .photo img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .photo-placeholder {
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #64748b;
      font-size: 28px;
      font-weight: 600;
    }

    .details {
      flex: 1;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }

    .name {
      font-size: 18px;
      font-weight: 700;
      color: white;
      line-height: 1.2;
      margin-bottom: 4px;
    }

    .college {
      font-size: 11px;
      color: #94a3b8;
      margin-bottom: 2px;
    }

    .department {
      font-size: 10px;
      color: #64748b;
    }

    .footer {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      margin-top: auto;
    }

    .validity {
      font-size: 9px;
      color: #64748b;
    }

    .validity span {
      color: #94a3b8;
      font-weight: 500;
    }

    .qr-code {
      width: 50px;
      height: 50px;
      background: white;
      border-radius: 6px;
      padding: 3px;
    }

    .qr-code img {
      width: 100%;
      height: 100%;
    }

    .id-number {
      position: absolute;
      bottom: 12px;
      left: 16px;
      font-size: 9px;
      color: #475569;
      font-family: monospace;
    }

    /* Back of card */
    .id-card-back {
      width: 340px;
      height: 214px;
      background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
      border-radius: 12px;
      padding: 20px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }

    .back-header {
      text-align: center;
      padding-bottom: 12px;
      border-bottom: 1px solid #334155;
    }

    .back-title {
      font-size: 12px;
      font-weight: 600;
      color: white;
      margin-bottom: 4px;
    }

    .back-subtitle {
      font-size: 9px;
      color: #64748b;
    }

    .instructions {
      flex: 1;
      padding: 12px 0;
    }

    .instruction {
      font-size: 9px;
      color: #94a3b8;
      margin-bottom: 6px;
      padding-left: 12px;
      position: relative;
    }

    .instruction::before {
      content: '•';
      position: absolute;
      left: 0;
      color: ${streamColor};
    }

    .back-footer {
      text-align: center;
      padding-top: 10px;
      border-top: 1px solid #334155;
    }

    .verify-text {
      font-size: 8px;
      color: #64748b;
    }

    .verify-link {
      font-size: 9px;
      color: ${streamColor};
      font-weight: 500;
    }

    @media print {
      body {
        background: white;
        padding: 10mm;
      }
      .id-card, .id-card-back {
        box-shadow: none;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
    }
  </style>
</head>
<body>
  <div class="card-container">
    <!-- Front of Card -->
    <div class="id-card">
      <div class="header">
        <div class="logo">
          <div class="logo-icon">M</div>
          <div>
            <div class="logo-text">MARLION</div>
            <div class="logo-sub">Winter Intern 2025</div>
          </div>
        </div>
        <div class="stream-badge">${streamName}</div>
      </div>
      
      <div class="content">
        <div class="photo-section">
          <div class="photo">
            ${data.photoUrl 
              ? `<img src="${data.photoUrl}" alt="Photo">`
              : `<div class="photo-placeholder">${data.studentName.charAt(0)}</div>`
            }
          </div>
        </div>
        
        <div class="details">
          <div>
            <div class="name">${data.studentName}</div>
            <div class="college">${data.college}</div>
            <div class="department">${data.department}</div>
          </div>
          
          <div class="footer">
            <div class="validity">
              Valid: <span>${formatDate(data.validFrom)} - ${formatDate(data.validTo)}</span>
            </div>
            <div class="qr-code">
              <img src="${qrCodeUrl}" alt="QR">
            </div>
          </div>
        </div>
      </div>
      
      <div class="id-number">ID: ${data.studentId}</div>
    </div>

    <!-- Back of Card -->
    <div class="id-card-back">
      <div class="back-header">
        <div class="back-title">Marlion Technologies Pvt. Ltd.</div>
        <div class="back-subtitle">Internship Program - Winter 2025</div>
      </div>
      
      <div class="instructions">
        <div class="instruction">This card must be carried at all times during internship</div>
        <div class="instruction">Report loss immediately to admin@marliontech.com</div>
        <div class="instruction">Not transferable - for official use only</div>
        <div class="instruction">Scan QR code to verify authenticity</div>
      </div>
      
      <div class="back-footer">
        <div class="verify-text">Verify at</div>
        <div class="verify-link">intern.marliontech.com/verify/${data.studentId}</div>
      </div>
    </div>
  </div>
</body>
</html>
  `;
}
