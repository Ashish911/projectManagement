import mongoose from "mongoose";

/**
 * The Notification model.
 *
 * This model represents a notification that a user can receive. Each notification
 * has a content and a user that it belongs to.
 *
 * @typedef {import('mongoose').Document & {
 *   content: string,
 *   status: string,
 *   user: import('mongoose').Types.ObjectId,
 * }} NotificationDocument
 */
const NotificationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
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
  { timestamps: true, versionKey: false }
);

const Notification = mongoose.model("Notification", NotificationSchema);

export default Notification;
