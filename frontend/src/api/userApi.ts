import { PROFILE, GET_USERS } from "@/queries/userQueries.ts";
import {
  DELETE_USER,
  PROMOTE_TO_ADMIN,
  UPDATE_PROFILE,
  CREATE_USER,
  UPDATE_USER,
  CHANGE_USER_ROLES,
  UNLOCK_USERS,
  RESEND_INVITE,
  DELETE_USERS,
  CHANGE_PASSWORD,
} from "@/mutations/userMutations.ts";
import { gql } from "@/api/graphql";
import type { User, ProfileResponse, Role } from "@/types/userTypes.ts";

export const getProfile = async (): Promise<ProfileResponse> => await gql<ProfileResponse>(PROFILE);

export const getUsers = async (): Promise<User[]> => (await gql<{ users: User[] }>(GET_USERS)).users;

export const deleteUser = async (userId: string): Promise<void> => {
  await gql(DELETE_USER, { userId });
};

export const updateProfile = async (data: {
  name?: string;
  number?: string;
  dob?: string;
  gender?: string;
}): Promise<User> => (await gql<{ updateProfile: User }>(UPDATE_PROFILE, data)).updateProfile;

export const promoteToAdmin = async (userId: string): Promise<User> =>
  (await gql<{ promoteToAdmin: User }>(PROMOTE_TO_ADMIN, { userId })).promoteToAdmin;

// ── Administration (SUPER_ADMIN) ─────────────────────────────────

export type NewUser = {
  name: string;
  email: string;
  number: string;
  gender: string;
  dob?: string | null;
  role: Role;
  clientId?: string | null;
  /** INVITE emails a link to set a password; PASSWORD sets a temporary one */
  mode: "INVITE" | "PASSWORD";
  password?: string | null;
};

export const createUser = async (vars: NewUser): Promise<User> =>
  (await gql<{ createUser: User }>(CREATE_USER, vars)).createUser;

export const updateUser = async (vars: { id: string; name?: string; email?: string; number?: string; gender?: string; dob?: string | null }): Promise<User> =>
  (await gql<{ updateUser: User }>(UPDATE_USER, vars)).updateUser;

export const changeUserRoles = async (ids: string[], role: Role, clientId?: string | null): Promise<User[]> =>
  (await gql<{ changeUserRoles: User[] }>(CHANGE_USER_ROLES, { ids, role, clientId: clientId || null })).changeUserRoles;

export const unlockUsers = async (ids: string[]): Promise<User[]> =>
  (await gql<{ unlockUsers: User[] }>(UNLOCK_USERS, { ids })).unlockUsers;

export const resendInvite = async (id: string): Promise<string> =>
  (await gql<{ resendInvite: { message: string } }>(RESEND_INVITE, { id })).resendInvite.message;

export const deleteUsers = async (ids: string[]): Promise<void> => {
  await gql(DELETE_USERS, { ids });
};

/** The current user's own password. */
export const changePassword = async (currentPassword: string, newPassword: string): Promise<void> => {
  await gql(CHANGE_PASSWORD, { currentPassword, newPassword });
};
