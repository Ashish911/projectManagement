import mongoose from "mongoose";

/**
 * The Comment model.
 *
 * This model represents a comment on a task or sub-task. Each comment has a
 * content, a user who created the comment, and a task or sub-task that the
 * comment is associated with.
 *
 * @typedef {import('mongoose').Document & {
 *   content: string,
 *   userId: import('mongoose').Types.ObjectId,
 *   taskId: import('mongoose').Types.ObjectId,
 *   subTaskId: import('mongoose').Types.ObjectId
 * }} CommentDocument
 */
const CommentSchema = new mongoose.Schema(
  {
    content: {
      type: String,
      required: true,
      trim: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    taskId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Task",
      required: true,
    },
    subTaskId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SubTask",
      required: false,
    },
  },
  {
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
    timestamps: true,
    versionKey: false,
  },
);

const Comment = mongoose.model("Comment", CommentSchema);

export default Comment;
