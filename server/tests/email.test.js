import { jest } from "@jest/globals";

// ─── Mock functions ───────────────────────────────────────────────
const mockBirdSend = jest.fn();
const mockSmtpSend = jest.fn();
const mockCreateTransport = jest.fn(() => ({ sendMail: mockSmtpSend }));

// ─── Mock the modules ─────────────────────────────────────────────
jest.unstable_mockModule("@messagebird/sdk", () => ({
  BirdClient: jest.fn(() => ({ email: { send: mockBirdSend } })),
}));

jest.unstable_mockModule("nodemailer", () => ({
  default: { createTransport: mockCreateTransport },
}));

// ─── Import AFTER mocking ─────────────────────────────────────────
const { EmailService, resetEmailTransport } = await import("../services/email.service.js");

const ENV = { ...process.env };

beforeEach(() => {
  jest.clearAllMocks();
  process.env = { ...ENV };
  delete process.env.SMTP_HOST;
  delete process.env.BIRD_API_KEY;
  resetEmailTransport();
});

afterAll(() => {
  process.env = ENV;
});

describe("EmailService", () => {
  it("🟢 sends through SMTP when SMTP_HOST is set (dev mail catcher)", async () => {
    process.env.SMTP_HOST = "mailpit";
    process.env.SMTP_PORT = "1025";
    process.env.BIRD_API_KEY = "also-set";
    mockSmtpSend.mockResolvedValue({ messageId: "m1" });

    await expect(EmailService.sendInvite("a@x.io", "Ann", "http://app/reset?token=t")).resolves.toBe(true);

    expect(mockCreateTransport).toHaveBeenCalledWith(expect.objectContaining({ host: "mailpit", port: 1025 }));
    expect(mockSmtpSend).toHaveBeenCalledWith(expect.objectContaining({ to: "a@x.io", subject: "You've been invited to ProjoMan" }));
    expect(mockBirdSend).not.toHaveBeenCalled();
  });

  it("🟢 sends through Bird when only BIRD_API_KEY is set", async () => {
    process.env.BIRD_API_KEY = "key";
    mockBirdSend.mockResolvedValue({ id: "b1", status: "accepted" });

    await expect(EmailService.sendPasswordReset("a@x.io", "http://app/reset?token=t")).resolves.toBe(true);

    expect(mockBirdSend).toHaveBeenCalledWith(expect.objectContaining({ to: ["a@x.io"], subject: "Reset your ProjoMan password" }));
    expect(mockSmtpSend).not.toHaveBeenCalled();
  });

  it("🔴 returns false when no transport is configured", async () => {
    await expect(EmailService.sendInvite("a@x.io", "Ann", "http://app")).resolves.toBe(false);
    expect(mockBirdSend).not.toHaveBeenCalled();
    expect(mockSmtpSend).not.toHaveBeenCalled();
  });

  it("🔴 passes a provider rejection on to the caller", async () => {
    process.env.BIRD_API_KEY = "key";
    mockBirdSend.mockRejectedValue(new Error("Sends from the shared onboarding domain can only go to verified members"));

    await expect(EmailService.sendInvite("a@x.io", "Ann", "http://app")).rejects.toThrow("verified members");
  });
});
