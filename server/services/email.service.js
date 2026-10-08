// Sends transactional email through Bird (https://bird.com).
import { BirdClient } from "@messagebird/sdk";
import logger from "../config/logger.js";

let client = null; // Created lazily on first send

/** Returns a shared Bird client, or null if BIRD_API_KEY is not configured. */
const getClient = () => {
  if (!process.env.BIRD_API_KEY) return null;
  client ??= new BirdClient({ apiKey: process.env.BIRD_API_KEY });
  return client;
};

/** Outbound email used by other services. */
export const EmailService = {
  /**
   * Emails a password-reset link.
   * @param {string} to       Recipient email address.
   * @param {string} resetUrl Link containing the one-time reset token.
   * @returns {Promise<boolean>} True if Bird accepted the message, false if email is not configured.
   * @throws {Error} If Bird rejects the request.
   */
  async sendPasswordReset(to, resetUrl) {
    const bird = getClient();
    if (!bird) {
      logger.error("BIRD_API_KEY is not set; password reset email not sent");
      return false;
    }

    const msg = await bird.email.send({
      from: {
        email: process.env.EMAIL_FROM || "onboarding@messagebird.dev",
        name: "ProjoMan",
      },
      to: [to],
      subject: "Reset your ProjoMan password",
      html: `
        <p>We received a request to reset your ProjoMan password.</p>
        <p><a href="${resetUrl}">Reset your password</a></p>
        <p>This link expires in 1 hour. If you did not request a reset, you can ignore this email.</p>
      `,
    });

    logger.info({ emailId: msg.id, status: msg.status }, "Password reset email sent");
    return true;
  },

  /**
   * Emails an invitation link so a new user can set their own password.
   * @param {string} to        Recipient email address.
   * @param {string} name      Recipient's name, used in the greeting.
   * @param {string} inviteUrl Link containing the one-time token.
   * @returns {Promise<boolean>} True if Bird accepted the message, false if email is not configured.
   * @throws {Error} If Bird rejects the request.
   */
  async sendInvite(to, name, inviteUrl) {
    const bird = getClient();
    if (!bird) {
      logger.error("BIRD_API_KEY is not set; invite email not sent");
      return false;
    }

    const msg = await bird.email.send({
      from: {
        email: process.env.EMAIL_FROM || "onboarding@messagebird.dev",
        name: "ProjoMan",
      },
      to: [to],
      subject: "You've been invited to ProjoMan",
      html: `
        <p>Hi ${name.replace(/[<>&"]/g, "")},</p>
        <p>You've been invited to ProjoMan. Choose a password to get started.</p>
        <p><a href="${inviteUrl}">Set your password</a></p>
        <p>This link expires in 48 hours.</p>
      `,
    });

    logger.info({ emailId: msg.id, status: msg.status }, "Invite email sent");
    return true;
  },
};
