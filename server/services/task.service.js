import { createLogger } from "../config/logger.js";
import { ConflictError, ForbiddenError, NotFoundError } from "../errors/errors.js";
import {
  TaskRepo,
  ProjectRepo,
  SubTaskRepo,
  CommentRepo,
} from "../repositories/import.repo.js";
import {
  createTaskSchema,
  idSchema,
  updateSubTaskStatusSchema,
  updateTaskSchema,
} from "../validation/schema.js";
import { validate } from "../validation/validate.js";
import { ActivityService } from "./activity.service.js";
import { hasSubTaskOn, managesProject, managesProjectId, onProjectTeam, visibleProjects } from "./access.js";
import { NotificationService } from "./import.service.js";

/**
 * Business logic and role checks for tasks. Whoever runs the project (SUPER_ADMIN, or the
 * CLIENT_ADMIN of its client) has full access; everyone else is limited to their own tasks.
 */
export const TaskService = {
  /**
   * Lists tasks across every project the user can see: all for SUPER_ADMIN, their
   * client's projects plus the ones they are on for CLIENT_ADMIN, assigned projects for USER.
   * @param {object} context GraphQL context with the current `user`.
   * @returns {Promise<object[]>} The tasks.
   */
  async getAllTasks(context) {
    const { user } = context;

    if (user.role === "SUPER_ADMIN") return await TaskRepo.find(); // Never assigned work

    const projects = await visibleProjects(user);
    if (!projects.length) return [];
    const tasks = await TaskRepo.findByProjects(projects.map((p) => p.id));

    // Each task carries the caller's own subtasks, so "my work" (assigned the task OR one of
    // its subtasks) is decided here in one query rather than by loading every subtask (TSK-05)
    const idOf = (t) => String(t._id ?? t.id);
    const mine = tasks.length ? await SubTaskRepo.findAssignedTo(user.id, tasks.map(idOf)) : [];
    return tasks.map((t) => ({ ...t, mySubTasks: mine.filter((s) => String(s.task) === idOf(t)) }));
  },

  /**
   * Lists a project's tasks.
   * @param {string} projectId Project ID.
   * @param {object} context   GraphQL context with the current `user`.
   * @returns {Promise<object[]>} The project's tasks.
   * @throws {ForbiddenError} If the user neither runs nor is on the project.
   */
  async getTasks(projectId, context) {
    validate(idSchema, { id: projectId });

    const { user } = context;

    const project = await ProjectRepo.findById(projectId);

    if (!project) throw new NotFoundError("Project not found.");

    // Check user has access to this project
    if (!onProjectTeam(project, user) && !(await managesProject(project, user)))
      throw new ForbiddenError("You are not assigned to this project");

    return await TaskRepo.findByProject(projectId);
  },

  /**
   * Fetches one task.
   * @param {string} id      Task ID.
   * @param {object} context GraphQL context with the current `user`.
   * @returns {Promise<object>} The task.
   * @throws {ForbiddenError} If someone who doesn't run the project neither created nor is assigned the task.
   */
  async getTask(id, context) {
    validate(idSchema, { id });

    const { user } = context;

    const task = await TaskRepo.findById(id);
    if (!task) throw new NotFoundError("Task not found");

    // Unless they run the project, the user must be the task's assignee or creator,
    // or be assigned one of its subtasks (read-only context for their own work)
    const isAssigned =
      task.assignedTo?.toString() === user.id ||
      task.createdBy?.toString() === user.id;
    if (!isAssigned && !(await managesProjectId(task.project, user)) && !(await hasSubTaskOn(id, user)))
      throw new ForbiddenError("You do not have access to this task");

    return task;
  },

  /**
   * Creates a task in a project and notifies the assignee. Only for whoever runs the project.
   * @param {object} data    `{ projectId, title, [priority], [deadline], [assignedTo] }`.
   * @param {object} context GraphQL context with the current `user`.
   * @returns {Promise<object>} The new task.
   * @throws {ForbiddenError} If the user doesn't run the project.
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
    if (!(await managesProject(project, user))) {
      throw new ForbiddenError(
        "Current role does not have permission to create tasks",
      );
    }

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
   * @throws {ForbiddenError} If someone who doesn't run the project is not the task's assignee.
   */
  async updateTask(data, context) {
    validate(updateTaskSchema, data);

    const { user } = context;
    const logger = createLogger(context);

    const task = await TaskRepo.findById(data.id);

    if (!task) throw new NotFoundError("Task not found");

    // Unless they run the project, users can only update tasks assigned to them
    if (task.assignedTo?.toString() !== user.id && !(await managesProjectId(task.project, user))) {
      throw new ForbiddenError(
        "You do not have permission to update this task",
      );
    }

    // Resolved tasks are read-only until reopened
    if (task.currentStatus === "RESOLVED") {
      throw new ConflictError("This task is resolved. Reopen it to make changes.");
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
   * @param {string} [reason] Why it was reopened; saved in Activity.
   * @returns {Promise<object>} The updated task.
   * @throws {ForbiddenError} If someone who doesn't run the project is not the task's assignee.
   * @throws {ConflictError}  If a resolved task is moved anywhere but REOPENED.
   */
  async updateTaskStatus(id, status, context, reason) {
    validate(updateSubTaskStatusSchema, { id, status }); // Tasks and subtasks share the same status rules

    const { user } = context;
    const logger = createLogger(context);

    const task = await TaskRepo.findById(id);

    if (!task) throw new NotFoundError("Task not found");

    // Only the assignee or whoever runs the project can update status
    if (task.assignedTo?.toString() !== user.id && !(await managesProjectId(task.project, user))) {
      throw new ForbiddenError(
        "You do not have permission to update this task status",
      );
    }

    // A resolved task's only way forward is Reopen
    if (task.currentStatus === "RESOLVED" && status !== "REOPENED" && status !== "RESOLVED") {
      throw new ConflictError("Reopen this task before changing its status");
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

    // Notify creator when task is reopened, and log why
    if (status === "REOPENED") {
      await ActivityService.record({
        actor: user.id,
        action: "TASK_REOPENED",
        task: id,
        project: task.project,
        summary: `reopened “${task.title}”`,
        reason: reason?.trim().slice(0, 500) || null,
      });
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
   * Deletes a task and its subtasks, and notifies the assignee. Only for whoever runs the project.
   * @param {string} id      Task ID.
   * @param {object} context GraphQL context with the current `user`.
   * @returns {Promise<object>} The deleted task.
   * @throws {ForbiddenError} If the user doesn't run the project.
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
    if (!(await managesProjectId(task.project, user))) {
      throw new ForbiddenError(
        "Current role does not have permission to delete tasks",
      );
    }

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
