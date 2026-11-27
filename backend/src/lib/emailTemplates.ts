/**
 * Email templates for antic-curtain — "All Service Mail".
 * All templates are bilingual (Persian + English) and return both text and HTML.
 */

import { mailFromAddress } from "./mailer.js";

const SITE_NAME = "پرده آنتیک";
const SITE_NAME_EN = "Antic Curtain";
const FRONTEND_URL = process.env.FRONTEND_URL || process.env.CORS_ORIGIN || "http://localhost:3000";

interface TemplateResult {
  subject: string;
  text: string;
  html: string;
}

/* ------------------------------------------------------------------ */
/* Helper: simple HTML wrapper                                        */
/* ------------------------------------------------------------------ */

function wrapHtml(title: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="fa" dir="rtl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${title}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Vazirmatn:wght@400;700&display=swap');
  body { font-family: 'Vazirmatn', Tahoma, Arial, sans-serif; background: #f5f5f5; margin: 0; padding: 0; color: #1a1a1a; }
  .container { max-width: 600px; margin: 24px auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.08); }
  .header { background: #0B0B0B; color: #ffffff; padding: 28px 24px; text-align: center; }
  .header h1 { margin: 0; font-size: 24px; font-weight: 700; letter-spacing: -0.5px; }
  .header p { margin: 6px 0 0; font-size: 14px; opacity: 0.8; }
  .content { padding: 32px 24px; line-height: 1.7; }
  .content h2 { color: #0B0B0B; font-size: 20px; margin-top: 0; }
  .content p { margin: 16px 0; }
  .btn { display: inline-block; background: #0B0B0B; color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 700; margin: 16px 0; }
  .footer { padding: 24px; background: #f5f5f5; font-size: 13px; color: #666; text-align: center; border-top: 1px solid #eaeaea; }
  .footer a { color: #0B0B0B; text-decoration: none; }
  .highlight { color: #0B0B0B; font-weight: 700; }
  @media (max-width: 480px) { .container { margin: 12px auto; } .content { padding: 20px 16px; } }
</style>
</head>
<body>
<div class="container">
  <div class="header">
    <h1>${SITE_NAME}</h1>
    <p>${SITE_NAME_EN} — Quality Curtains & Accessories</p>
  </div>
  <div class="content">
    ${body}
  </div>
  <div class="footer">
    ${SITE_NAME} &bull; <a href="${FRONTEND_URL}">${FRONTEND_URL}</a> &bull;
    <span>اگر سوالی دارید، با ما در ارتباط باشید.</span>
  </div>
</div>
</body>
</html>`;
}

function btn(text: string, url: string): string {
  return `<a href="${url}" class="btn">${text}</a>`;
}

/* ------------------------------------------------------------------ */
/* 1. Welcome email (after registration)                              */
/* ------------------------------------------------------------------ */

export function welcomeEmail(to: string, fullName?: string): TemplateResult {
  const name = fullName || "کاربر عزیز";
  const subject = "خوش آمدید به پرده آنتیک — Welcome to Antic Curtain";
  const text = [
    `سلام ${name}،`,
    "",
    `به ${SITE_NAME} خوش آمدید. حساب شما با موفقیت ساخته شد.`,
    "اکنون می‌توانید:",
  ].join("\n");

  const html = wrapHtml(subject, `
    <h2>سلام ${name}،</h2>
    <p>به <strong>${SITE_NAME}</strong> خوش آمدید. حساب شما با موفقیت ساخته شد.</p>
    <p>اکنون می‌توانید:</p>
    <ul>
      <li>دسته‌بندی و مدل‌های پرده را مشاهده کنید</li>
      <li>محصولات اکسسوری را در فروشگاه explored کنید</li>
      <li>برای سفارش تخصصی، از فرم مشاوره استفاده کنید</li>
    </ul>
    ${btn("بازدید از فروشگاه", `${FRONTEND_URL}/shop`)}
  `);

  return { subject, text, html };
}

/* ------------------------------------------------------------------ */
/* 2. Password reset email                                            */
/* ------------------------------------------------------------------ */

export function passwordResetEmail(to: string, resetUrl: string): TemplateResult {
  const subject = "بازیابی رمز عبور — پرده آنتیک";
  const text = [
    "سلام،",
    "",
    "برای بازنشانی رمز عبور حساب خود روی لینک زیر کلیک کنید:",
    resetUrl,
    "",
    "این لینک ۳۰ دقیقه معتبر است و فقط یک‌بار قابل استفاده است.",
    "اگر شما این درخواست را ثبت نکرده‌اید، این ایمیل را نادیده بگیرید.",
    "",
    "— تیم پشتیبانی پرده آنتیک",
  ].join("\n");

  const html = wrapHtml(subject, `
    <h2>بازیابی رمز عبور</h2>
    <p>سلام،</p>
    <p>برای بازنشانی رمز عبور حساب خود در <strong>${SITE_NAME}</strong> روی دکمه زیر کلیک کنید:</p>
    ${btn("بازنشانی رمز عبور", resetUrl)}
    <p><small>این لینک ۳۰ دقیقه معتبر است و فقط یک‌بار قابل استفاده است.</small></p>
    <p><small>اگر شما این درخواست را ثبت نکرده‌اید، این ایمیل را نادیده بگیرید.</small></p>
  `);

  return { subject, text, html };
}

/* ------------------------------------------------------------------ */
/* 3. Password changed notification                                   */
/* ------------------------------------------------------------------ */

export function passwordChangedEmail(to: string, fullName?: string): TemplateResult {
  const name = fullName || "کاربر عزیز";
  const subject = "رمز عبور شما تغییر کرد — پرده آنتیک";
  const text = [
    `سلام ${name}،`,
    "",
    "رمز عبور حساب شما در پرده آنتیک با موفقیت تغییر کرد.",
    "اگر شما این تغییر را انجام نداده‌اید، لطفاً به سرعت با پشتیبانی تماس بگیرید و رمز خود را بازنشانی کنید.",
    "",
    "— تیم پشتیبانی پرده آنتیک",
  ].join("\n");

  const html = wrapHtml(subject, `
    <h2>رمز عبور تغییر کرد</h2>
    <p>سلام ${name}،</p>
    <p>رمز عبور حساب شما در <strong>${SITE_NAME}</strong> با موفقیت تغییر کرد.</p>
    <p>اگر شما این تغییر را انجام نداده‌اید، لطفاً به سرعت با پشتیبانی تماس بگیرید و رمز خود را بازنشانی کنید.</p>
  `);

  return { subject, text, html };
}


/* ------------------------------------------------------------------ */
/* 7. Consultation request confirmation (to customer)                 */
/* ------------------------------------------------------------------ */

export function consultationConfirmationEmail(
  to: string,
  fullName: string,
  messageId: string,
): TemplateResult {
  const subject = "دریافت درخواست مشاوره — پرده آنتیک";
  const text = [
    `سلام ${fullName}،`,
    "",
    "درخواست مشاوره شما با موفقیت دریافت شد.",
    `شماره درخواست: ${messageId.slice(-8)}`,
    "",
    "تیم متخصصان پرده آنتیک به زй 무엇 час با شما تماس می‌گیرند.",
    "",
    "— تیم پشتیبانی پرده آنتیک",
  ].join("\n");

  const html = wrapHtml(subject, `
    <h2>درخواست مشاوره دریافت شد</h2>
    <p>سلام ${fullName}،</p>
    <p>درخواست مشاوره شما با موفقیت دریافت شد.</p>
    <p><strong>شماره درخواست:</strong> ${messageId.slice(-8)}</p>
    <p>تیم متخصصان <strong>${SITE_NAME}</strong> به ز速く با شما تماس می‌گیرند.</p>
  `);

  return { subject, text, html };
}

/* ------------------------------------------------------------------ */
/* 8. Consultation request admin notification (to admin)              */
/* ------------------------------------------------------------------ */

export function consultationAdminEmail(
  adminEmail: string,
  fullName: string,
  phone: string,
  email: string | null,
  city: string | null,
  spaceType: string | null,
  message: string | null,
  messageId: string,
): TemplateResult {
  const subject = "درخواست مشاوره جدید — پرده آنتیک";
  const customerEmail = email || "ثبت نشده";
  const text = [
    "درخواست مشاوره جدید ثبت شد:",
    "",
    `نام: ${fullName}`,
    `تلفن: ${phone}`,
    `ایمیل: ${customerEmail}`,
    `شهر: ${city || "ثبت نشده"}`,
    `نوع فضا: ${spaceType || "ثبت نشده"}`,
    `پیام: ${message || "ثبت نشده"}`,
    `شماره درخواست: ${messageId.slice(-8)}`,
    "",
    "از پنل مدیریت می‌توانید وضعیت را بررسی کنید.",
  ].join("\n");

  const html = wrapHtml(subject, `
    <h2>📋 درخواست مشاوره جدید</h2>
    <table style="width:100%; border-collapse: collapse; margin: 16px 0;">
      <tr><td style="padding:8px; border-bottom:1px solid #eee; font-weight:700;">نام:</td><td style="padding:8px; border-bottom:1px solid #eee;">${fullName}</td></tr>
      <tr><td style="padding:8px; border-bottom:1px solid #eee; font-weight:700;">تلفن:</td><td style="padding:8px; border-bottom:1px solid #eee;">${phone}</td></tr>
      <tr><td style="padding:8px; border-bottom:1px solid #eee; font-weight:700;">ایمیل:</td><td style="padding:8px; border-bottom:1px solid #eee;">${customerEmail}</td></tr>
      <tr><td style="padding:8px; border-bottom:1px solid #eee; font-weight:700;">شهر:</td><td style="padding:8px; border-bottom:1px solid #eee;">${city || "ثبت نشده"}</td></tr>
      <tr><td style="padding:8px; border-bottom:1px solid #eee; font-weight:700;">نوع فضا:</td><td style="padding:8px; border-bottom:1px solid #eee;">${spaceType || "ثبت نشده"}</td></tr>
      <tr><td style="padding:8px; border-bottom:1px solid #eee; font-weight:700;">پیام:</td><td style="padding:8px; border-bottom:1px solid #eee;">${message || "ثبت نشده"}</td></tr>
      <tr><td style="padding:8px; border-bottom:1px solid #eee; font-weight:700;">شماره درخواست:</td><td style="padding:8px; border-bottom:1px solid #eee;">${messageId.slice(-8)}</td></tr>
    </table>
    <p>از <a href="${FRONTEND_URL}/admin/requests">پنل مدیریت</a> می‌توانید وضعیت را بررسی کنید.</p>
  `);

  return { subject, text, html };
}

/* ------------------------------------------------------------------ */
/* 9. Email change notification                                       */
/* ------------------------------------------------------------------ */

export function emailChangedEmail(to: string, newEmail: string): TemplateResult {
  const subject = "ایمیل شما تغییر کرد — پرده آنتیک";
  const text = [
    "سلام،",
    "",
    "آدرس ایمیل حساب شما در پرده آنتیک به آدرس زیر تغییر کرد:",
    newEmail,
    "",
    "اگر شما این تغییر را انجام نداده‌اید، لطفاً به سرعت با پشتیبانی تماس بگیرید.",
    "",
    "— تیم پشتیبانی پرده آنتیک",
  ].join("\n");

  const html = wrapHtml(subject, `
    <h2>ایمیل تغییر کرد</h2>
    <p>سلام،</p>
    <p>آدرس ایمیل حساب شما در <strong>${SITE_NAME}</strong> به آدرس زیر تغییر کرد:</p>
    <p><strong>${newEmail}</strong></p>
    <p>اگر شما این تغییر را انجام نداده‌اید، لطفاً به سرعت با پشتیبانی تماس بگیرید.</p>
  `);

  return { subject, text, html };
}
