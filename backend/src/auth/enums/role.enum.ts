/**
 * TASK-33 / TASK-34
 */

export enum Role {
  ADMIN = 'ADMIN',
  PROJECT_MANAGER = 'PROJECT_MANAGER', // Must NOT access cost-to-company data
  CONSULTANT_MANAGER = 'CONSULTANT_MANAGER',
  CONSULTANT = 'CONSULTANT',
}
