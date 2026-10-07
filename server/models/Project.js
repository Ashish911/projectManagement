import mongoose from "mongoose";

/**
 * Mongoose schema for a project owned by a client, with the users assigned to it.
 *
 * @typedef {import('mongoose').Document & {
 *   name: string,
 *   description: string,
 *   status: "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED",
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
    // Owning client; CLIENT_ADMINs manage projects of their own client
    clientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Client",
      required: true,
    },
    // Optional target date for the whole project
    dueDate: {
      type: Date,
      default: null,
    },
    // Users with access to the project; exposed in GraphQL as `user`
    assignedUsers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
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

// A client's projects (findByClient)
ProjectSchema.index({ clientId: 1 });
// Projects a user belongs to (findByAssignedUser, removeUserEverywhere); multikey over the array
ProjectSchema.index({ assignedUsers: 1 });

/** Mongoose model for the `projects` collection. */
const Project = mongoose.model("Project", ProjectSchema);

export default Project;
