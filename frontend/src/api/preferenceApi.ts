import { GET_PREFERENCE } from "@/queries/preferenceQueries.ts";
import { UPDATE_PREFERENCE } from "@/mutations/preferenceMutations.ts";
import { gql } from "@/api/graphql";

export interface Preference {
  id: string;
  theme: "LIGHT" | "DARK";
  language: "ENGLISH" | "JAPANESE" | "KOREAN";
}

export const getPreference = async (): Promise<Preference> =>
  (await gql<{ preference: Preference }>(GET_PREFERENCE)).preference;

export const updatePreference = async (
  variables: Partial<Pick<Preference, "theme" | "language">>
): Promise<Preference> =>
  (await gql<{ updatePreference: Preference }>(UPDATE_PREFERENCE, variables)).updatePreference;
