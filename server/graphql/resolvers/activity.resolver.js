import { ActivityService } from "../../services/activity.service.js";

export const activityResolvers = {
  Query: {
    activity: async (_, args, context) => await ActivityService.list(args, context),
  },
};
