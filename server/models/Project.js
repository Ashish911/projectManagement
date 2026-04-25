import mongoose from "mongoose";

/**
 * The Project model.
 *
 * This model represents a project. Each project has a name, a description,
 * a status, and a client that it belongs to. It also has an array of assigned
 * users.
 *
 * @typedef {import('mongoose').Document & {
 *   name: string,
 *   description: string,
 *   status: string,
 *   clientId: import('mongoose').Types.ObjectId,
 *   assignedUsers: Array<import('mongoose').Types.ObjectId>
 * }} ProjectDocument
 */
const ProjectSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ["NOT_STARTED", "IN_PROGRESS", "COMPLETED"],
      default: "NOT_STARTED",
    },
    clientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Client",
      required: true,
    },
    assignedUsers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
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

const Project = mongoose.model("Project", ProjectSchema);

export default Project;
