import { ProjectRepo } from "../repositories/project.repo.js";

export const ProjectService = {
    async getProjects() {
        const projects = await ProjectRepo.find();

        return projects;
    },
    async getProject(id) {
        const project = await ProjectRepo.findById(id);
        if (!project) throw new Error("Project not found");
        return project;
    },
}