import mongoose from "mongoose";

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

const Task = mongoose.model("Task", TaskSchema);

export default Task;
