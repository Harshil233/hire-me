import type { Education } from './education.interface';
import type { EducationResponse } from './education.schema';

export const toEducationResponse = (education: Education): EducationResponse => ({
  id: education.id,
  college: education.college,
  course: education.course,
  degree: education.degree,
  description: education.description,
  startDate: education.startDate.toISOString(),
  endDate: education.endDate?.toISOString(),
  isCurrent: education.isCurrent,
  createdAt: education.createdAt.toISOString(),
  updatedAt: education.updatedAt.toISOString(),
});
