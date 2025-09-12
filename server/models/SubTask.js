import mongoose from "mongoose";

/**
 * The SubTask model.
 *
 * This model represents a sub-task that is associated with a task. Each sub-task
 * has a priority, a deadline, and a current status.
 *
 * @typedef {import('mongoose').Document & {
 *   priority: string,
 *   deadline: string,
 *   currentStatus: string,
 * }} SubTaskDocument
 */
const SubTaskSchema = new mongoose.Schema(
  {
    priority: {
        type: String,
        enum: ["URGENT", "HIGH", "NORMAL", "BACKLOG"],
        default: "NORMAL",
    },
    deadline: {
      type: String,
    },
    currentStatus: {
      type: String,
      enum: ["NEW", "IN_PROGRESS", "RESOLVED", "REOPENED"],
        default: "NEW",
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
        required: true,
    },
    task: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Task",
        required: true,
    },
  },
  { timestamps: true, versionKey: false }
);

const SubTask = mongoose.model("SubTask", SubTaskSchema);

export default SubTask;
