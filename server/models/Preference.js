import mongoose from "mongoose";

/**
 * Mongoose schema for a user's UI settings; each user has at most one preference.
 *
 * @typedef {import('mongoose').Document & {
 *   user: import('mongoose').Types.ObjectId,
 *   theme: "LIGHT" | "DARK",
 *   language: "ENGLISH" | "JAPANESE" | "KOREAN",
 * }} PreferenceDocument
 */
const PreferenceSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true, // One preference record per user
    },
    theme: {
      type: String,
      enum: ["LIGHT", "DARK"],
      default: "LIGHT",
    },
    language: {
      type: String,
      enum: ["ENGLISH", "JAPANESE", "KOREAN"],
      default: "ENGLISH",
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

/** Mongoose model for the `preferences` collection. */
const Preference = mongoose.model("Preference", PreferenceSchema);

export default Preference;
