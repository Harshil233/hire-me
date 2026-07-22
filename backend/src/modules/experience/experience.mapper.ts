import type { Experience } from './experience.interface';
import type { ExperienceResponse } from './experience.schema';

export const toExperienceResponse = (experience: Experience): ExperienceResponse => ({
  id: experience.id,
  title: experience.title,
  companyName: experience.companyName,
  description: experience.description,
  startDate: experience.startDate.toISOString(),
  endDate: experience.endDate?.toISOString(),
  isCurrent: experience.isCurrent,
  skills: [...experience.skills],
  createdAt: experience.createdAt.toISOString(),
  updatedAt: experience.updatedAt.toISOString(),
});
