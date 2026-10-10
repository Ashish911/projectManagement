import {
  GraphQLObjectType,
  GraphQLID,
  GraphQLString,
  GraphQLNonNull,
} from "graphql";
import { LOCKOUT_MS, MAX_LOGIN_ATTEMPTS } from "../../services/user.service.js";

const toIso = (value) => (value ? new Date(value).toISOString() : null);

/** ACTIVE, LOCKED (too many failed sign-ins, within the lockout window) or INVITED (never signed in). */
const accountStatus = (u) => {
  const lockedSince = u.lastFailedLogin ? new Date(u.lastFailedLogin).getTime() : 0;
  if (u.loginAttempts >= MAX_LOGIN_ATTEMPTS && Date.now() - lockedSince < LOCKOUT_MS) return "LOCKED";
  if (u.invitedAt && !u.lastLoginAt) return "INVITED";
  return "ACTIVE";
};

export const UserType = new GraphQLObjectType({
  name: "User",
  fields: {
    id: { type: new GraphQLNonNull(GraphQLID) },
    name: { type: new GraphQLNonNull(GraphQLString) },
    email: { type: new GraphQLNonNull(GraphQLString) },
    number: { type: new GraphQLNonNull(GraphQLString) },
    role: { type: new GraphQLNonNull(GraphQLString) },
    // Optional for invited users
    dob: { type: GraphQLString },
    gender: { type: new GraphQLNonNull(GraphQLString) },
    status: { type: new GraphQLNonNull(GraphQLString), resolve: accountStatus },
    lastLoginAt: { type: GraphQLString, resolve: (u) => toIso(u.lastLoginAt) },
  },
});

export const AuthType = new GraphQLObjectType({
  name: "Auth",
  fields: {
    id: { type: new GraphQLNonNull(GraphQLID) },
    email: { type: new GraphQLNonNull(GraphQLString) },
    token: { type: new GraphQLNonNull(GraphQLString) },
    tokenExpiration: { type: new GraphQLNonNull(GraphQLString) },
  },
});

export const ForgotPasswordType = new GraphQLObjectType({
  name: "ForgotPassword",
  fields: {
    // Always null now: the token is emailed, never returned. Kept so existing queries still validate.
    token: {
      type: GraphQLString,
      deprecationReason: "The reset token is sent by email.",
    },
    message: { type: new GraphQLNonNull(GraphQLString) },
  },
});

export const MessageType = new GraphQLObjectType({
  name: "Message",
  fields: {
    message: { type: new GraphQLNonNull(GraphQLString) },
  },
});
