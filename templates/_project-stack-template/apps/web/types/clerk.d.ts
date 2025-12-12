import { User } from "@clerk/nextjs/server";

declare global {
  interface CustomJwtSessionClaims {
    publicMetadata: {
      global_role?: "super_admin";
    };
  }
}
