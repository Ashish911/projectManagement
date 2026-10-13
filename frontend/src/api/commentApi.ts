import { gql } from "@/api/graphql";
import { ADD_TASK_COMMENT, DELETE_COMMENT, GET_TASK_COMMENTS } from "@/mutations/commentMutations";
import type { Comment } from "@/types/commentTypes";

/** A task's own comment thread, oldest first. */
export const getTaskComments = async (taskId: string): Promise<Comment[]> =>
    (await gql<{ taskComments: Comment[] }>(GET_TASK_COMMENTS, { taskId })).taskComments;

export const addTaskComment = async (taskId: string, content: string): Promise<Comment> =>
    (await gql<{ addTaskComment: Comment }>(ADD_TASK_COMMENT, { taskId, content })).addTaskComment;

export const deleteComment = async (id: string): Promise<void> => {
    await gql(DELETE_COMMENT, { id });
};
