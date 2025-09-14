import { ProjectRepo } from "../repositories/project.repo.js";

export const ProjectService = {
    async getProjects() {
        const projects = await ProjectRepo.find();

        return gqlResponse(projects, "Projects retrieved successfully");
    },
    async getProject(id) {
        const project = await ProjectRepo.findById(id);
        if (!project) return gqlError("Project not found");
        return gqlResponse(project, "Project retrieved successfully");
    }
}