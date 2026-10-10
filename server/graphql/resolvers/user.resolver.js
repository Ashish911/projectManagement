import { UserService } from "../../services/user.service.js";
import { GraphQLList, GraphQLNonNull, GraphQLID } from "graphql";

export const userResolvers = {
  Query: {
    profile: async (_, args, context) => {
      const { user } = context;

      if (!user) {
        throw new Error("Unauthorized");
      }

      return await UserService.getProfile(user.id);
    },
    users: async (_, args, context) => await UserService.getUsers(context),
    user: async (_, { id }, context) => await UserService.getUser(id, context),
  },
  Mutation: {
    login: async (_, { email, password }, context) =>
      await UserService.login(email, password, context),
    register: async (_, args, context) =>
      await UserService.register(args, context),
    promoteToAdmin: async (_, { userId }, context) =>
      await UserService.promoteToAdmin(userId, context),
    deleteUser: async (_, { userId }, context) =>
      await UserService.deleteUser(userId, context),
    updateProfile: async (_, args, context) =>
      await UserService.updateProfile(args, context),
    forgotPassword: async (_, { email }, context) =>
      await UserService.forgotPassword(email, context),
    resetPassword: async (_, { token, password }, context) =>
      await UserService.resetPassword(token, password, context),
    createUser: async (_, args, context) =>
      await UserService.createUser(args, context),
    updateUser: async (_, args, context) =>
      await UserService.updateUser(args, context),
    changeUserRoles: async (_, args, context) =>
      await UserService.changeUserRoles(args, context),
    unlockUsers: async (_, { ids }, context) =>
      await UserService.unlockUsers(ids, context),
    resendInvite: async (_, { id }, context) =>
      await UserService.resendInvite(id, context),
    deleteUsers: async (_, { ids }, context) =>
      await UserService.deleteUsers(ids, context),
    changePassword: async (_, args, context) =>
      await UserService.changePassword(args, context),
  },
};
