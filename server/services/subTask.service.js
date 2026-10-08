import { createLogger } from "../config/logger.js";
import { NotFoundError, ForbiddenError } from "../errors/errors.js";
import {
  CommentRepo,
  SubTaskRepo,
  TaskRepo,
} from "../repositories/import.repo.js";
import {
  createSubTaskSchema,
  idSchema,
  updateSubTaskSchema,
  updateSubTaskStatusSchema,
} from "../validation/schema.js";
import { validate } from "../validation/validate.js";
import { NotificationService } from "./import.service.js";

/** Business logic and role checks for subtasks. Admins have full access; USERs are limited to their own. */
export const SubTaskService = {
  /**
   * Lists the subtasks of a task.
   * @param {string} taskId  Parent task ID.
   * @param {object} context GraphQL context with the current `user`.
   * @returns {Promise<object[]>} The task's subtasks.
   * @throws {ForbiddenError} If a USER neither created nor is assigned the parent task.
   */
  async getSubTasks(taskId, context) {
    validate(idSchema, { id: taskId });

    const { user } = context;

    const task = await TaskRepo.findById(taskId);
    if (!task) throw new NotFoundError("Task not found");

    // USER must be the parent task's assignee or creator
    if (user.role === "USER") {
      const isAssigned =
        task.assignedTo?.toString() === user.id ||
        task.createdBy?.toString() === user.id;

      if (!isAssigned)
        throw new ForbiddenError("You do not have access to this task");
    }

    return await SubTaskRepo.findByTask(taskId);
  },

  /**
   * Fetches one subtask.
   * @param {string} id      Subtask ID.
   * @param {object} context GraphQL context with the current `user`.
   * @returns {Promise<object>} The subtask.
   * @throws {ForbiddenError} If a USER neither created nor is assigned the subtask.
   */
  async getSubTask(id, context) {
    validate(idSchema, { id });

    const { user } = context;

    const subTask = await SubTaskRepo.findById(id);

    if (!subTask) throw new NotFoundError("SubTask not found");

    // USER must be the subtask's assignee or creator
    if (user.role === "USER") {
      const isAssigned =
        subTask.assignedTo?.toString() === user.id ||
        subTask.createdBy?.toString() === user.id;

      if (!isAssigned)
        throw new ForbiddenError("You do not have access to this subtask");
    }

    return subTask;
  },

  /**
   * Creates a subtask under a task and notifies the assignee.
   * @param {object} data    `{ taskId, title, [priority], [deadline], [assignedTo] }`.
   * @param {object} context GraphQL context with the current `user`.
   * @returns {Promise<object>} The new subtask.
   * @throws {ForbiddenError} If a USER is not assigned the parent task.
   */
  async createSubTask(data, context) {
    validate(createSubTaskSchema, data);

    const { user } = context;
    const logger = createLogger(context);

    const task = await TaskRepo.findById(data.taskId);
    if (!task) throw new NotFoundError("Task not found");

    // Only assigned user or admin can create subtasks
    if (user.role === "USER" && task.assignedTo?.toString() !== user.id) {
      throw new ForbiddenError(
        "You do not have permission to create subtasks for this task",
      );
    }

    const subTask = await SubTaskRepo.create({
      title: data.title,
      priority: data.priority || "NORMAL",
      deadline: data.deadline,
      currentStatus: "NEW",
      assignedTo: data.assignedTo,
      createdBy: user.id,
      task: data.taskId,
    });

    // Notify assigned user
    if (data.assignedTo) {
      await NotificationService.notify(
        data.assignedTo,
        `You have been assigned a new subtask: ${data.title}`,
      );
    }

    logger.info(
      {
        audit: true,
        userId: user.id,
        action: "CREATE_SUBTASK",
      },
      "AUDIT",
    );

    return subTask;
  },

  /**
   * Updates a subtask's fields and notifies a new assignee.
   * @param {object} data    Subtask ID plus fields to change.
   * @param {object} context GraphQL context with the current `user`.
   * @returns {Promise<object>} The updated subtask.
   * @throws {ForbiddenError} If a USER is not the subtask's assignee.
   */
  async updateSubTask(data, context) {
    validate(updateSubTaskSchema, data);

    const { user } = context;
    const logger = createLogger(context);

    const subTask = await SubTaskRepo.findById(data.id);
    if (!subTask) throw new NotFoundError("SubTask not found");

    // USER can only update subtasks assigned to them
    if (user.role === "USER" && subTask.assignedTo?.toString() !== user.id) {
      throw new ForbiddenError(
        "You do not have permission to update this subtask",
      );
    }

    // Notify new assignee if reassigned
    if (data.assignedTo && data.assignedTo !== subTask.assignedTo?.toString()) {
      await NotificationService.notify(
        data.assignedTo,
        `Subtask "${subTask.title}" has been assigned to you`,
      );
    }

    // Only include fields that were provided; null clears deadline / assignee
    const updated = await SubTaskRepo.update(data.id, {
      ...(data.title && { title: data.title }),
      ...(data.priority && { priority: data.priority }),
      ...(data.deadline !== undefined && { deadline: data.deadline || null }),
      ...(data.assignedTo !== undefined && { assignedTo: data.assignedTo || null }),
      ...(data.currentStatus && { currentStatus: data.currentStatus }),
    });

    logger.info(
      {
        audit: true,
        userId: user.id,
        targetSubtaskId: data.id,
        action: "UPDATE_SUBTASK",
      },
      "AUDIT",
    );

    return updated;
  },

  /**
   * Changes a subtask's status and notifies the relevant users.
   * @param {string} id      Subtask ID.
   * @param {string} status  New status, e.g. "RESOLVED" or "REOPENED".
   * @param {object} context GraphQL context with the current `user`.
   * @returns {Promise<object>} The updated subtask.
   * @throws {ForbiddenError} If a USER is not the subtask's assignee.
   */
  async updateSubTaskStatus(id, status, context) {
    validate(updateSubTaskStatusSchema, { id, status });

    const { user } = context;
    const logger = createLogger(context);

    const subTask = await SubTaskRepo.findById(id);
    if (!subTask) throw new NotFoundError("SubTask not found");

    if (user.role === "USER" && subTask.assignedTo?.toString() !== user.id) {
      throw new ForbiddenError(
        "You do not have permission to update this subtask status",
      );
    }

    const updatedSubTask = await SubTaskRepo.update(id, {
      currentStatus: status,
    });

    // Notify creator when resolved
    if (status === "RESOLVED") {
      await NotificationService.notify(
        subTask.createdBy,
        `Subtask "${subTask.title}" has been marked as resolved`,
      );

      // Also notify the assignee, unless they are the creator
      if (subTask.assignedTo?.toString() !== subTask.createdBy?.toString()) {
        await NotificationService.notify(
          subTask.assignedTo,
          `Subtask "${subTask.title}" has been marked as resolved`,
        );
      }
    }

    // Notify creator when reopened
    if (status === "REOPENED") {
      await NotificationService.notify(
        subTask.createdBy,
        `Subtask "${subTask.title}" has been reopened`,
      );
    }

    logger.info(
      {
        audit: true,
        userId: user.id,
        targetSubtaskId: id,
        action: "UPDATE_SUBTASK_STATUS",
      },
      "AUDIT",
    );

    return updatedSubTask;
  },

  /**
   * Deletes a subtask and notifies its assignee.
   * @param {string} id      Subtask ID.
   * @param {object} context GraphQL context with the current `user`.
   * @returns {Promise<object>} The deleted subtask.
   * @throws {ForbiddenError} If a USER did not create the subtask.
   */
  async deleteSubTask(id, context) {
    validate(idSchema, { id });

    const { user } = context;
    const logger = createLogger(context);

    const subTask = await SubTaskRepo.findById(id);
    if (!subTask) throw new NotFoundError("SubTask not found");

    // USER can only delete subtasks they created
    if (user.role === "USER" && subTask.createdBy?.toString() !== user.id) {
      throw new ForbiddenError(
        "You do not have permission to delete this subtask",
      );
    }

    // Notify before deleting, while the title is still available
    if (subTask.assignedTo) {
      await NotificationService.notify(
        subTask.assignedTo,
        `Subtask "${subTask.title}" has been deleted`,
      );
    }

    await CommentRepo.deleteBySubTask(id);

    const deleted = await SubTaskRepo.delete(id);

    logger.info(
      {
        audit: true,
        userId: user.id,
        targetSubtaskId: id,
        action: "DELETE_SUBTASK",
      },
      "AUDIT",
    );

    return deleted;
  },
};
