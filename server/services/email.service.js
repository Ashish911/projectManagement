// Sends transactional email: over SMTP when SMTP_HOST is set (e.g. the Mailpit dev catcher), otherwise through Bird (https://bird.com).
import { BirdClient } from "@messagebird/sdk";
import nodemailer from "nodemailer";
import logger from "../config/logger.js";

let bird = null; // Created lazily on first send
let smtp = null;

/** Forgets the cached clients so the next send re-reads the env (tests). */
export const resetEmailTransport = () => {
  bird = null;
  smtp = null;
};

const FROM_NAME = "ProjoMan";
const fromEmail = () => process.env.EMAIL_FROM || "onboarding@messagebird.dev";

/**
 * Sends one HTML email through whichever transport is configured.
 * @returns {Promise<boolean>} True if the provider accepted it, false if no transport is configured.
 * @throws {Error} If the provider rejects the message.
 */
const send = async ({ to, subject, html, kind }) => {
  if (process.env.SMTP_HOST) {
    smtp ??= nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 1025),
      secure: false,
    });
    const info = await smtp.sendMail({
      from: `"${FROM_NAME}" <${fromEmail()}>`,
      to,
      subject,
      html,
    });
    logger.info(
      { emailId: info.messageId, transport: "smtp" },
      `${kind} email sent`,
    );
    return true;
  }
  if (process.env.BIRD_API_KEY) {
    bird ??= new BirdClient({ apiKey: process.env.BIRD_API_KEY });
    const msg = await bird.email.send({
      from: { email: fromEmail(), name: FROM_NAME },
      to: [to],
      subject,
      html,
    });
    logger.info(
      { emailId: msg.id, status: msg.status, transport: "bird" },
      `${kind} email sent`,
    );
    return true;
  }
  logger.error(
    `No email transport configured (set SMTP_HOST or BIRD_API_KEY); ${kind.toLowerCase()} email not sent`,
  );
  return false;
};

/** Outbound email used by other services. */
export const EmailService = {
  /**
   * Emails a password-reset link.
   * @param {string} to       Recipient email address.
   * @param {string} resetUrl Link containing the one-time reset token.
   * @returns {Promise<boolean>} True if the provider accepted it, false if no transport is configured.
   * @throws {Error} If the provider rejects the message.
   */
  async sendPasswordReset(to, resetUrl) {
    return send({
      to,
      kind: "Password reset",
      subject: "Reset your ProjoMan password",
      html: `
        <p>We received a request to reset your ProjoMan password.</p>
        <p><a href="${resetUrl}">Reset your password</a></p>
        <p>This link expires in 1 hour. If you did not request a reset, you can ignore this email.</p>
      `,
    });
  },

  /**
   * Emails an invitation link so a new user can set their own password.
   * @param {string} to        Recipient email address.
   * @param {string} name      Recipient's name, used in the greeting.
   * @param {string} inviteUrl Link containing the one-time token.
   * @returns {Promise<boolean>} True if the provider accepted it, false if no transport is configured.
   * @throws {Error} If the provider rejects the message.
   */
  async sendInvite(to, name, inviteUrl) {
    return send({
      to,
      kind: "Invite",
      subject: "You've been invited to ProjoMan",
      html: `
        <p>Hi ${name.replace(/[<>&"]/g, "")},</p>
        <p>You've been invited to ProjoMan. Choose a password to get started.</p>
        <p><a href="${inviteUrl}">Set your password</a></p>
        <p>This link expires in 48 hours.</p>
      `,
    });
  },
};
