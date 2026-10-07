import mongoose from "mongoose";

/**
 * Mongoose schema for a user account.
 * Passwords are stored as bcrypt hashes; hashing is done in UserService, not here.
 *
 * @typedef {import('mongoose').Document & {
 *   name: string,
 *   email: string,
 *   number: string,
 *   gender: "MALE" | "FEMALE" | "OTHERS",
 *   dob?: Date,
 *   password: string,
 *   role: "SUPER_ADMIN" | "CLIENT_ADMIN" | "USER",
 *   loginAttempts: number,
 *   lastFailedLogin: Date | null,
 *   resetToken: string | null,
 *   resetTokenExpiry: Date | null,
 * }} UserDocument
 */
const UserSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    // Access level; role checks are enforced in the service layer
    role: {
      type: String,
      enum: ["SUPER_ADMIN", "CLIENT_ADMIN", "USER"],
      default: "USER",
    },
    email: {
      type: String,
      unique: true,
      index: true,
      lowercase: true, // Normalised so lookups are case-insensitive
      required: true,
    },
    // Phone number, kept as a string to preserve leading zeros and "+"
    number: {
      type: String,
      required: true,
    },
    gender: {
      type: String,
      required: true,
      enum: ["MALE", "FEMALE", "OTHERS"],
    },
    dob: {
      type: Date,
    },
    password: {
      type: String, // bcrypt hash, never the plain-text password
      required: true,
    },
    // Failed-login tracking used to lock the account after repeated failures
    loginAttempts: {
      type: Number,
      default: 0,
    },
    lastFailedLogin: {
      type: Date,
      default: null,
    },
    // Password-reset token and its expiry; cleared once the reset succeeds
    resetToken: {
      type: String,
      default: null,
    },
    resetTokenExpiry: {
      type: Date,
      default: null,
    },
    // Set on every successful login; null means the user has never signed in
    lastLoginAt: {
      type: Date,
      default: null,
    },
    // Set when a super admin invites the user by email (the invite reuses resetToken)
    invitedAt: {
      type: Date,
      default: null,
    },
  },
  {
    // Expose `id` as a string and drop `_id`/`__v` when serialising
    toObject: {
      virtuals: true,
      transform: (_, ret) => {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
      },
    },
    toJSON: {
      virtuals: true,
      transform: (_, ret) => {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
      },
    },
    timestamps: true, // Adds createdAt and updatedAt
    versionKey: false,
  },
);

// Listing users by role
UserSchema.index({ role: 1 });
// Reset-link lookup (resetPassword); only users with a pending reset are indexed
UserSchema.index(
  { resetToken: 1 },
  { partialFilterExpression: { resetToken: { $gt: "" } } }, // $gt (not $type) so equality lookups can use it
);

/** Mongoose model for the `users` collection. */
const User = mongoose.model("User", UserSchema);

export default User;
