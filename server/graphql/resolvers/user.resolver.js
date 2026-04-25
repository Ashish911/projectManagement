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
    login: async (_, { email, password }) =>
      await UserService.login(email, password),
    register: async (_, args) => await UserService.register(args),
    promoteToAdmin: async (_, { userId }, context) =>
      await UserService.promoteToAdmin(userId, context),
    // resetPassword
    // forgotPassword
    // loginViaOauth
  },
};
