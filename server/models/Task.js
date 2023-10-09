import mongoose from "mongoose";

const TaskSchema = new mongoose.Schema(
  {
    priority: {
      type: String,
      enum: ["Urgent", "High", "Normal", "Backlog"],
    },
    deadline: {
      type: String,
    },
    currentStatus: {
      type: String,
      enum: ["New", "InProgress", "Resolved", "ReOpened"],
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
    },
  },
  { timestamps: true }
);

const Task = mongoose.model("Task", TaskSchema);

export default Task;
