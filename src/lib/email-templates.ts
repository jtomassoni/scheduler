/**
 * Email notification templates
 * These templates can be used with any email service provider
 */

export interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
}

export function getShiftAssignedTemplate(data: {
  userName: string;
  venueName: string;
  date: string;
  startTime: string;
  endTime: string;
  shiftUrl: string;
}): EmailTemplate {
  return {
    subject: `New Shift Assignment - ${data.venueName}`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #2563eb; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
            .content { background-color: #f9fafb; padding: 20px; border-radius: 0 0 8px 8px; }
            .button { display: inline-block; padding: 12px 24px; background-color: #2563eb; color: white; text-decoration: none; border-radius: 6px; margin-top: 20px; }
            .details { background-color: white; padding: 15px; border-radius: 6px; margin: 15px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>New Shift Assignment</h1>
            </div>
            <div class="content">
              <p>Hi ${data.userName},</p>
              <p>You have been assigned to a new shift:</p>
              <div class="details">
                <p><strong>Venue:</strong> ${data.venueName}</p>
                <p><strong>Date:</strong> ${new Date(data.date).toLocaleDateString()}</p>
                <p><strong>Time:</strong> ${data.startTime} - ${data.endTime}</p>
              </div>
              <a href="${data.shiftUrl}" class="button">View Shift Details</a>
            </div>
          </div>
        </body>
      </html>
    `,
    text: `
Hi ${data.userName},

You have been assigned to a new shift:

Venue: ${data.venueName}
Date: ${new Date(data.date).toLocaleDateString()}
Time: ${data.startTime} - ${data.endTime}

View shift details: ${data.shiftUrl}
    `,
  };
}

export function getTradeProposedTemplate(data: {
  receiverName: string;
  proposerName: string;
  venueName: string;
  date: string;
  tradeUrl: string;
}): EmailTemplate {
  return {
    subject: `Shift Trade Proposed - ${data.venueName}`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #f59e0b; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
            .content { background-color: #f9fafb; padding: 20px; border-radius: 0 0 8px 8px; }
            .button { display: inline-block; padding: 12px 24px; background-color: #f59e0b; color: white; text-decoration: none; border-radius: 6px; margin-top: 20px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Shift Trade Proposed</h1>
            </div>
            <div class="content">
              <p>Hi ${data.receiverName},</p>
              <p><strong>${data.proposerName}</strong> wants to trade a shift with you:</p>
              <p><strong>Venue:</strong> ${data.venueName}</p>
              <p><strong>Date:</strong> ${new Date(data.date).toLocaleDateString()}</p>
              <a href="${data.tradeUrl}" class="button">Review Trade Proposal</a>
            </div>
          </div>
        </body>
      </html>
    `,
    text: `
Hi ${data.receiverName},

${data.proposerName} wants to trade a shift with you:

Venue: ${data.venueName}
Date: ${new Date(data.date).toLocaleDateString()}

Review trade proposal: ${data.tradeUrl}
    `,
  };
}

export function getTipsPublishedTemplate(data: {
  userName: string;
  venueName: string;
  date: string;
  tipAmount: string;
  tipsUrl: string;
}): EmailTemplate {
  return {
    subject: `Tips Published - ${data.venueName}`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #10b981; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
            .content { background-color: #f9fafb; padding: 20px; border-radius: 0 0 8px 8px; }
            .button { display: inline-block; padding: 12px 24px; background-color: #10b981; color: white; text-decoration: none; border-radius: 6px; margin-top: 20px; }
            .amount { font-size: 24px; font-weight: bold; color: #10b981; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Tips Published</h1>
            </div>
            <div class="content">
              <p>Hi ${data.userName},</p>
              <p>Tips for your shift have been published:</p>
              <p><strong>Venue:</strong> ${data.venueName}</p>
              <p><strong>Date:</strong> ${new Date(data.date).toLocaleDateString()}</p>
              <p class="amount">$${data.tipAmount}</p>
              <a href="${data.tipsUrl}" class="button">View All Tips</a>
            </div>
          </div>
        </body>
      </html>
    `,
    text: `
Hi ${data.userName},

Tips for your shift have been published:

Venue: ${data.venueName}
Date: ${new Date(data.date).toLocaleDateString()}
Amount: $${data.tipAmount}

View all tips: ${data.tipsUrl}
    `,
  };
}

export function getAvailabilityReminderTemplate(data: {
  userName: string;
  venueName: string;
  deadlineDate: string;
  daysUntilDeadline: number;
  availabilityUrl: string;
}): EmailTemplate {
  return {
    subject: `Availability Reminder - ${data.daysUntilDeadline} Day${data.daysUntilDeadline !== 1 ? 's' : ''} Until Deadline`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #f59e0b; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
            .content { background-color: #f9fafb; padding: 20px; border-radius: 0 0 8px 8px; }
            .button { display: inline-block; padding: 12px 24px; background-color: #f59e0b; color: white; text-decoration: none; border-radius: 6px; margin-top: 20px; }
            .warning { background-color: #fef3c7; padding: 15px; border-radius: 6px; margin: 15px 0; border-left: 4px solid #f59e0b; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Availability Reminder</h1>
            </div>
            <div class="content">
              <p>Hi ${data.userName},</p>
              <div class="warning">
                <p><strong>Reminder:</strong> You have ${data.daysUntilDeadline} day${data.daysUntilDeadline !== 1 ? 's' : ''} to submit your availability for ${data.venueName}.</p>
                <p><strong>Deadline:</strong> ${new Date(data.deadlineDate).toLocaleDateString()}</p>
              </div>
              <a href="${data.availabilityUrl}" class="button">Submit Availability</a>
            </div>
          </div>
        </body>
      </html>
    `,
    text: `
Hi ${data.userName},

Reminder: You have ${data.daysUntilDeadline} day${data.daysUntilDeadline !== 1 ? 's' : ''} to submit your availability for ${data.venueName}.

Deadline: ${new Date(data.deadlineDate).toLocaleDateString()}

Submit availability: ${data.availabilityUrl}
    `,
  };
}

export function getUserInviteTemplate(data: {
  userName: string;
  role: string;
  tempPassword: string;
  onboardingUrl: string;
}): EmailTemplate {
  return {
    subject: `Welcome to Scheduler - Complete Your Setup`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #2563eb; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
            .content { background-color: #f9fafb; padding: 20px; border-radius: 0 0 8px 8px; }
            .button { display: inline-block; padding: 12px 24px; background-color: #2563eb; color: white; text-decoration: none; border-radius: 6px; margin-top: 20px; }
            .credentials { background-color: white; padding: 15px; border-radius: 6px; margin: 15px 0; font-family: monospace; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Welcome to Scheduler!</h1>
            </div>
            <div class="content">
              <p>Hi ${data.userName},</p>
              <p>You've been invited to join as a <strong>${data.role}</strong>. Complete your setup to get started:</p>
              <div class="credentials">
                <p><strong>Temporary Password:</strong> ${data.tempPassword}</p>
                <p><em>Please change this password after your first login.</em></p>
              </div>
              <a href="${data.onboardingUrl}" class="button">Complete Setup</a>
            </div>
          </div>
        </body>
      </html>
    `,
    text: `
Hi ${data.userName},

You've been invited to join as a ${data.role}. Complete your setup to get started:

Temporary Password: ${data.tempPassword}
(Please change this password after your first login)

Complete setup: ${data.onboardingUrl}
    `,
  };
}
