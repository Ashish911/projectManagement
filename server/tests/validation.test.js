import { validate } from "../validation/validate.js";
import { createUserSchema, updateProfileSchema, updateUserSchema } from "../validation/schema.js";

const ID = "648a1b2c3d4e5f6a7b8c9d0e";
const base = { name: "Mina Lama", email: "mina@x.io", gender: "FEMALE" };

describe("phone numbers (PROF-03)", () => {
  it.each([
    ["Australia", "+61 412 345 678", "+61412345678"],
    ["New Zealand", "+64 21 123 4567", "+64211234567"],
    ["United States", "+1 (201) 555-0123", "+12015550123"],
    ["Nepal", "+977 980-1234567", "+9779801234567"],
  ])("🟢 %s numbers are stored in E.164", (_, input, e164) => {
    expect(validate(updateProfileSchema, { number: input }).number).toBe(e164);
    expect(validate(createUserSchema, { ...base, number: input }).number).toBe(e164);
    expect(validate(updateUserSchema, { id: ID, number: input }).number).toBe(e164);
  });

  it.each([
    ["too short for Australia", "+61 4123"],
    ["a country we don't support", "+44 7911 123456"],
    ["no country code", "0412 345 678"],
    ["letters", "+61 abc"],
  ])("🔴 rejects %s", (_, input) => {
    expect(() => validate(updateProfileSchema, { number: input })).toThrow(
      "Enter a valid phone number for Australia, New Zealand, the United States or Nepal",
    );
  });
});

describe("profile fields (PROF-02)", () => {
  it("🔴 a blank name is refused", () => {
    expect(() => validate(updateProfileSchema, { name: "   " })).toThrow("Name is required");
  });

  it("🔴 a name with digits or symbols is refused", () => {
    expect(() => validate(updateProfileSchema, { name: "Mina <3" })).toThrow("Use letters, spaces, apostrophes, dots or hyphens");
  });

  it("🔴 a date of birth in the future is refused", () => {
    expect(() => validate(updateProfileSchema, { dob: "2999-01-01" })).toThrow("Date of birth can’t be in the future");
  });

  it("🟢 accented names and hyphens are fine", () => {
    expect(validate(updateProfileSchema, { name: "  José O'Neil-Rai " }).name).toBe("José O'Neil-Rai");
  });
});
