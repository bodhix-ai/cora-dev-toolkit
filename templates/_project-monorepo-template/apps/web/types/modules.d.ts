// Ambient module declarations for CORA modules (without .d.ts files)
declare module '@{{PROJECT_NAME}}/module-access' {
  export const useProfile: any;
  export const useAuth: any;
  export const useUser: any;
  export * from '@{{PROJECT_NAME}}/module-access';
}

declare module '@{{PROJECT_NAME}}/module-access/admin' {
  export const useUser: any;
  export * from '@{{PROJECT_NAME}}/module-access/admin';
}

declare module '@{{PROJECT_NAME}}/module-ai' {
  export * from '@{{PROJECT_NAME}}/module-ai';
}

declare module '@{{PROJECT_NAME}}/module-ai/admin' {
  export * from '@{{PROJECT_NAME}}/module-ai/admin';
}

declare module '@{{PROJECT_NAME}}/module-ws' {
  export * from '@{{PROJECT_NAME}}/module-ws';
}

declare module '@{{PROJECT_NAME}}/module-ws/admin' {
  export * from '@{{PROJECT_NAME}}/module-ws/admin';
}

declare module '@{{PROJECT_NAME}}/module-kb' {
  export * from '@{{PROJECT_NAME}}/module-kb';
}

declare module '@{{PROJECT_NAME}}/module-kb/admin' {
  export * from '@{{PROJECT_NAME}}/module-kb/admin';
}

declare module '@{{PROJECT_NAME}}/module-chat' {
  export * from '@{{PROJECT_NAME}}/module-chat';
}

declare module '@{{PROJECT_NAME}}/module-chat/admin' {
  export * from '@{{PROJECT_NAME}}/module-chat/admin';
}

declare module '@{{PROJECT_NAME}}/module-eval' {
  export * from '@{{PROJECT_NAME}}/module-eval';
}

declare module '@{{PROJECT_NAME}}/module-eval/admin' {
  export * from '@{{PROJECT_NAME}}/module-eval/admin';
}

declare module '@{{PROJECT_NAME}}/module-voice' {
  export * from '@{{PROJECT_NAME}}/module-voice';
}

declare module '@{{PROJECT_NAME}}/module-voice/admin' {
  export * from '@{{PROJECT_NAME}}/module-voice/admin';
}

declare module '@{{PROJECT_NAME}}/module-mgmt' {
  export * from '@{{PROJECT_NAME}}/module-mgmt';
}

declare module '@{{PROJECT_NAME}}/module-mgmt/admin' {
  export * from '@{{PROJECT_NAME}}/module-mgmt/admin';
}

declare module '@{{PROJECT_NAME}}/module-eval-studio' {
  export * from '@{{PROJECT_NAME}}/module-eval-studio';
}
