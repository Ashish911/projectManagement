import mongoose from "mongoose";

/**
 * Mongoose schema for a sub-task that belongs to a parent task.
 *
 * @typedef {import('mongoose').Document & {
 *   title: string,
 *   priority: "URGENT" | "HIGH" | "NORMAL" | "BACKLOG",
 *   deadline?: Date,
 *   currentStatus: "NEW" | "IN_PROGRESS" | "RESOLVED" | "REOPENED",
 *   assignedTo?: import('mongoose').Types.ObjectId,
 *   createdBy: import('mongoose').Types.ObjectId,
 *   task: import('mongoose').Types.ObjectId,
 * }} SubTaskDocument
 */
const SubTaskSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    priority: {
      type: String,
      enum: ["URGENT", "HIGH", "NORMAL", "BACKLOG"],
      default: "NORMAL",
    },
    deadline: {
      type: Date,
    },
    // Workflow state; REOPENED marks a sub-task moved back after being resolved
    currentStatus: {
      type: String,
      enum: ["NEW", "IN_PROGRESS", "RESOLVED", "REOPENED"],
      default: "NEW",
    },
    // Optional; a sub-task can exist without an assignee
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    // Parent task this sub-task belongs to
    task: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Task",
      required: true,
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

/** Mongoose model for the `subtasks` collection. */
const SubTask = mongoose.model("SubTask", SubTaskSchema);

export default SubTask;
