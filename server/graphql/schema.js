import {
  GraphQLObjectType,
  GraphQLSchema,
  GraphQLEnumType,
  GraphQLID,
  GraphQLList,
  GraphQLNonNull,
  GraphQLString,
  GraphQLBoolean,
} from "graphql";

import {
  ProjectType,
  ClientType,
  AuthType,
  UserType,
  SubTaskType,
  NotificationType,
  TaskType,
  PreferenceType,
} from "./types/import.type.js";

import {
  userResolvers,
  projectResolvers,
  clientResolvers,
  taskResolvers,
  preferenceResolvers,
  subTaskResolvers,
  notificationResolvers,
} from "./resolvers/import.resolver.js";

// Root Query
const RootQuery = new GraphQLObjectType({
  name: "RootQueryType",
  fields: {
    profile: {
      type: UserType,
      resolve: userResolvers.Query.profile,
    },
    projects: {
      type: new GraphQLList(ProjectType),
      resolve: projectResolvers.Query.getProjects,
    },
    project: {
      type: ProjectType,
      args: { id: { type: new GraphQLNonNull(GraphQLID) } },
      resolve: projectResolvers.Query.project,
    },
    clients: {
      type: new GraphQLList(ClientType),
      resolve: clientResolvers.Query.clients,
    },
    client: {
      type: ClientType,
      args: { id: { type: new GraphQLNonNull(GraphQLID) } },
      resolve: clientResolvers.Query.client,
    },
    tasks: {
      type: new GraphQLList(TaskType),
      args: { projectId: { type: new GraphQLNonNull(GraphQLID) } },
      resolve: taskResolvers.Query.tasks,
    },
    task: {
      type: TaskType,
      args: { id: { type: new GraphQLNonNull(GraphQLID) } },
      resolve: taskResolvers.Query.task,
    },
    subTasks: {
      type: new GraphQLList(SubTaskType),
      args: { taskId: { type: new GraphQLNonNull(GraphQLID) } },
      resolve: subTaskResolvers.Query.subTasks,
    },
    subTask: {
      type: SubTaskType,
      args: { id: { type: new GraphQLNonNull(GraphQLID) } },
      resolve: subTaskResolvers.Query.subTask,
    },
    notifications: {
      type: new GraphQLList(NotificationType),
      resolve: notificationResolvers.Query.notifications,
    },
    notification: {
      type: NotificationType,
      args: { id: { type: new GraphQLNonNull(GraphQLID) } },
      resolve: notificationResolvers.Query.notification,
    },
    preference: {
      type: PreferenceType,
      resolve: preferenceResolvers.Query.preference,
    },
  },
});

// Mutations
const Mutation = new GraphQLObjectType({
  name: "Mutation",
  fields: {
    login: {
      type: AuthType,
      args: {
        email: { type: new GraphQLNonNull(GraphQLString) },
        password: { type: new GraphQLNonNull(GraphQLString) },
      },
      resolve: userResolvers.Mutation.login,
    },
    register: {
      type: UserType,
      args: {
        name: { type: new GraphQLNonNull(GraphQLString) },
        email: { type: new GraphQLNonNull(GraphQLString) },
        number: { type: new GraphQLNonNull(GraphQLString) },
        dob: { type: new GraphQLNonNull(GraphQLString) },
        password: { type: new GraphQLNonNull(GraphQLString) },
        role: {
          type: new GraphQLEnumType({
            name: "UserRole",
            values: {
              su: { value: "SUPER_ADMIN" },
              ca: { value: "CLIENT_ADMIN" },
              u: { value: "USER" },
            },
          }),
          defaultValue: "USER",
        },
        gender: {
          type: new GraphQLEnumType({
            name: "Gender",
            values: {
              M: { value: "MALE" },
              F: { value: "FEMALE" },
              O: { value: "OTHERS" },
            },
          }),
          defaultValue: "MALE",
        },
      },
      resolve: userResolvers.Mutation.register,
    },
    addClient: {
      type: ClientType,
      args: {
        name: { type: new GraphQLNonNull(GraphQLString) },
        email: { type: new GraphQLNonNull(GraphQLString) },
        phone: { type: new GraphQLNonNull(GraphQLString) },
        assignedAdmin: { type: GraphQLID },
        deleteRequest: { type: GraphQLBoolean },
      },
      resolve: clientResolvers.Mutation.addClient,
    },
    updateClient: {
      type: ClientType,
      args: {
        name: { type: new GraphQLNonNull(GraphQLString) },
        email: { type: new GraphQLNonNull(GraphQLString) },
        phone: { type: new GraphQLNonNull(GraphQLString) },
        assignedUser: { type: new GraphQLNonNull(GraphQLID) },
      },
      resolve: clientResolvers.Mutation.updateClient,
    },
    confirmDeleteClient: {
      type: ClientType,
      args: {
        id: { type: new GraphQLNonNull(GraphQLID) },
      },
      resolve: clientResolvers.Mutation.confirmDeleteClient,
    },
    deleteClientBySuperAdmin: {
      type: ClientType,
      args: {
        id: { type: new GraphQLNonNull(GraphQLID) },
      },
      resolve: clientResolvers.Mutation.deleteClientBySuperAdmin,
    },
    addProject: {
      type: ProjectType,
      args: {
        name: { type: new GraphQLNonNull(GraphQLString) },
        description: { type: GraphQLString },
        clientId: { type: new GraphQLNonNull(GraphQLID) },
        status: {
          type: new GraphQLEnumType({
            name: "ProjectStatus",
            values: {
              not_started: { value: "NOT_STARTED" },
              in_progress: { value: "IN_PROGRESS" },
              completed: { value: "COMPLETED" },
            },
          }),
          defaultValue: "NOT_STARTED",
        },
      },
      resolve: projectResolvers.Mutation.addProject,
    },
    updateProject: {
      type: ProjectType,
      args: {
        id: { type: new GraphQLNonNull(GraphQLID) },
        name: { type: GraphQLString },
        description: { type: GraphQLString },
        status: {
          type: new GraphQLEnumType({
            name: "UpdateProjectStatus",
            values: {
              not_started: { value: "NOT_STARTED" },
              in_progress: { value: "IN_PROGRESS" },
              completed: { value: "COMPLETED" },
            },
          }),
        },
      },
      resolve: projectResolvers.Mutation.updateProject,
    },
    deleteProject: {
      type: ProjectType,
      args: {
        id: { type: new GraphQLNonNull(GraphQLID) },
      },
      resolve: projectResolvers.Mutation.deleteProject,
    },
    addUserToProject: {
      type: ProjectType,
      args: {
        id: { type: new GraphQLNonNull(GraphQLID) },
        users: { type: new GraphQLNonNull(new GraphQLList(GraphQLID)) },
      },
      resolve: projectResolvers.Mutation.addUserToProject,
    },
    removeUserFromProject: {
      type: ProjectType,
      args: {
        id: { type: new GraphQLNonNull(GraphQLID) },
        users: { type: new GraphQLNonNull(new GraphQLList(GraphQLID)) },
      },
      resolve: projectResolvers.Mutation.removeUserFromProject,
    },
    createTask: {
      type: TaskType,
      args: {
        title: { type: new GraphQLNonNull(GraphQLString) },
        projectId: { type: new GraphQLNonNull(GraphQLID) },
        assignedTo: { type: GraphQLID },
        deadline: { type: GraphQLString },
        priority: {
          type: new GraphQLEnumType({
            name: "TaskPriority",
            values: {
              urgent: { value: "URGENT" },
              high: { value: "HIGH" },
              normal: { value: "NORMAL" },
              backlog: { value: "BACKLOG" },
            },
          }),
          defaultValue: "NORMAL",
        },
      },
      resolve: taskResolvers.Mutation.createTask,
    },
    updateTask: {
      type: TaskType,
      args: {
        id: { type: new GraphQLNonNull(GraphQLID) },
        title: { type: GraphQLString },
        assignedTo: { type: GraphQLID },
        deadline: { type: GraphQLString },
        priority: {
          type: new GraphQLEnumType({
            name: "UpdateTaskPriority",
            values: {
              urgent: { value: "URGENT" },
              high: { value: "HIGH" },
              normal: { value: "NORMAL" },
              backlog: { value: "BACKLOG" },
            },
          }),
        },
      },
      resolve: taskResolvers.Mutation.updateTask,
    },
    updateTaskStatus: {
      type: TaskType,
      args: {
        id: { type: new GraphQLNonNull(GraphQLID) },
        status: {
          type: new GraphQLNonNull(
            new GraphQLEnumType({
              name: "TaskStatus",
              values: {
                new: { value: "NEW" },
                in_progress: { value: "IN_PROGRESS" },
                resolved: { value: "RESOLVED" },
                reopened: { value: "REOPENED" },
              },
            }),
          ),
        },
      },
      resolve: taskResolvers.Mutation.updateTaskStatus,
    },
    deleteTask: {
      type: TaskType,
      args: {
        id: { type: new GraphQLNonNull(GraphQLID) },
      },
      resolve: taskResolvers.Mutation.deleteTask,
    },
    createSubTask: {
      type: SubTaskType,
      args: {
        title: { type: new GraphQLNonNull(GraphQLString) },
        taskId: { type: new GraphQLNonNull(GraphQLID) },
        assignedTo: { type: GraphQLID },
        deadline: { type: GraphQLString },
        priority: {
          type: new GraphQLEnumType({
            name: "SubTaskPriority",
            values: {
              urgent: { value: "URGENT" },
              high: { value: "HIGH" },
              normal: { value: "NORMAL" },
              backlog: { value: "BACKLOG" },
            },
          }),
          defaultValue: "NORMAL",
        },
      },
      resolve: subTaskResolvers.Mutation.createSubTask,
    },
    updateSubTask: {
      type: SubTaskType,
      args: {
        id: { type: new GraphQLNonNull(GraphQLID) },
        title: { type: GraphQLString },
        assignedTo: { type: GraphQLID },
        deadline: { type: GraphQLString },
        priority: {
          type: new GraphQLEnumType({
            name: "UpdateSubTaskPriority",
            values: {
              urgent: { value: "URGENT" },
              high: { value: "HIGH" },
              normal: { value: "NORMAL" },
              backlog: { value: "BACKLOG" },
            },
          }),
        },
      },
      resolve: subTaskResolvers.Mutation.updateSubTask,
    },
    updateSubTaskStatus: {
      type: SubTaskType,
      args: {
        id: { type: new GraphQLNonNull(GraphQLID) },
        status: {
          type: new GraphQLNonNull(
            new GraphQLEnumType({
              name: "SubTaskStatus",
              values: {
                new: { value: "NEW" },
                in_progress: { value: "IN_PROGRESS" },
                resolved: { value: "RESOLVED" },
                reopened: { value: "REOPENED" },
              },
            }),
          ),
        },
      },
      resolve: subTaskResolvers.Mutation.updateSubTaskStatus,
    },
    deleteSubTask: {
      type: SubTaskType,
      args: {
        id: { type: new GraphQLNonNull(GraphQLID) },
      },
      resolve: subTaskResolvers.Mutation.deleteSubTask,
    },
    markAsRead: {
      type: NotificationType,
      args: {
        id: { type: new GraphQLNonNull(GraphQLID) },
      },
      resolve: notificationResolvers.Mutation.markAsRead,
    },
    markAllAsRead: {
      type: new GraphQLList(NotificationType),
      resolve: notificationResolvers.Mutation.markAllAsRead,
    },
    deleteNotification: {
      type: NotificationType,
      args: {
        id: { type: new GraphQLNonNull(GraphQLID) },
      },
      resolve: notificationResolvers.Mutation.deleteNotification,
    },
    deleteAllNotifications: {
      type: new GraphQLList(NotificationType),
      resolve: notificationResolvers.Mutation.deleteAllNotifications,
    },
    updatePreference: {
      type: PreferenceType,
      args: {
        theme: {
          type: new GraphQLEnumType({
            name: "Theme",
            values: {
              light: { value: "LIGHT" },
              dark: { value: "DARK" },
            },
          }),
        },
        language: {
          type: new GraphQLEnumType({
            name: "Language",
            values: {
              english: { value: "ENGLISH" },
              japanese: { value: "JAPANESE" },
              korean: { value: "KOREAN" },
            },
          }),
        },
      },
      resolve: preferenceResolvers.Mutation.updatePreference,
    },
  },
});

const schema = new GraphQLSchema({
  query: RootQuery,
  mutation: Mutation,
});

export default schema;
