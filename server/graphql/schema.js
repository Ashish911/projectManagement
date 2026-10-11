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
  ForgotPasswordType,
  MessageType,
  CommentType,
} from "./types/import.type.js";

import {
  userResolvers,
  projectResolvers,
  clientResolvers,
  taskResolvers,
  preferenceResolvers,
  subTaskResolvers,
  notificationResolvers,
  commentResolvers,
} from "./resolvers/import.resolver.js";

// Root Query
const RootQuery = new GraphQLObjectType({
  name: "RootQueryType",
  fields: {
    profile: {
      type: UserType,
      resolve: userResolvers.Query.profile,
    },
    users: {
      type: new GraphQLList(UserType),
      resolve: userResolvers.Query.users,
    },
    user: {
      type: UserType,
      args: { id: { type: new GraphQLNonNull(GraphQLID) } },
      resolve: userResolvers.Query.user,
    },
    projects: {
      type: new GraphQLList(ProjectType),
      resolve: projectResolvers.Query.projects,
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
    allTasks: {
      type: new GraphQLList(TaskType),
      resolve: taskResolvers.Query.allTasks,
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
    taskComments: {
      type: new GraphQLList(CommentType),
      args: { taskId: { type: new GraphQLNonNull(GraphQLID) } },
      resolve: commentResolvers.Query.taskComments,
    },
    subTaskComments: {
      type: new GraphQLList(CommentType),
      args: { subTaskId: { type: new GraphQLNonNull(GraphQLID) } },
      resolve: commentResolvers.Query.subTaskComments,
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
    promoteToAdmin: {
      type: UserType,
      args: {
        userId: { type: new GraphQLNonNull(GraphQLID) },
      },
      resolve: userResolvers.Mutation.promoteToAdmin,
    },
    deleteUser: {
      type: UserType,
      args: {
        userId: { type: new GraphQLNonNull(GraphQLID) },
      },
      resolve: userResolvers.Mutation.deleteUser,
    },
    updateProfile: {
      type: UserType,
      args: {
        name: { type: GraphQLString },
        number: { type: GraphQLString },
        dob: { type: GraphQLString },
        gender: { type: GraphQLString },
      },
      resolve: userResolvers.Mutation.updateProfile,
    },
    forgotPassword: {
      type: ForgotPasswordType,
      args: {
        email: { type: new GraphQLNonNull(GraphQLString) },
      },
      resolve: userResolvers.Mutation.forgotPassword,
    },
    resetPassword: {
      type: MessageType,
      args: {
        token: { type: new GraphQLNonNull(GraphQLString) },
        password: { type: new GraphQLNonNull(GraphQLString) },
      },
      resolve: userResolvers.Mutation.resetPassword,
    },
    createUser: {
      type: UserType,
      args: {
        name: { type: new GraphQLNonNull(GraphQLString) },
        email: { type: new GraphQLNonNull(GraphQLString) },
        number: { type: new GraphQLNonNull(GraphQLString) },
        gender: { type: new GraphQLNonNull(GraphQLString) },
        dob: { type: GraphQLString },
        role: { type: GraphQLString },
        clientId: { type: GraphQLID },
        mode: { type: GraphQLString }, // "INVITE" (default) or "PASSWORD"
        password: { type: GraphQLString },
      },
      resolve: userResolvers.Mutation.createUser,
    },
    updateUser: {
      type: UserType,
      args: {
        id: { type: new GraphQLNonNull(GraphQLID) },
        name: { type: GraphQLString },
        email: { type: GraphQLString },
        number: { type: GraphQLString },
        gender: { type: GraphQLString },
        dob: { type: GraphQLString },
      },
      resolve: userResolvers.Mutation.updateUser,
    },
    changeUserRoles: {
      type: new GraphQLList(UserType),
      args: {
        ids: { type: new GraphQLNonNull(new GraphQLList(new GraphQLNonNull(GraphQLID))) },
        role: { type: new GraphQLNonNull(GraphQLString) },
        clientId: { type: GraphQLID },
      },
      resolve: userResolvers.Mutation.changeUserRoles,
    },
    unlockUsers: {
      type: new GraphQLList(UserType),
      args: { ids: { type: new GraphQLNonNull(new GraphQLList(new GraphQLNonNull(GraphQLID))) } },
      resolve: userResolvers.Mutation.unlockUsers,
    },
    resendInvite: {
      type: MessageType,
      args: { id: { type: new GraphQLNonNull(GraphQLID) } },
      resolve: userResolvers.Mutation.resendInvite,
    },
    deleteUsers: {
      type: new GraphQLList(UserType),
      args: { ids: { type: new GraphQLNonNull(new GraphQLList(new GraphQLNonNull(GraphQLID))) } },
      resolve: userResolvers.Mutation.deleteUsers,
    },
    changePassword: {
      type: MessageType,
      args: {
        currentPassword: { type: new GraphQLNonNull(GraphQLString) },
        newPassword: { type: new GraphQLNonNull(GraphQLString) },
      },
      resolve: userResolvers.Mutation.changePassword,
    },
    register: {
      type: UserType,
      args: {
        name: { type: new GraphQLNonNull(GraphQLString) },
        email: { type: new GraphQLNonNull(GraphQLString) },
        number: { type: new GraphQLNonNull(GraphQLString) },
        dob: { type: new GraphQLNonNull(GraphQLString) },
        password: { type: new GraphQLNonNull(GraphQLString) },
        gender: {
          type: new GraphQLEnumType({
            name: "Gender",
            values: {
              // Short names are what the registration form sends
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
        email: { type: GraphQLString },
        phone: { type: GraphQLString },
        assignedAdmin: { type: GraphQLID },
        deleteRequest: { type: GraphQLBoolean },
      },
      resolve: clientResolvers.Mutation.addClient,
    },
    updateClient: {
      type: ClientType,
      args: {
        id: { type: new GraphQLNonNull(GraphQLID) },
        name: { type: new GraphQLNonNull(GraphQLString) },
        email: { type: GraphQLString },
        phone: { type: GraphQLString },
        assignedAdmin: { type: GraphQLID },
        deleteRequest: { type: GraphQLBoolean },
      },
      resolve: clientResolvers.Mutation.updateClient,
    },
    declineClientDeletion: {
      type: ClientType,
      args: {
        id: { type: new GraphQLNonNull(GraphQLID) },
        message: { type: GraphQLString },
      },
      resolve: clientResolvers.Mutation.declineClientDeletion,
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
    forceDeleteClient: {
      type: ClientType,
      args: {
        id: { type: new GraphQLNonNull(GraphQLID) },
      },
      resolve: clientResolvers.Mutation.forceDeleteClient,
    },
    assignAdmin: {
      type: ClientType,
      args: {
        id: { type: new GraphQLNonNull(GraphQLID) },
        assignedAdmin: { type: new GraphQLNonNull(GraphQLID) },
      },
      resolve: clientResolvers.Mutation.assignAdmin,
    },
    addProject: {
      type: ProjectType,
      args: {
        name: { type: new GraphQLNonNull(GraphQLString) },
        description: { type: GraphQLString },
        clientId: { type: new GraphQLNonNull(GraphQLID) },
        dueDate: { type: GraphQLString },
        status: {
          type: new GraphQLEnumType({
            name: "ProjectStatus",
            values: {
              NOT_STARTED: { value: "NOT_STARTED" },
              IN_PROGRESS: { value: "IN_PROGRESS" },
              COMPLETED: { value: "COMPLETED" },
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
        dueDate: { type: GraphQLString },
        status: {
          type: new GraphQLEnumType({
            name: "UpdateProjectStatus",
            values: {
              NOT_STARTED: { value: "NOT_STARTED" },
              IN_PROGRESS: { value: "IN_PROGRESS" },
              COMPLETED: { value: "COMPLETED" },
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
        currentStatus: {
          type: new GraphQLEnumType({
            name: "NewTaskStatus",
            values: {
              NEW: { value: "NEW" },
              IN_PROGRESS: { value: "IN_PROGRESS" },
            },
          }),
        },
        priority: {
          type: new GraphQLEnumType({
            name: "TaskPriority",
            values: {
              URGENT: { value: "URGENT" },
              HIGH: { value: "HIGH" },
              NORMAL: { value: "NORMAL" },
              BACKLOG: { value: "BACKLOG" },
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
              URGENT: { value: "URGENT" },
              HIGH: { value: "HIGH" },
              NORMAL: { value: "NORMAL" },
              BACKLOG: { value: "BACKLOG" },
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
                NEW: { value: "NEW" },
                IN_PROGRESS: { value: "IN_PROGRESS" },
                RESOLVED: { value: "RESOLVED" },
                REOPENED: { value: "REOPENED" },
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
              URGENT: { value: "URGENT" },
              HIGH: { value: "HIGH" },
              NORMAL: { value: "NORMAL" },
              BACKLOG: { value: "BACKLOG" },
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
              URGENT: { value: "URGENT" },
              HIGH: { value: "HIGH" },
              NORMAL: { value: "NORMAL" },
              BACKLOG: { value: "BACKLOG" },
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
                NEW: { value: "NEW" },
                IN_PROGRESS: { value: "IN_PROGRESS" },
                RESOLVED: { value: "RESOLVED" },
                REOPENED: { value: "REOPENED" },
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
    addTaskComment: {
      type: CommentType,
      args: {
        taskId: { type: new GraphQLNonNull(GraphQLID) },
        content: { type: new GraphQLNonNull(GraphQLString) },
      },
      resolve: commentResolvers.Mutation.addTaskComment,
    },
    addSubTaskComment: {
      type: CommentType,
      args: {
        subTaskId: { type: new GraphQLNonNull(GraphQLID) },
        content: { type: new GraphQLNonNull(GraphQLString) },
      },
      resolve: commentResolvers.Mutation.addSubTaskComment,
    },
    updateComment: {
      type: CommentType,
      args: {
        id: { type: new GraphQLNonNull(GraphQLID) },
        content: { type: new GraphQLNonNull(GraphQLString) },
      },
      resolve: commentResolvers.Mutation.updateComment,
    },
    deleteComment: {
      type: CommentType,
      args: {
        id: { type: new GraphQLNonNull(GraphQLID) },
      },
      resolve: commentResolvers.Mutation.deleteComment,
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
    markNotificationsRead: {
      type: new GraphQLList(NotificationType),
      args: {
        ids: { type: new GraphQLNonNull(new GraphQLList(new GraphQLNonNull(GraphQLID))) },
      },
      resolve: notificationResolvers.Mutation.markNotificationsRead,
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
              LIGHT: { value: "LIGHT" },
              DARK: { value: "DARK" },
            },
          }),
        },
        language: {
          type: new GraphQLEnumType({
            name: "Language",
            values: {
              ENGLISH: { value: "ENGLISH" },
              JAPANESE: { value: "JAPANESE" },
              KOREAN: { value: "KOREAN" },
            },
          }),
        },
      },
      resolve: preferenceResolvers.Mutation.updatePreference,
    },
  },
});

const Subscription = new GraphQLObjectType({
  name: "Subscription",
  fields: {
    notificationCreated: {
      type: NotificationType,
      subscribe:
        notificationResolvers.Subscription.notificationCreated.subscribe,
      resolve: notificationResolvers.Subscription.notificationCreated.resolve,
    },
  },
});

const schema = new GraphQLSchema({
  query: RootQuery,
  mutation: Mutation,
  subscription: Subscription,
});

export default schema;
