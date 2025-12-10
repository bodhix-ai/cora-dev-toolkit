/**
 * This barrel file serves as the public API for the module's frontend.
 * It exports all the necessary components, hooks, types, and client factories
 * that other parts of the application can consume.
 *
 * By using a barrel file, we can simplify imports in other modules, like so:
 * import { ExampleComponent, useModuleData } from "@sts-career/module-template";
 */

// Components
export { ExampleComponent } from "./components/ExampleComponent";

// Hooks
export { useModuleData } from "./hooks/useModuleData";

// API Client
export { createModuleClient } from "./lib/api";

// Types
export type {
  ModuleEntity,
  CreateModuleEntityDto,
  UpdateModuleEntityDto,
} from "./types";
