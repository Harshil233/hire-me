import type { Project } from './project.interface';
import type { ProjectResponse } from './project.schema';

export const toProjectResponse = (project: Project): ProjectResponse => ({
  id: project.id,
  title: project.title,
  description: project.description,
  skills: [...project.skills],
  domain: project.domain,
  link: project.link,
  startDate: project.startDate.toISOString(),
  endDate: project.endDate?.toISOString(),
  isCurrent: project.isCurrent,
  createdAt: project.createdAt.toISOString(),
  updatedAt: project.updatedAt.toISOString(),
});
