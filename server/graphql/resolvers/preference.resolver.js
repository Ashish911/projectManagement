import { PreferenceService } from "../../services/preference.service.js";

export const preferenceResolvers = {
  Query: {
    preference: async (_, args, context) =>
      await PreferenceService.getPreference(context),
  },
  Mutation: {
    updatePreference: async (_, args, context) =>
      await PreferenceService.updatePreference(args, context),
  },
};
