import { User } from "@clerk/nextjs/server";

declare global {
  interface CustomJwtSessionClaims {
    publicMetadata: {
      sys_role?: "sys_admin";
    };
  }
}
