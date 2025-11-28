// Email templates for notifications

export interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
}

export function getSelectionEmail(studentName: string, stream: string): EmailTemplate {
  const streamNames: Record<string, string> = {
    'ar-vr': 'AR/VR Development',
    'fullstack': 'Full-Stack Development',
    'agentic-ai': 'Agentic AI',
    'data-science': 'Data Science',
  };

  return {
    subject: '🎉 Congratulations! You are selected for Marlion Winter Internship 2025',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #2563eb, #7c3aed); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0;">Congratulations! 🎉</h1>
        </div>
        <div style="padding: 30px; background: #f8fafc;">
          <p>Dear <strong>${studentName}</strong>,</p>
          <p>We are thrilled to inform you that you have been <strong>selected</strong> for the Marlion Technologies Winter Internship 2025!</p>
          <p><strong>Stream:</strong> ${streamNames[stream] || stream}</p>
          <p>Please log in to the student portal to:</p>
          <ol>
            <li>Review and accept the offer letter</li>
            <li>Download your official offer letter</li>
            <li>Begin your bootcamp journey</li>
          </ol>
          <a href="https://intern.marliontech.com/offer" style="display: inline-block; background: #2563eb; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0;">View Offer Letter</a>
          <p>Welcome to the team!</p>
          <p>Best regards,<br>The Marlion Technologies Team</p>
        </div>
      </div>
    `,
    text: `Congratulations ${studentName}! You have been selected for the Marlion Technologies Winter Internship 2025 in ${streamNames[stream] || stream}. Please log in to the student portal to review and accept your offer letter.`,
  };
}

export function getRejectionEmail(studentName: string): EmailTemplate {
  return {
    subject: 'Update on Your Marlion Internship Application',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #1e3a8a; padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0;">Marlion Technologies</h1>
        </div>
        <div style="padding: 30px; background: #f8fafc;">
          <p>Dear <strong>${studentName}</strong>,</p>
          <p>Thank you for your interest in the Marlion Technologies Winter Internship 2025 and for taking the time to complete the interview process.</p>
          <p>After careful consideration, we regret to inform you that we will not be moving forward with your application at this time.</p>
          <p>Please don't be discouraged. The selection process was highly competitive, and this decision does not reflect on your abilities or potential.</p>
          <p>We encourage you to:</p>
          <ul>
            <li>Continue building your skills</li>
            <li>Apply again for future opportunities</li>
            <li>Stay connected with us on LinkedIn</li>
          </ul>
          <p>We wish you all the best in your future endeavors!</p>
          <p>Best regards,<br>The Marlion Technologies Team</p>
        </div>
      </div>
    `,
    text: `Dear ${studentName}, Thank you for your interest in the Marlion Technologies Winter Internship 2025. After careful consideration, we regret to inform you that we will not be moving forward with your application at this time. We wish you all the best in your future endeavors.`,
  };
}

export function getInterviewReminderEmail(studentName: string): EmailTemplate {
  return {
    subject: '⏰ Complete Your AI Interview - Marlion Internship',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #f59e0b; padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0;">Reminder: Complete Your Interview</h1>
        </div>
        <div style="padding: 30px; background: #f8fafc;">
          <p>Dear <strong>${studentName}</strong>,</p>
          <p>We noticed you haven't completed your AI interview yet for the Marlion Technologies Winter Internship 2025.</p>
          <p>The interview takes only <strong>5 minutes</strong> and can be done anytime that's convenient for you.</p>
          <a href="https://intern.marliontech.com/interview" style="display: inline-block; background: #f59e0b; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0;">Start Interview Now</a>
          <p>Don't miss this opportunity!</p>
          <p>Best regards,<br>The Marlion Technologies Team</p>
        </div>
      </div>
    `,
    text: `Reminder: Dear ${studentName}, please complete your AI interview for the Marlion Technologies Winter Internship 2025. It takes only 5 minutes. Visit intern.marliontech.com/interview to start.`,
  };
}

export function getAnnouncementEmail(studentName: string, title: string, message: string): EmailTemplate {
  return {
    subject: `📢 ${title} - Marlion Internship`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #2563eb; padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0;">📢 Announcement</h1>
        </div>
        <div style="padding: 30px; background: #f8fafc;">
          <p>Dear <strong>${studentName}</strong>,</p>
          <h2 style="color: #1e3a8a;">${title}</h2>
          <div style="background: white; padding: 20px; border-left: 4px solid #2563eb; margin: 20px 0;">
            ${message}
          </div>
          <a href="https://intern.marliontech.com/dashboard" style="display: inline-block; background: #2563eb; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0;">Go to Dashboard</a>
          <p>Best regards,<br>The Marlion Technologies Team</p>
        </div>
      </div>
    `,
    text: `Announcement for ${studentName}: ${title} - ${message}`,
  };
}

export function getCertificateReadyEmail(studentName: string): EmailTemplate {
  return {
    subject: '🎓 Your Certificate is Ready! - Marlion Internship',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #10b981, #059669); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0;">🎓 Congratulations Graduate!</h1>
        </div>
        <div style="padding: 30px; background: #f8fafc;">
          <p>Dear <strong>${studentName}</strong>,</p>
          <p>Congratulations on successfully completing the Marlion Technologies Winter Internship 2025!</p>
          <p>Your <strong>Certificate of Completion</strong> is now ready for download.</p>
          <a href="https://intern.marliontech.com/certificate" style="display: inline-block; background: #10b981; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0;">Download Certificate</a>
          <p>Your certificate includes a unique QR code for verification purposes.</p>
          <p>Thank you for being part of our internship program. We wish you all the best in your future career!</p>
          <p>Best regards,<br>The Marlion Technologies Team</p>
        </div>
      </div>
    `,
    text: `Congratulations ${studentName}! Your Certificate of Completion for the Marlion Technologies Winter Internship 2025 is ready. Download it at intern.marliontech.com/certificate`,
  };
}
