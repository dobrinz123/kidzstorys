import { v } from "convex/values";
import { action } from "./_generated/server";

// Send password reset email using Resend
export const sendPasswordResetEmail = action({
  args: {
    to: v.string(),
    resetCode: v.string(),
    language: v.optional(v.union(v.literal("en"), v.literal("ro"), v.literal("it"))),
  },
  handler: async (ctx, args) => {
    const resendApiKey = process.env.RESEND_API_KEY;

    if (!resendApiKey) {
      console.error("RESEND_API_KEY not configured");
      throw new Error("Email service not configured");
    }

    const lang = args.language || "ro";

    // Email templates per language
    const templates = {
      ro: {
        subject: "Codul tău de resetare a parolei - Story Kids",
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="margin: 0; padding: 0; background-color: #1a1a3e; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
            <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
              <div style="background: linear-gradient(135deg, #2a2a5e 0%, #1a1a3e 100%); border-radius: 24px; padding: 40px; text-align: center; border: 1px solid rgba(255,255,255,0.1);">
                <h1 style="color: #ffffff; font-size: 28px; margin: 0 0 16px 0;">Story Kids</h1>
                <p style="color: rgba(255,255,255,0.8); font-size: 16px; margin: 0 0 32px 0;">Ai solicitat resetarea parolei</p>

                <div style="background: rgba(124, 77, 255, 0.15); border: 2px solid #7C4DFF; border-radius: 16px; padding: 24px; margin: 0 0 32px 0;">
                  <p style="color: rgba(255,255,255,0.6); font-size: 12px; margin: 0 0 8px 0; text-transform: uppercase; letter-spacing: 1px;">Codul tău de resetare</p>
                  <p style="color: #ffffff; font-size: 36px; font-weight: bold; letter-spacing: 8px; margin: 0;">${args.resetCode}</p>
                </div>

                <p style="color: rgba(255,255,255,0.6); font-size: 14px; margin: 0 0 8px 0;">Acest cod expiră în 30 de minute.</p>
                <p style="color: rgba(255,255,255,0.5); font-size: 12px; margin: 0;">Dacă nu ai solicitat resetarea parolei, ignoră acest email.</p>
              </div>

              <p style="color: rgba(255,255,255,0.4); font-size: 12px; text-align: center; margin-top: 24px;">
                © ${new Date().getFullYear()} Story Kids. Toate drepturile rezervate.
              </p>
            </div>
          </body>
          </html>
        `,
      },
      en: {
        subject: "Your Password Reset Code - Story Kids",
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="margin: 0; padding: 0; background-color: #1a1a3e; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
            <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
              <div style="background: linear-gradient(135deg, #2a2a5e 0%, #1a1a3e 100%); border-radius: 24px; padding: 40px; text-align: center; border: 1px solid rgba(255,255,255,0.1);">
                <h1 style="color: #ffffff; font-size: 28px; margin: 0 0 16px 0;">Story Kids</h1>
                <p style="color: rgba(255,255,255,0.8); font-size: 16px; margin: 0 0 32px 0;">You requested a password reset</p>

                <div style="background: rgba(124, 77, 255, 0.15); border: 2px solid #7C4DFF; border-radius: 16px; padding: 24px; margin: 0 0 32px 0;">
                  <p style="color: rgba(255,255,255,0.6); font-size: 12px; margin: 0 0 8px 0; text-transform: uppercase; letter-spacing: 1px;">Your Reset Code</p>
                  <p style="color: #ffffff; font-size: 36px; font-weight: bold; letter-spacing: 8px; margin: 0;">${args.resetCode}</p>
                </div>

                <p style="color: rgba(255,255,255,0.6); font-size: 14px; margin: 0 0 8px 0;">This code expires in 30 minutes.</p>
                <p style="color: rgba(255,255,255,0.5); font-size: 12px; margin: 0;">If you didn't request a password reset, please ignore this email.</p>
              </div>

              <p style="color: rgba(255,255,255,0.4); font-size: 12px; text-align: center; margin-top: 24px;">
                © ${new Date().getFullYear()} Story Kids. All rights reserved.
              </p>
            </div>
          </body>
          </html>
        `,
      },
      it: {
        subject: "Il tuo codice di reset password - Story Kids",
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="margin: 0; padding: 0; background-color: #1a1a3e; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
            <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
              <div style="background: linear-gradient(135deg, #2a2a5e 0%, #1a1a3e 100%); border-radius: 24px; padding: 40px; text-align: center; border: 1px solid rgba(255,255,255,0.1);">
                <h1 style="color: #ffffff; font-size: 28px; margin: 0 0 16px 0;">Story Kids</h1>
                <p style="color: rgba(255,255,255,0.8); font-size: 16px; margin: 0 0 32px 0;">Hai richiesto il reset della password</p>

                <div style="background: rgba(124, 77, 255, 0.15); border: 2px solid #7C4DFF; border-radius: 16px; padding: 24px; margin: 0 0 32px 0;">
                  <p style="color: rgba(255,255,255,0.6); font-size: 12px; margin: 0 0 8px 0; text-transform: uppercase; letter-spacing: 1px;">Il tuo codice di reset</p>
                  <p style="color: #ffffff; font-size: 36px; font-weight: bold; letter-spacing: 8px; margin: 0;">${args.resetCode}</p>
                </div>

                <p style="color: rgba(255,255,255,0.6); font-size: 14px; margin: 0 0 8px 0;">Questo codice scade tra 30 minuti.</p>
                <p style="color: rgba(255,255,255,0.5); font-size: 12px; margin: 0;">Se non hai richiesto il reset della password, ignora questa email.</p>
              </div>

              <p style="color: rgba(255,255,255,0.4); font-size: 12px; text-align: center; margin-top: 24px;">
                © ${new Date().getFullYear()} Story Kids. Tutti i diritti riservati.
              </p>
            </div>
          </body>
          </html>
        `,
      },
    };

    const template = templates[lang as keyof typeof templates] || templates.ro;

    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${resendApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          // Use custom domain from env or fallback to Resend dev domain
          from: `Story Kids <${process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev"}>`,
          to: [args.to],
          subject: template.subject,
          html: template.html,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        console.error("Resend error:", error);
        throw new Error("Failed to send email");
      }

      const result = await response.json();
      return { success: true, messageId: result.id };
    } catch (error) {
      console.error("Email send error:", error);
      throw new Error("Failed to send email");
    }
  },
});
