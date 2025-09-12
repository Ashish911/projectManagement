import mongoose from "mongoose";


const TaskSchema = new mongoose.Schema(
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
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
        required: true,
    },
  },
  { timestamps: true, versionKey: false }
);

const Task = mongoose.model("Task", TaskSchema);

export default Task;
