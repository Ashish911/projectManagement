import { UserService } from "../../services/user.service.js";
import {GraphQLList, GraphQLNonNull, GraphQLID} from "graphql";

export const userResolvers = {
    Query: {
        profile: async (_, args, context) => {
            const { user } = context;

            if (!user) {
                throw new Error("Unauthorized");
            }

            return await UserService.getProfile(user.id)
        }
    },
    Mutation: {
        login: async (_, { email, password }) => await UserService.login(email, password),
        register: async (_, args) => await UserService.register(args),
        // resetPassword
        // forgotPassword
        // loginViaOauth
    },
};