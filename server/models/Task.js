import mongoose from "mongoose";

/** Mongoose schema for a task that belongs to a project. */
const TaskSchema = new mongoose.Schema(
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
    // Workflow state; REOPENED marks a task moved back after being resolved
    currentStatus: {
      type: String,
      enum: ["NEW", "IN_PROGRESS", "RESOLVED", "REOPENED"],
      default: "NEW",
    },
    // Optional; a task can exist without an assignee
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    // When the task was last marked RESOLVED; cleared if it is reopened. Feeds the dashboard charts
    resolvedAt: {
      type: Date,
      default: null,
    },
    // Parent project; used for project-level access checks
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
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

// Tasks of a project (findByProject, and findByProjects for allTasks)
TaskSchema.index({ project: 1 });
// Clearing a deleted user's assignments (unassignUser)
TaskSchema.index({ assignedTo: 1 });

/** Mongoose model for the `tasks` collection. */
const Task = mongoose.model("Task", TaskSchema);

export default Task;
