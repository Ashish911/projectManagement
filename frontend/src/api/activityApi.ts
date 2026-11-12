import { GET_ACTIVITY } from "@/queries/activityQueries";
import { gql } from "@/api/graphql";

/** A server-recorded event (role change, reopen…), scoped to what the caller may see. */
export interface ActivityEntry {
    id: string;
    action: string;
    summary: string;
    reason?: string | null;
    createdAt: string | null;
    actor?: { id: string; name: string } | null;
}

export const getActivity = async (limit = 20): Promise<ActivityEntry[]> =>
    (await gql<{ activity: ActivityEntry[] }>(GET_ACTIVITY, { limit })).activity ?? [];
