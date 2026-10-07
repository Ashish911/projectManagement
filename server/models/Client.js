import mongoose from "mongoose";

/**
 * A client organisation whose projects are managed in the app, optionally run by one CLIENT_ADMIN.
 *
 * @typedef {import('mongoose').Document & {
 *   name: string,
 *   email: string,
 *   phone: string,
 *   deleteRequest: boolean,
 *   assignedAdmin: import('mongoose').Types.ObjectId
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
      lowercase: true, // Stored lowercase so lookups by email are case-insensitive
    },
    phone: {
      type: String,
    },
    // Set by the CLIENT_ADMIN; a SUPER_ADMIN must confirm before the client is deleted
    deleteRequest: {
      type: Boolean,
      default: false,
    },
    // The CLIENT_ADMIN user who manages this client
    assignedAdmin: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    // Expose `id` as a string and hide Mongo internals in plain objects and JSON
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

// Email is optional but unique when given. The partial filter leaves clients without an
// email out of the index; otherwise they would all count as "null" and collide.
ClientSchema.index(
  { email: 1 },
  { unique: true, partialFilterExpression: { email: { $gt: "" } } }, // $gt (not $type) so findByEmail can use it
);
// The client a CLIENT_ADMIN runs (findByAssignedAdmin, clearAdmin)
ClientSchema.index({ assignedAdmin: 1 });

/** Mongoose model for the `clients` collection. */
const Client = mongoose.model("Client", ClientSchema);

export default Client;
