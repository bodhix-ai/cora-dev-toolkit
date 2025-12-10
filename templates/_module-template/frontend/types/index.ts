/**
 * Represents a single entity within this module.
 *
 * This is a placeholder type. In a real module, this would be replaced
 * with the actual data model, likely imported from a shared types package
 * or defined directly here if the type is specific to the frontend.
 */
export interface ModuleEntity {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Represents the data required to create a new entity.
 *
 * This is a placeholder for the payload used in a POST request.
 */
export type CreateModuleEntityDto = Omit<
  ModuleEntity,
  "id" | "createdAt" | "updatedAt"
>;

/**
 * Represents the data required to update an existing entity.
 *
 * This is a placeholder for the payload used in a PATCH or PUT request.
 * It makes all fields optional to allow for partial updates.
 */
export type UpdateModuleEntityDto = Partial<CreateModuleEntityDto>;
