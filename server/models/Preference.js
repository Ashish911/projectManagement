import mongoose from "mongoose";

const PreferenceSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  theme: {
    type: String,
    enum: ["Light", "Dark"],
  },
  language: {
    type: String,
    enum: ["English", "Japenese", "Korean"],
  },
});

const Preference = mongoose.model("Preference", PreferenceSchema);

export default Preference;
