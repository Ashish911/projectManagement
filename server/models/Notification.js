import mongoose from "mongoose";

/**
 * Mongoose schema for an in-app notification sent to a single user.
 * Records are created by NotificationService.notify().
 *
 * @typedef {import('mongoose').Document & {
 *   user: import('mongoose').Types.ObjectId,
 *   content: string,
 *   status: "READ" | "UNREAD",
 * }} NotificationDocument
 */
const NotificationSchema = new mongoose.Schema(
  {
    // Recipient of the notification
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    // Message text shown to the user
    content: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ["READ", "UNREAD"],
      default: "UNREAD",
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

// A user's notifications newest first (findByUser); the user prefix also serves markRead and deleteByUser
NotificationSchema.index({ user: 1, createdAt: -1 });

/** Mongoose model for the `notifications` collection. */
const Notification = mongoose.model("Notification", NotificationSchema);

export default Notification;
