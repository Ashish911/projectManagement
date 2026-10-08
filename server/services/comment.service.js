import { createLogger } from "../config/logger.js";
import { ForbiddenError, NotFoundError } from "../errors/errors.js";
import {
  ClientRepo,
  CommentRepo,
  ProjectRepo,
  SubTaskRepo,
  TaskRepo,
} from "../repositories/import.repo.js";
import {
  addSubTaskCommentSchema,
  addTaskCommentSchema,
  idSchema,
  updateCommentSchema,
} from "../validation/schema.js";
import { validate } from "../validation/validate.js";
import { NotificationService } from "./notification.service.js";

/** Loads the project a task belongs to. */
const getTaskProject = async (task) => {
  const project = await ProjectRepo.findById(task.project);
  if (!project) throw new NotFoundError("Project not found");
  return project;
};

/** Loads a task and its project, or throws NotFoundError. */
const getTaskWithProject = async (taskId) => {
  const task = await TaskRepo.findById(taskId);
  if (!task) throw new NotFoundError("Task not found");
  return { task, project: await getTaskProject(task) };
};

/** Loads a sub-task and its project (via the parent task), or throws NotFoundError. */
const getSubTaskWithProject = async (subTaskId) => {
  const subTask = await SubTaskRepo.findById(subTaskId);
  if (!subTask) throw new NotFoundError("SubTask not found");

  const task = await TaskRepo.findById(subTask.task);
  if (!task) throw new NotFoundError("Task not found");

  return { subTask, project: await getTaskProject(task) };
};

/** True if the user is the CLIENT_ADMIN of the client that owns the project. */
const isProjectClientAdmin = async (project, user) => {
  if (user.role !== "CLIENT_ADMIN") return false;
  const client = await ClientRepo.findByAssignedAdmin(user.id);
  return !!client && client.id.toString() === project.clientId.toString();
};

/**
 * Allows SUPER_ADMIN, the project's CLIENT_ADMIN, and users assigned to the project.
 * @throws {ForbiddenError} For anyone else.
 */
const assertProjectAccess = async (project, user) => {
  if (user.role === "SUPER_ADMIN") return;
  if (await isProjectClientAdmin(project, user)) return;

  const isMember =
    user.role === "USER" &&
    project.assignedUsers.map(String).includes(user.id);
  if (isMember) return;

  throw new ForbiddenError("You are not a member of this project");
};

/** Notifies the target's assignee and creator about a new comment, skipping the author. */
const notifyParticipants = async (target, author) => {
  const recipients = new Set(
    [target.assignedTo, target.createdBy].filter(Boolean).map(String),
  );
  recipients.delete(author.id);

  // A failed notification should not fail the comment
  await Promise.all(
    [...recipients].map((uid) =>
      NotificationService.notify(
        uid,
        `New comment on "${target.title}"`,
      ).catch(() => {}),
    ),
  );
};

/** Loads a comment and the project it belongs to, or throws NotFoundError. */
const getCommentWithProject = async (id) => {
  const comment = await CommentRepo.findById(id);
  if (!comment) throw new NotFoundError("Comment not found");

  const { project } = await getTaskWithProject(comment.taskId.toString());
  return { comment, project };
};

/** Comments on tasks and sub-tasks, limited to people involved in the project. */
export const CommentService = {
  /**
   * Lists a task's own comments (not its sub-tasks'), oldest first.
   * @param {string} taskId  Task ID.
   * @param {object} context GraphQL context with the current `user`.
   * @returns {Promise<object[]>} The comments.
   * @throws {ForbiddenError} If the user is not involved in the project.
   */
  async getTaskComments(taskId, context) {
    validate(idSchema, { id: taskId });

    const { user } = context;

    const { project } = await getTaskWithProject(taskId);
    await assertProjectAccess(project, user);

    return await CommentRepo.findByTask(taskId);
  },

  /**
   * Lists a sub-task's comments, oldest first.
   * @param {string} subTaskId Sub-task ID.
   * @param {object} context   GraphQL context with the current `user`.
   * @returns {Promise<object[]>} The comments.
   * @throws {ForbiddenError} If the user is not involved in the project.
   */
  async getSubTaskComments(subTaskId, context) {
    validate(idSchema, { id: subTaskId });

    const { user } = context;

    const { project } = await getSubTaskWithProject(subTaskId);
    await assertProjectAccess(project, user);

    return await CommentRepo.findBySubTask(subTaskId);
  },

  /**
   * Adds a comment to a task and notifies its assignee and creator.
   * @param {object} data    `{ taskId, content }`.
   * @param {object} context GraphQL context with the current `user`.
   * @returns {Promise<object>} The new comment.
   * @throws {ForbiddenError} If the user is not involved in the project.
   */
  async addTaskComment(data, context) {
    const { taskId, content } = validate(addTaskCommentSchema, data);

    const { user } = context;
    const logger = createLogger(context);

    const { task, project } = await getTaskWithProject(taskId);
    await assertProjectAccess(project, user);

    const comment = await CommentRepo.create({
      content,
      userId: user.id,
      taskId,
    });

    logger.info(
      {
        audit: true,
        userId: user.id,
        targetCommentId: comment.id,
        action: "ADD_COMMENT",
      },
      "AUDIT",
    );

    await notifyParticipants(task, user);

    return comment;
  },

  /**
   * Adds a comment to a sub-task and notifies its assignee and creator.
   * @param {object} data    `{ subTaskId, content }`.
   * @param {object} context GraphQL context with the current `user`.
   * @returns {Promise<object>} The new comment.
   * @throws {ForbiddenError} If the user is not involved in the project.
   */
  async addSubTaskComment(data, context) {
    const { subTaskId, content } = validate(addSubTaskCommentSchema, data);

    const { user } = context;
    const logger = createLogger(context);

    const { subTask, project } = await getSubTaskWithProject(subTaskId);
    await assertProjectAccess(project, user);

    // taskId is stored too, so deleting the parent task removes these comments
    const comment = await CommentRepo.create({
      content,
      userId: user.id,
      taskId: subTask.task,
      subTaskId,
    });

    logger.info(
      {
        audit: true,
        userId: user.id,
        targetCommentId: comment.id,
        action: "ADD_COMMENT",
      },
      "AUDIT",
    );

    await notifyParticipants(subTask, user);

    return comment;
  },

  /**
   * Edits a comment's text. Author only, and only while still involved in the project.
   * @param {object} data    `{ id, content }`.
   * @param {object} context GraphQL context with the current `user`.
   * @returns {Promise<object>} The updated comment.
   * @throws {ForbiddenError} If the user is not the author or has lost project access.
   */
  async updateComment(data, context) {
    const { id, content } = validate(updateCommentSchema, data);

    const { user } = context;
    const logger = createLogger(context);

    const { comment, project } = await getCommentWithProject(id);

    if (comment.userId.toString() !== user.id) {
      throw new ForbiddenError("You can only edit your own comments");
    }

    // The author may have been removed from the project since posting
    await assertProjectAccess(project, user);

    const updated = await CommentRepo.update(id, { content });

    logger.info(
      {
        audit: true,
        userId: user.id,
        targetCommentId: id,
        action: "UPDATE_COMMENT",
      },
      "AUDIT",
    );

    return updated;
  },

  /**
   * Deletes a comment. Allowed for its author, the project's CLIENT_ADMIN, or a SUPER_ADMIN.
   * @param {string} id      Comment ID.
   * @param {object} context GraphQL context with the current `user`.
   * @returns {Promise<object>} The deleted comment.
   * @throws {ForbiddenError} If the user may not delete this comment.
   */
  async deleteComment(id, context) {
    validate(idSchema, { id });

    const { user } = context;
    const logger = createLogger(context);

    const { comment, project } = await getCommentWithProject(id);

    const canDelete =
      user.role === "SUPER_ADMIN" ||
      comment.userId.toString() === user.id ||
      (await isProjectClientAdmin(project, user));

    if (!canDelete) {
      throw new ForbiddenError(
        "You do not have permission to delete this comment",
      );
    }

    const deleted = await CommentRepo.delete(id);

    logger.info(
      {
        audit: true,
        userId: user.id,
        targetCommentId: id,
        action: "DELETE_COMMENT",
      },
      "AUDIT",
    );

    return deleted;
  },
};
