import Client from "../models/Client.js";
import Project from "../models/Project.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

import {
  GraphQLString,
  GraphQLObjectType,
  GraphQLSchema,
  GraphQLID,
  GraphQLInt,
  GraphQLList,
  GraphQLNonNull,
  GraphQLEnumType,
} from "graphql";
import User from "../models/User.js";
import { request } from "express";
import { removeObject } from "../util.js";
import Preference from "../models/Preference.js";

const UserType = new GraphQLObjectType({
  name: "User",
  fields: {
    id: { type: new GraphQLNonNull(GraphQLID) },
    name: { type: new GraphQLNonNull(GraphQLString) },
    email: { type: new GraphQLNonNull(GraphQLString) },
    number: { type: new GraphQLNonNull(GraphQLString) },
    role: { type: new GraphQLNonNull(GraphQLString) },
    dob: { type: new GraphQLNonNull(GraphQLString) },
    gender: { type: new GraphQLNonNull(GraphQLString) },
  },
});

const AuthType = new GraphQLObjectType({
  name: "Auth",
  fields: {
    id: { type: new GraphQLNonNull(GraphQLID) },
    email: { type: new GraphQLNonNull(GraphQLString) },
    token: { type: new GraphQLNonNull(GraphQLString) },
    tokenExpiration: { type: new GraphQLNonNull(GraphQLInt) },
  },
});

// Client
const ClientType = new GraphQLObjectType({
  name: "Client",
  fields: {
    id: { type: GraphQLID },
    name: { type: GraphQLString },
    email: { type: GraphQLString },
    phone: { type: GraphQLString },
    user: {
      type: UserType,
      resolve: (parent, args) => {
        return User.findById(parent.assignedUser);
      },
    },
  },
});

// Project
const ProjectType = new GraphQLObjectType({
  name: "Project",
  fields: {
    id: { type: GraphQLID },
    name: { type: GraphQLString },
    description: { type: GraphQLString },
    status: { type: GraphQLString },
    client: {
      type: ClientType,
      resolve: (parent, args) => {
        return Client.findById(parent.clientId);
      },
    },
    user: {
      type: UserType,
      resolve: (parent, args) => {
        return User.findById(parent.assignedUser);
      },
    },
  },
});

// Task
const TaskType = new GraphQLObjectType({
  name: "Task",
  fields: {
    id: { type: new GraphQLNonNull(GraphQLID) },
    priority: { type: new GraphQLNonNull(GraphQLString) },
    deadline: { type: new GraphQLNonNull(GraphQLString) },
    currentStatus: { type: new GraphQLNonNull(GraphQLString) },
    assignedTo: {
      type: UserType,
      resolve: (parent, args) => {
        return User.findById(parent.id);
      },
    },
    createdBy: {
      type: UserType,
      resolve: (parent, args) => {
        return User.findById(parent.id);
      },
    },
    project: {
      type: ProjectType,
      resolve: (parent, args) => {
        return Project.findById(parent);
      },
    },
  },
});

// Sub Task
const SubTaskType = new GraphQLObjectType({
  name: "SubTask",
  fields: {
    id: { type: new GraphQLNonNull(GraphQLID) },
    priority: { type: new GraphQLNonNull(GraphQLString) },
    deadline: { type: new GraphQLNonNull(GraphQLString) },
    currentStatus: { type: new GraphQLNonNull(GraphQLString) },
    assignedTo: {
      type: UserType,
      resolve: (parent, args) => {
        return User.findById(parent);
      },
    },
    createdBy: {
      type: UserType,
      resolve: (parent, args) => {
        return User.findById(parent);
      },
    },
  },
});

// Notification
const NotificationType = new GraphQLObjectType({
  name: "Notification",
  fields: {
    id: { type: new GraphQLNonNull(GraphQLID) },
    content: { type: new GraphQLNonNull(GraphQLString) },
    status: { type: new GraphQLNonNull(GraphQLString) },
    user: {
      type: UserType,
      resolve: (parent, args) => {
        return User.findById(parent);
      },
    },
  },
});

const PreferenceType = new GraphQLObjectType({
  name: "Preference",
  fields: {
    id: { type: new GraphQLNonNull(GraphQLID) },
    theme: { type: new GraphQLNonNull(GraphQLString) },
    language: { type: new GraphQLNonNull(GraphQLString) },
    user: {
      type: UserType,
      resolve: (parent, args) => {
        return User.findById(parent);
      },
    },
  },
});

const RootQuery = new GraphQLObjectType({
  name: "RootQueryType",
  fields: {
    profile: {
      type: UserType,
      args: { id: { type: new GraphQLNonNull(GraphQLID) } },
      resolve: (parent, args) => {
        return User.findById(args.id);
      },
    },
    projects: {
      type: new GraphQLList(ProjectType),
      resolve: (parent, args) => {
        return Project.find();
      },
    },
    project: {
      type: ProjectType,
      args: { id: { type: new GraphQLNonNull(GraphQLID) } },
      resolve: (parent, args) => {
        return Project.findById(args.id);
      },
    },
    clients: {
      type: new GraphQLList(ClientType),
      resolve: (parent, args) => {
        return Client.find();
      },
    },
    client: {
      type: ClientType,
      args: { id: { type: new GraphQLNonNull(GraphQLID) } },
      resolve: (parent, args) => {
        return Client.findById(args.id);
      },
    },
    notification: {
      type: NotificationType,
      args: { user: { type: new GraphQLNonNull(GraphQLID) } },
      resolve: (parent, args) => {
        return Notification.findOne({ user: args.user });
      },
    },
    preference: {
      type: PreferenceType,
      args: { user: { type: new GraphQLNonNull(GraphQLID) } },
      resolve: (parent, args) => {
        return Preference.findOne({ user: args.user });
      },
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
      resolve: async (parent, args) => {
        console.log("Login Section");
        const user = await User.find({ email: args.email });

        if (!user[0]?.email) {
          throw new Error("User not found");
        }

        console.log("User Found");

        if (user[0]?.loginAttempts >= 5 && user[0]?.lastFailedLogin) {
          const lastFailedLoginTime = new Date(
            user[0]?.lastFailedLogin
          ).getTime();
          const currentTime = new Date().getTime();
          const timeSinceLastFailedLogin = currentTime - lastFailedLoginTime;

          if (timeSinceLastFailedLogin < 3600000) {
            throw new Error(
              "Too many failed login attempts. Please try again after 1 hr."
            );
          }
        }

        const validPassword = await bcrypt.compare(
          args.password,
          user[0]?.password
        );
        if (!validPassword) {
          user[0].loginAttempts += 1;
          user[0].lastFailedLogin = new Date().toISOString();

          await User.updateOne(
            { email: user[0]?.email },
            {
              loginAttempts: user[0]?.loginAttempts,
              lastFailedLogin: user[0]?.lastFailedLogin,
            }
          );

          //   await User.save(user);
          throw new Error("Invalid password");
        }

        console.log("Password Valid");

        user.loginAttempts = 0;
        user.lastFailedLogin = null;
        await User.updateOne(
          { email: user[0]?.email },
          {
            loginAttempts: user[0]?.loginAttempts,
            lastFailedLogin: user[0]?.lastFailedLogin,
          }
        );

        const token = jwt.sign(
          { id: user[0]?.id, email: user[0]?.email, role: user[0]?.role },
          process.env.SECRET_KEY,
          { expiresIn: "1h" }
        );

        return {
          id: user[0]?.id,
          email: user[0]?.email,
          token,
          tokenExpiration: 1,
        };
      },
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
              su: { value: "Super Admin" },
              ca: { value: "Client Admin" },
              u: { value: "User" },
            },
          }),
          defaultValue: "User",
        },
        gender: {
          type: new GraphQLEnumType({
            name: "Gender",
            values: {
              M: { value: "Male" },
              F: { value: "Female" },
              O: { value: "Others" },
            },
          }),
          defaultValue: "Male",
        },
      },
      resolve: async (parent, args) => {
        const email = await User.findOne({ email: args.email });

        if (email != null) {
          if (!email[0]?.email) {
            throw new Error(
              "Email already exists please use a different email"
            );
          }
        }

        const hashedPassword = await bcrypt.hash(args.password, 10);

        const user = new User({
          name: args.name,
          email: args.email,
          number: args.number,
          role: args.role,
          dob: args.dob,
          gender: args.gender,
          password: hashedPassword,
          loginAttempts: 0,
          lastFailedLogin: null,
        });

        await user.save();

        // Default Preference save
        const preference = new Preference({
          theme: "Light",
          language: "English",
          user: user,
        });

        await preference.save();

        return await user.save();
      },
    },
    addClient: {
      type: ClientType,
      args: {
        name: { type: new GraphQLNonNull(GraphQLString) },
        email: { type: new GraphQLNonNull(GraphQLString) },
        phone: { type: new GraphQLNonNull(GraphQLString) },
        user: { type: new GraphQLNonNull(GraphQLID) },
      },
      resolve: async (parent, args, context) => {
        const token = context.request.headers.authorization.replace(
          "Bearer ",
          ""
        );

        const decoded = jwt.verify(token, process.env.SECRET_KEY);

        if (decoded.role != "Super Admin") {
          throw new Error(
            "Current role does not have the permission to ADD Clients"
          );
        }

        const clientEmail = await Client.findOne({ email: args.email });

        if (clientEmail != null) {
          throw new Error(
            "Client email already exists please use a different email"
          );
        }

        const selectedUser = await User.findById(args.user);

        if (selectedUser?.role != "Client Admin") {
          throw new Error(
            "Users with Role Client admins are only allowed to be assigned for a particular client"
          );
        }

        const usedClient = await Client.findOne({ assignedAdmin: args.user });

        if (usedClient != null) {
          throw new Error(
            "User has already been assigned admin for another client"
          );
        }

        const client = new Client({
          name: args.name,
          email: args.email,
          phone: args.phone,
          assignedAdmin: args.user,
        });

        return await client.save();
      },
    },
    deleteClient: {
      type: ClientType,
      args: {
        id: { type: new GraphQLNonNull(GraphQLID) },
      },
      resolve: async (parent, args, context) => {
        const token = context.request.headers.authorization.replace(
          "Bearer ",
          ""
        );
        const decoded = jwt.verify(token, process.env.SECRET_KEY);

        if (decoded.role != "Super Admin") {
          throw new Error(
            "Current role does not have the permission to delete Clients"
          );
        }

        Project.find({ clientId: args.id }).then((projects) => {
          projects.forEach((project) => {
            project.deleteOne();
          });
        });

        return await Client.findByIdAndRemove(args.id);
      },
    },
    updateClient: {
      type: ClientType,
      args: {
        id: { type: new GraphQLNonNull(GraphQLID) },
        name: { type: new GraphQLNonNull(GraphQLString) },
        email: { type: new GraphQLNonNull(GraphQLString) },
        phone: { type: new GraphQLNonNull(GraphQLString) },
        user: { type: new GraphQLNonNull(GraphQLID) },
      },
      resolve: async (parent, args) => {
        const token = context.request.headers.authorization.replace(
          "Bearer ",
          ""
        );
        const decoded = jwt.verify(token, process.env.SECRET_KEY);

        if (decoded.role != "Super Admin") {
          throw new Error(
            "Current role does not have the permission to delete Clients"
          );
        }

        const duplicateEmail = Client.find({ email: args?.email });

        if (duplicateEmail != null) {
          throw new Error("Email already exists");
        }

        const selectedUser = await User.findById(args.user);

        if (selectedUser?.role != "Client Admin") {
          throw new Error(
            "Users with Role Client admins are only allowed to be assigned for a particular client"
          );
        }

        const usedClient = await Client.findOne({ assignedAdmin: args.user });

        if (usedClient != null) {
          throw new Error(
            "User has already been assigned admin for another client"
          );
        }

        return await Client.findByIdAndUpdate(
          args.id,
          {
            $set: {
              name: args.name,
              email: args.email,
              phone: args.phone,
              assignedAdmin: args.user,
            },
          },
          { new: true }
        );
      },
    },
    addProject: {
      type: ProjectType,
      args: {
        name: { type: new GraphQLNonNull(GraphQLString) },
        description: { type: new GraphQLNonNull(GraphQLString) },
        status: {
          type: new GraphQLEnumType({
            name: "ProjectStatus",
            values: {
              new: { value: "Not Started" },
              progress: { value: "In Progress" },
              completed: { value: "Completed" },
            },
          }),
          defaultValue: "Not Started",
        },
        clientId: { type: new GraphQLNonNull(GraphQLID) },
      },
      resolve: async (parent, args, context) => {
        const token = context.request.headers.authorization.replace(
          "Bearer ",
          ""
        );
        const decoded = jwt.verify(token, process.env.SECRET_KEY);

        if (decoded.role == "User") {
          throw new Error(
            "Current role does not have the permission to Add Projects"
          );
        }

        const client = await Client.findById(args.clientId);
        let clientId = removeObject(client.assignedAdmin);

        if (clientId != decoded.id) {
          throw new Error("Current user is not a client admin of this client.");
        }

        const project = new Project({
          name: args.name,
          description: args.description,
          status: args.status,
          clientId: args.clientId,
        });

        return await project.save();
      },
    },
    addUserToProject: {
      type: ProjectType,
      args: {
        user: { type: new GraphQLNonNull(new GraphQLList(GraphQLID)) },
        id: { type: new GraphQLNonNull(GraphQLID) },
      },
      resolve: async (parent, args, context) => {
        const token = context.request.headers.authorization.replace(
          "Bearer ",
          ""
        );
        const decoded = jwt.verify(token, process.env.SECRET_KEY);

        if (decoded.role == "User") {
          throw new Error(
            "Current role does not have the permission to new users to Projects"
          );
        }

        const currentProject = await Project.findById(args.id);

        const client = await Client.findById(currentProject.clientId);
        let clientId = removeObject(client.assignedAdmin);

        if (clientId != decoded.id) {
          throw new Error("Current user is not a client admin of this client.");
        }

        args.user.forEach((it) => {
          if (currentProject.assignedUser.includes(it) == false) {
            currentProject.assignedUser.push(it);
          }
        });

        return await currentProject.save();
      },
    },
    deleteProject: {
      type: ProjectType,
      args: { id: { type: new GraphQLNonNull(GraphQLID) } },
      resolve: async (parent, args, content) => {
        const token = context.request.headers.authorization.replace(
          "Bearer ",
          ""
        );
        const decoded = jwt.verify(token, process.env.SECRET_KEY);

        if (decoded.role == "User") {
          throw new Error(
            "Current role does not have the permission to delete Projects"
          );
        }

        const client = await Client.findById(args.clientId);
        let clientId = removeObject(client.assignedAdmin);

        if (clientId != decoded.id) {
          throw new Error("Current user is not a client admin of this client.");
        }

        return Project.findByIdAndRemove(args.id);
      },
    },
    deleteUserFromProject: {
      type: ProjectType,
      args: {
        user: { type: new GraphQLNonNull(new GraphQLList(GraphQLID)) },
        id: { type: new GraphQLNonNull(GraphQLID) },
      },
      resolve: async (parent, args, context) => {
        const token = context.request.headers.authorization.replace(
          "Bearer ",
          ""
        );
        const decoded = jwt.verify(token, process.env.SECRET_KEY);

        if (decoded.role == "User") {
          throw new Error(
            "Current role does not have the permission to delete users from the Projects"
          );
        }

        const currentProject = await Project.findById(args.id);

        const client = await Client.findById(currentProject.clientId);
        let clientId = removeObject(client.assignedAdmin);

        if (clientId != decoded.id) {
          throw new Error("Current user is not a client admin of this client.");
        }

        args.user.forEach((it) => {
          if (currentProject.assignedUser.includes(it) == true) {
            let index = currentProject.assignedUser.indexOf(it);
            currentProject.assignedUser.splice(index, 1);
          }
        });

        return await currentProject.save();
      },
    },
    updateProject: {
      type: ProjectType,
      args: {
        id: { type: new GraphQLNonNull(GraphQLID) },
        name: { type: new GraphQLNonNull(GraphQLString) },
        description: { type: new GraphQLNonNull(GraphQLString) },
        status: {
          type: new GraphQLEnumType({
            name: "UpdateProjectStatus",
            values: {
              new: { value: "Not Started" },
              progress: { value: "In Progress" },
              completed: { value: "Completed" },
            },
          }),
          defaultValue: "Not Started",
        },
      },
      resolve: async (parent, args, context) => {
        const token = context.request.headers.authorization.replace(
          "Bearer ",
          ""
        );
        const decoded = jwt.verify(token, process.env.SECRET_KEY);

        if (decoded.role == "User") {
          throw new Error(
            "Current role does not have the permission to Add Projects"
          );
        }

        const client = await Client.findById(args.clientId);
        let clientId = removeObject(client.assignedAdmin);

        if (clientId != decoded.id) {
          throw new Error("Current user is not a client admin of this client.");
        }

        return Project.findByIdAndUpdate(
          args.id,
          {
            $set: {
              name: args.name,
              description: args.description,
              status: args.status,
            },
          },
          { new: true }
        );
      },
    },
  },
});

const schema = new GraphQLSchema({
  query: RootQuery,
  mutation: Mutation,
});

export default schema;
