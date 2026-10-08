import { createLogger } from "../config/logger.js";
import { ForbiddenError, NotFoundError } from "../errors/errors.js";
import {
  TaskRepo,
  ProjectRepo,
  SubTaskRepo,
  CommentRepo,
  ClientRepo,
} from "../repositories/import.repo.js";
import {
  createTaskSchema,
  idSchema,
  updateSubTaskStatusSchema,
  updateTaskSchema,
} from "../validation/schema.js";
import { validate } from "../validation/validate.js";
import { NotificationService } from "./import.service.js";

/** Business logic and role checks for tasks. Admins have full access; USERs are limited to their own. */
export const TaskService = {
  /**
   * Lists tasks across every project the user can see: all for SUPER_ADMIN,
   * their client's projects for CLIENT_ADMIN, assigned projects for USER.
   * @param {object} context GraphQL context with the current `user`.
   * @returns {Promise<object[]>} The tasks.
   */
  async getAllTasks(context) {
    const { user } = context;

    if (user.role === "SUPER_ADMIN") return await TaskRepo.find();

    let projects = [];
    if (user.role === "CLIENT_ADMIN") {
      const client = await ClientRepo.findByAssignedAdmin(user.id);
      if (!client) return [];
      projects = await ProjectRepo.findByClientId(client.id);
    } else {
      projects = await ProjectRepo.findByAssignedUser(user.id);
    }

    if (!projects.length) return [];
    return await TaskRepo.findByProjects(projects.map((p) => p.id));
  },

  /**
   * Lists a project's tasks.
   * @param {string} projectId Project ID.
   * @param {object} context   GraphQL context with the current `user`.
   * @returns {Promise<object[]>} The project's tasks.
   * @throws {ForbiddenError} If a USER is not assigned to the project.
   */
  async getTasks(projectId, context) {
    validate(idSchema, { id: projectId });

    const { user } = context;

    const project = await ProjectRepo.findById(projectId);

    if (!project) throw new NotFoundError("Project not found.");

    // Check user has access to this project
    if (user.role === "USER") {
      const isAssigned = project.assignedUsers
        .map((id) => id.toString())
        .includes(user.id);
      if (!isAssigned)
        throw new ForbiddenError("You are not assigned to this project");
    }

    return await TaskRepo.findByProject(projectId);
  },

  /**
   * Fetches one task.
   * @param {string} id      Task ID.
   * @param {object} context GraphQL context with the current `user`.
   * @returns {Promise<object>} The task.
   * @throws {ForbiddenError} If a USER neither created nor is assigned the task.
   */
  async getTask(id, context) {
    validate(idSchema, { id });

    const { user } = context;

    const task = await TaskRepo.findById(id);
    if (!task) throw new NotFoundError("Task not found");

    // USER must be the task's assignee or creator
    if (user.role === "USER") {
      const isAssigned =
        task.assignedTo?.toString() === user.id ||
        task.createdBy?.toString() === user.id;

      if (!isAssigned)
        throw new ForbiddenError("You do not have access to this task");
    }

    return task;
  },

  /**
   * Creates a task in a project and notifies the assignee. Not allowed for USER.
   * @param {object} data    `{ projectId, title, [priority], [deadline], [assignedTo] }`.
   * @param {object} context GraphQL context with the current `user`.
   * @returns {Promise<object>} The new task.
   * @throws {ForbiddenError} If the user is a USER.
   */
  async createTask(data, context) {
    validate(createTaskSchema, data);

    const { user } = context;
    const logger = createLogger(context);

    if (user.role === "USER") {
      throw new ForbiddenError(
        "Current role does not have permission to create tasks",
      );
    }

    const project = await ProjectRepo.findById(data.projectId);
    if (!project) throw new NotFoundError("Project not found");

    const task = await TaskRepo.create({
      title: data.title,
      priority: data.priority || "NORMAL",
      deadline: data.deadline,
      currentStatus: data.currentStatus || "NEW",
      assignedTo: data.assignedTo,
      createdBy: user.id,
      project: data.projectId,
    });

    // Notify assigned user
    if (data.assignedTo) {
      await NotificationService.notify(
        data.assignedTo,
        `You have been assigned a new task: ${data.title}`,
      );
    }

    logger.info(
      {
        audit: true,
        userId: user.id,
        action: "CREATE_TASK",
      },
      "AUDIT",
    );

    return task;
  },

  /**
   * Updates a task's fields and notifies a new assignee.
   * @param {object} data    Task ID plus fields to change.
   * @param {object} context GraphQL context with the current `user`.
   * @returns {Promise<object>} The updated task.
   * @throws {ForbiddenError} If a USER is not the task's assignee.
   */
  async updateTask(data, context) {
    validate(updateTaskSchema, data);

    const { user } = context;
    const logger = createLogger(context);

    const task = await TaskRepo.findById(data.id);

    if (!task) throw new NotFoundError("Task not found");

    // USER can only update tasks assigned to them
    if (user.role === "USER" && task.assignedTo?.toString() !== user.id) {
      throw new ForbiddenError(
        "You do not have permission to update this task",
      );
    }

    // If reassigning to someone new notify them
    if (data.assignedTo && data.assignedTo !== task.assignedTo?.toString()) {
      await NotificationService.notify(
        data.assignedTo,
        `Task "${task.title}" has been assigned to you`,
      );
    }

    // Only include fields that were provided; null clears deadline / assignee
    const updated = await TaskRepo.update(data.id, {
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
        targetTaskId: data.id,
        action: "UPDATE_TASK",
      },
      "AUDIT",
    );

    return updated;
  },

  /**
   * Changes a task's status and notifies the relevant users.
   * @param {string} id      Task ID.
   * @param {string} status  New status, e.g. "RESOLVED" or "REOPENED".
   * @param {object} context GraphQL context with the current `user`.
   * @returns {Promise<object>} The updated task.
   * @throws {ForbiddenError} If a USER is not the task's assignee.
   */
  async updateTaskStatus(id, status, context) {
    validate(updateSubTaskStatusSchema, { id, status }); // Tasks and subtasks share the same status rules

    const { user } = context;
    const logger = createLogger(context);

    const task = await TaskRepo.findById(id);

    if (!task) throw new NotFoundError("Task not found");

    // Only assigned user or admin can update status
    if (user.role === "USER" && task.assignedTo?.toString() !== user.id) {
      throw new ForbiddenError(
        "You do not have permission to update this task status",
      );
    }

    // resolvedAt feeds the dashboard's created-vs-resolved chart
    const updatedTask = await TaskRepo.update(id, {
      currentStatus: status,
      resolvedAt: status === "RESOLVED" ? new Date() : null,
    });

    // Notify creator when task is resolved
    if (status === "RESOLVED") {
      await NotificationService.notify(
        task.createdBy,
        `Task "${task.title}" has been marked as resolved`,
      );

      // Also notify assigned user if different from creator
      if (task.assignedTo?.toString() !== task.createdBy?.toString()) {
        await NotificationService.notify(
          task.assignedTo,
          `Task "${task.title}" has been marked as resolved`,
        );
      }
    }

    // Notify creator when task is reopened
    if (status === "REOPENED") {
      await NotificationService.notify(
        task.createdBy,
        `Task "${task.title}" has been reopened`,
      );
    }

    logger.info(
      {
        audit: true,
        userId: user.id,
        targetTaskId: id,
        action: "UPDATE_TASK_STATUS",
      },
      "AUDIT",
    );

    return updatedTask;
  },

  /**
   * Deletes a task and its subtasks, and notifies the assignee. Not allowed for USER.
   * @param {string} id      Task ID.
   * @param {object} context GraphQL context with the current `user`.
   * @returns {Promise<object>} The deleted task.
   * @throws {ForbiddenError} If the user is a USER.
   */
  async deleteTask(id, context) {
    validate(idSchema, { id });

    const { user } = context;
    const logger = createLogger(context);

    if (user.role === "USER") {
      throw new ForbiddenError(
        "Current role does not have permission to delete tasks",
      );
    }

    const task = await TaskRepo.findById(id);
    if (!task) throw new NotFoundError("Task not found");

    // Delete all subtasks associated with this task
    const subTasks = await SubTaskRepo.findByTask(id);
    if (subTasks.length) {
      await Promise.all(subTasks.map((st) => SubTaskRepo.delete(st._id)));
    }

    // Delete the task's comments, including those on its subtasks
    await CommentRepo.deleteByTask(id);

    // Notify assigned user that task was deleted
    if (task.assignedTo) {
      await NotificationService.notify(
        task.assignedTo,
        `Task "${task.title}" has been deleted`,
      );
    }

    const deleted = await TaskRepo.delete(id);

    logger.info(
      {
        audit: true,
        userId: user.id,
        targetTaskId: id,
        action: "DELETE_TASK",
      },
      "AUDIT",
    );

    return deleted;
  },
};
