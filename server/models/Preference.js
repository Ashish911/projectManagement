import mongoose from "mongoose";


/**
 * The Preference model.
 *
 * This model represents a user preference. Each user has a preference that
 * includes their theme and language.
 *
 * @typedef {import('mongoose').Document & {
 *   user: import('mongoose').Types.ObjectId,
 *   theme: string,
 *   language: string,
 * }} PreferenceDocument
 */
const PreferenceSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
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
  { timestamps: true, versionKey: false }
);

const Preference = mongoose.model("Preference", PreferenceSchema);

export default Preference;
