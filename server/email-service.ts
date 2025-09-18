import nodemailer from 'nodemailer';

// For storing the test account info
let testAccount: any = null;
// Create a test SMTP service for development if no real credentials are provided
let transporter: nodemailer.Transporter | null = null;
let usingTestAccount: boolean = false;

// Function to create a test email account
async function createTestEmailAccount() {
  try {
    // Use ethereal.email for testing
    console.log('Setting up test email account for password reset emails');
    
    // Create a test account
    testAccount = await nodemailer.createTestAccount();
    
    // Create test transporter
    transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false, // true for 465, false for other ports
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });
    
    usingTestAccount = true;
    console.log('Test email account generated:', testAccount.user);
    console.log('Preview URL: https://ethereal.email');
    
    return transporter;
  } catch (error) {
    console.error('Failed to create test email account:', error);
    return null;
  }
}

// Function to create a production transporter with provided credentials
function createProductionTransporter() {
  try {
    // Try Gmail first if credentials are available
    if (process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) {
      console.log('Setting up Gmail SMTP for email notifications');
      
      const gmailTransporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.GMAIL_USER,
          pass: process.env.GMAIL_APP_PASSWORD,
        },
      });
      
      console.log('Using Gmail SMTP for sending emails');
      usingTestAccount = false;
      return gmailTransporter;
    }
    
    // Fallback to cPanel credentials
    const emailHost = 'mail.member.beanstalker.com.au';
    const emailPort = 587;
    const emailUser = 'info@member.beanstalker.com.au';
    const emailPass = 'BBBnnnMMM!!!123';
    const secure = false; // Set to false for port 587
    
    console.log(`Setting up SMTP with ${emailHost}:${emailPort} (secure: ${secure})`);
    
    // Use real SMTP configuration with hardcoded cPanel credentials
    const productionTransporter = nodemailer.createTransport({
      host: emailHost,
      port: emailPort,
      secure: secure, // true for 465, false for other ports
      auth: {
        user: emailUser,
        pass: emailPass,
      },
      tls: {
        // Do not fail on invalid certs
        rejectUnauthorized: false
      },
      // Add timeout
      connectionTimeout: 15000, // 15 seconds
      // Debug options for troubleshooting 
      debug: true, // Enable debugging
      logger: true, // Log to console
    });
    
    console.log('Using provided email credentials for sending emails');
    usingTestAccount = false;
    return productionTransporter;
  } catch (error) {
    console.error('Failed to create production email transporter:', error);
    return null;
  }
}

// Initialize the transporter based on available credentials
if (process.env.EMAIL_HOST && process.env.EMAIL_USER && process.env.EMAIL_PASS) {
  transporter = createProductionTransporter();
} else {
  // Create test account
  createTestEmailAccount();
}

export interface SendEmailOptions {
  to: string;
  subject: string;
  text?: string;
  html?: string;
}

export async function sendEmail(options: SendEmailOptions): Promise<boolean> {
  try {
    // If no transporter is available, try to set one up
    if (!transporter) {
      if (process.env.EMAIL_HOST && process.env.EMAIL_USER && process.env.EMAIL_PASS) {
        transporter = createProductionTransporter();
      } else {
        transporter = await createTestEmailAccount();
      }
      
      // If still no transporter, fail
      if (!transporter) {
        console.error('Failed to initialize email transporter');
        return false;
      }
    }
    
    // Setup mail options with properly formatted from address
    let fromEmail = 'Bean Stalker <info@member.beanstalker.com.au>';
    
    // No need to reformat as it's already in the correct format
    
    const mailOptions = {
      from: fromEmail,
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html,
    };
    
    // Attempt to send email with production transporter
    try {
      const info = await transporter.sendMail(mailOptions);
      console.log('Email sent:', info.messageId);
      
      // If using ethereal.email, log the preview URL
      if (usingTestAccount && info && info.messageId) {
        console.log('Test email preview URL:', nodemailer.getTestMessageUrl(info));
      }
      
      return true;
    } catch (productionError) {
      console.error('Error sending email with configured transporter:', productionError);
      
      // If we're already using a test account or failed to send with production account
      if (usingTestAccount) {
        throw productionError; // Re-throw since we're already using a test account
      }
      
      // Fall back to test account if production sending fails
      console.log('Falling back to test email account...');
      transporter = await createTestEmailAccount();
      
      if (!transporter) {
        throw new Error('Failed to create fallback test email account');
      }
      
      // Try again with test account
      const testInfo = await transporter.sendMail(mailOptions);
      console.log('Email sent using fallback test account:', testInfo.messageId);
      console.log('Test email preview URL:', nodemailer.getTestMessageUrl(testInfo));
      
      return true;
    }
  } catch (error) {
    console.error('Error sending email:', error);
    return false;
  }
}

export async function sendPasswordResetEmail(email: string, resetToken: string): Promise<boolean> {
  // Use the current domain name if deployed, or localhost for development
  const baseUrl = 'https://member.beanstalker.com.au';
  const resetUrl = `${baseUrl}/auth?resetToken=${resetToken}`;
  
  const emailText = 
    `Hello,\n\n` +
    `You are receiving this email because you (or someone else) has requested the reset of the password for your Bean Stalker account.\n\n` +
    `Please click on the following link, or paste it into your browser to complete the process:\n\n` +
    `${resetUrl}\n\n` +
    `If you did not request this, please ignore this email and your password will remain unchanged.\n\n` +
    `The link will expire in 1 hour.\n\n` +
    `Thank you,\n` +
    `Bean Stalker Team`;
    
  const emailHtml = 
    `<p>Hello,</p>` +
    `<p>You are receiving this email because you (or someone else) has requested the reset of the password for your Bean Stalker account.</p>` +
    `<p>Please click on the following link, or paste it into your browser to complete the process:</p>` +
    `<p><a href="${resetUrl}">${resetUrl}</a></p>` +
    `<p>If you did not request this, please ignore this email and your password will remain unchanged.</p>` +
    `<p>The link will expire in 1 hour.</p>` +
    `<p>Thank you,<br />Bean Stalker Team</p>`;
    
  return sendEmail({
    to: email,
    subject: 'Bean Stalker Password Reset',
    text: emailText,
    html: emailHtml
  });
}

export async function sendAppUpdateNotification(userEmails: string[], version: string): Promise<boolean> {
  if (!userEmails || userEmails.length === 0) {
    console.log('No user emails provided for app update notification');
    return false;
  }

  const appUrl = 'https://member.beanstalker.com.au';
  
  const emailText = 
    `Great news! The Bean Stalker coffee app has been updated to version ${version}.\n\n` +
    `New features and improvements are now available. If you have the app installed on your phone, it will update automatically the next time you open it.\n\n` +
    `Open the app now: ${appUrl}\n\n` +
    `Thank you for using Bean Stalker!\n\n` +
    `Bean Stalker Team`;
    
  const emailHtml = 
    `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f9f9f9; padding: 20px;">` +
    `<div style="background-color: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">` +
    `<div style="text-align: center; margin-bottom: 30px;">` +
    `<h1 style="color: #124430; margin: 0; font-size: 28px;">Bean Stalker</h1>` +
    `<p style="color: #666; margin: 5px 0 0 0; font-size: 14px;">Your Favorite Coffee Experience</p>` +
    `</div>` +
    `<div style="background-color: #124430; color: white; padding: 20px; border-radius: 6px; text-align: center; margin-bottom: 25px;">` +
    `<h2 style="margin: 0 0 10px 0; font-size: 24px;">App Updated!</h2>` +
    `<p style="margin: 0; font-size: 16px;">Version ${version} is now available</p>` +
    `</div>` +
    `<div style="margin-bottom: 25px;">` +
    `<h3 style="color: #124430; margin-bottom: 15px;">What's New:</h3>` +
    `<ul style="color: #333; line-height: 1.6; padding-left: 20px;">` +
    `<li>Enhanced performance and stability</li>` +
    `<li>Improved user interface</li>` +
    `<li>Bug fixes and optimizations</li>` +
    `<li>Better notification system</li>` +
    `</ul>` +
    `</div>` +
    `<div style="text-align: center; margin: 30px 0;">` +
    `<a href="${appUrl}" style="background-color: #124430; color: white; padding: 15px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold; font-size: 16px;">Open Bean Stalker App</a>` +
    `</div>` +
    `<div style="background-color: #f8f9fa; padding: 15px; border-radius: 6px; margin-bottom: 20px;">` +
    `<p style="margin: 0; color: #666; font-size: 14px;">` +
    `<strong>Already installed?</strong> Your app will update automatically the next time you open it. ` +
    `If you don't see the update, try closing and reopening the app.` +
    `</p>` +
    `</div>` +
    `<hr style="margin: 25px 0; border: none; border-top: 1px solid #eee;">` +
    `<div style="text-align: center;">` +
    `<p style="color: #666; font-size: 12px; margin: 0;">` +
    `Thank you for choosing Bean Stalker Coffee<br>` +
    `Questions? Contact us through the app or visit our store.` +
    `</p>` +
    `</div>` +
    `</div>` +
    `</div>`;

  console.log(`Sending app update notification to ${userEmails.length} users for version ${version}`);
  
  return sendEmail({
    to: userEmails.join(', '),
    subject: 'Bean Stalker App Updated - New Features Available!',
    text: emailText,
    html: emailHtml
  });
}