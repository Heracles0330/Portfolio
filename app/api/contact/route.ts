import axios from 'axios';
import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

// Create and configure Nodemailer transporter
const transporter = nodemailer.createTransport({
  host: '142.251.167.109',
  port: 587,
  secure: false,
  requireTLS: true,
  auth: {
    user: process.env.EMAIL_ADDRESS,
    pass: process.env.GMAIL_PASSKEY,
  },
  tls: {
    ciphers: 'SSLv3',
    rejectUnauthorized: true
  },
  debug: true // This will help you see detailed connection logs
});

// Helper function to send a message via Telegram
async function sendTelegramMessage(token: string, chat_id: string, message: string) {
  const url = `https://api.telegram.org/bot${token}/sendMessage`;
  try {
    const res = await axios.post(url, {
      text: message,
      chat_id,
    });
    return res.data.ok;
  } catch (error: any) {
    console.error('Error sending Telegram message:', error.response?.data || error.message);
    return false;
  }
};

// HTML email template
const generateEmailTemplate = (name: string, email: string, userMessage: string) => `
  <div style="font-family: Arial, sans-serif; color: #333; padding: 20px; background-color: #f4f4f4;">
    <div style="max-width: 600px; margin: auto; background-color: #fff; padding: 20px; border-radius: 8px; box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);">
      <h2 style="color: #007BFF;">New Message Received</h2>
      <p><strong>Name:</strong> ${name}</p>
      <p><strong>Email:</strong> ${email}</p>
      <p><strong>Message:</strong></p>
      <blockquote style="border-left: 4px solid #007BFF; padding-left: 10px; margin-left: 0;">
        ${userMessage}
      </blockquote>
      <p style="font-size: 12px; color: #888;">Click reply to respond to the sender.</p>
    </div>
  </div>
`;

// Helper function to send an email via Nodemailer
async function sendEmail(payload: any, message: string) {
  const { name, email, message: userMessage } = payload;
  
  const mailOptions = {
    from: "Portfolio", 
    to: process.env.EMAIL_ADDRESS, 
    subject: `New Message From ${name}`, 
    text: message, 
    html: generateEmailTemplate(name, email, userMessage), 
    replyTo: email, 
  };
  
  try {
    await transporter.sendMail(mailOptions);
    return true;
  } catch (error: any) {
    console.error('Error while sending email:', error.message);
    return false;
  }
};

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json();
    const { name, email, message: userMessage } = payload;
    const token = process.env.TELEGRAM_BOT_TOKEN;
    const chat_id = process.env.TELEGRAM_CHAT_ID;

    // Validate environment variables
    if (!token || !chat_id) {
      return NextResponse.json({
        success: false,
        message: 'Telegram token or chat ID is missing.',
      }, { status: 400 });
    }

    const message = `From ${name}\nEmail: ${email}\n\n${userMessage}`;

    // Send Telegram message
    const telegramSuccess = await sendTelegramMessage(token, chat_id, message);


    if (telegramSuccess) {
      return NextResponse.json({
        success: true,
        message: 'Message sent to Telegram successfully!',
      }, { status: 200 });
    }

    return NextResponse.json({
      success: false,
      message: 'Failed to send message.',
    }, { status: 500 });
  } catch (error:any) {
    console.error('API Error:', error.message);
    return NextResponse.json({
      success: false,
      message: 'Server error occurred.',
    }, { status: 500 });
  }
};