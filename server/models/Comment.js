import mongoose from "mongoose";

/**
 * Mongoose schema for a comment on a task, optionally scoped to one of its sub-tasks.
 *
 * @typedef {import('mongoose').Document & {
 *   content: string,
 *   userId: import('mongoose').Types.ObjectId,
 *   taskId: import('mongoose').Types.ObjectId,
 *   subTaskId?: import('mongoose').Types.ObjectId
 * }} CommentDocument
 */
const CommentSchema = new mongoose.Schema(
  {
    content: {
      type: String,
      required: true,
      trim: true,
    },
    // Author of the comment
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    // Always set, even when the comment is on a sub-task
    taskId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Task",
      required: true,
    },
    // Set only when the comment targets a specific sub-task
    subTaskId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SubTask",
      required: false,
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

/** Mongoose model for the `comments` collection. */
const Comment = mongoose.model("Comment", CommentSchema);

export default Comment;
