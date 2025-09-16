import mongoose from "mongoose";

/**
 * The Client model.
 *
 * This model represents a client. Each client has a name, email, and phone number.
 * It also has a reference to a user that registered the client. The client's
 * registration info is stored in the user's "clients" array.
 *
 * @typedef {import('mongoose').Document & {
 *   name: string,
 *   email: string,
 *   phone: string,
 *   user: import('mongoose').Types.ObjectId
 * }} ClientDocument
 */
const ClientSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      lowercase: true,
      index: true,
    },
    phone: {
      type: String,
    },
    deleteRequest: {
      type: Boolean,
      default: false,
    },
    assignedAdmin: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true, versionKey: false }
);

const Client = mongoose.model("Client", ClientSchema);

export default Client;
