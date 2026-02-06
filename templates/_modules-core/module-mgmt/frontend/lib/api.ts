/**
 * Lambda Management Module - API Client
 *
 * Provides type-safe API methods for interacting with the Lambda Management Lambda.
 * Uses CORA-compliant authentication and the new platform endpoints.
 */

import { createCoraAuthenticatedClient } from "@{{PROJECT_NAME}}/api-client";
import type {
  LambdaConfig,
  LambdaWarmingConfig,
  LambdaFunctionInfo,
  EventBridgeSyncResult,
  ApiResponse,
  ConfigValue,
} from "../types";

/**
 * Lambda Management API Client
 *
 * Communicates with the Lambda Management Lambda via system admin endpoints:
 * - GET /admin/sys/mgmt/schedule - List all warming schedule configurations
 * - GET /admin/sys/mgmt/schedule/{configKey} - Get specific schedule config
 * - PUT /admin/sys/mgmt/schedule/{configKey} - Update schedule config (triggers EventBridge sync)
 * - GET /admin/sys/mgmt/functions - List Lambda functions
 * - POST /admin/sys/mgmt/schedule/sync - Manual EventBridge sync
 */
export class LambdaMgmtApiClient {
  private client: ReturnType<typeof createCoraAuthenticatedClient>;

  constructor(token: string) {
    this.client = createCoraAuthenticatedClient(token);
  }

  /**
   * List all Lambda warming schedule configurations
   */
  async listConfigs(): Promise<LambdaConfig[]> {
    try {
      const response = await this.client.get<LambdaConfig[]>(
        "/admin/sys/mgmt/schedule"
      );
      return Array.isArray(response) ? response : [];
    } catch (error) {
      console.error("Failed to list Lambda configs:", error);
      throw new Error("Failed to load Lambda configurations");
    }
  }

  /**
   * Get a specific Lambda warming schedule configuration by key
   *
   * @param configKey - The configuration key (e.g., "lambda_warming")
   */
  async getConfig(configKey: string): Promise<LambdaConfig | null> {
    try {
      const response = await this.client.get<{ data: LambdaConfig }>(
        `/admin/sys/mgmt/schedule/${configKey}`
      );
      // CORA API returns { success: true, data: {...} } - unwrap it
      return response?.data || null;
    } catch (error) {
      console.error(`Failed to get config ${configKey}:`, error);
      return null;
    }
  }

  /**
   * Get Lambda warming configuration
   *
   * Convenience method that fetches the "lambda_warming" config and parses the JSON value.
   */
  async getWarmingConfig(): Promise<LambdaWarmingConfig | null> {
    try {
      const config = await this.getConfig("lambda_warming");
      if (!config) {
        return null;
      }

      // configValue is JSONB, should already be parsed
      const warmingConfig = config.configValue as unknown as LambdaWarmingConfig;
      return warmingConfig;
    } catch (error) {
      console.error("Failed to get warming config:", error);
      return null;
    }
  }

  /**
   * Update a Lambda warming schedule configuration
   *
   * @param configKey - The configuration key to update
   * @param value - The new configuration value (will be stored as JSONB)
   * @returns The updated configuration
   *
   * Note: If configKey is "lambda_warming", this will automatically trigger
   * EventBridge rule synchronization.
   */
  async updateConfig(
    configKey: string,
    value: ConfigValue
  ): Promise<LambdaConfig | null> {
    try {
      const response = await this.client.put<{ data: LambdaConfig }>(
        `/admin/sys/mgmt/schedule/${configKey}`,
        { configValue: value }
      );
      // CORA API returns { success: true, data: {...} } - unwrap it
      return response?.data || null;
    } catch (error) {
      console.error(`Failed to update config ${configKey}:`, error);
      throw new Error(`Failed to update ${configKey} configuration`);
    }
  }

  /**
   * Update Lambda warming configuration
   *
   * Convenience method that updates the "lambda_warming" config.
   * This will automatically trigger EventBridge rule synchronization.
   *
   * @param warmingConfig - The Lambda warming configuration
   */
  async updateWarmingConfig(
    warmingConfig: LambdaWarmingConfig
  ): Promise<LambdaConfig | null> {
    return this.updateConfig("lambda_warming", warmingConfig as unknown as ConfigValue);
  }

  /**
   * List all Lambda functions in the environment
   *
   * Returns information about Lambda functions including memory, timeout, runtime, etc.
   */
  async listLambdaFunctions(): Promise<LambdaFunctionInfo[]> {
    try {
      const response = await this.client.get<{
        data: Array<{
          name: string;
          memoryMb: number;
          timeoutSeconds: number;
          runtime: string;
          lastModified: string;
          description?: string;
          handler?: string;
          version?: string;
        }>;
      }>("/admin/sys/mgmt/functions");
      
      // Backend already returns camelCase via common.format_records()
      const data = response?.data || [];
      return data.map((fn: {
        name: string;
        memoryMb: number;
        timeoutSeconds: number;
        runtime: string;
        lastModified: string;
        description?: string;
        handler?: string;
        version?: string;
      }): LambdaFunctionInfo => ({
        name: fn.name,
        arn: fn.name, // Use name as arn since backend doesn't return arn
        memoryMb: fn.memoryMb,
        timeoutSeconds: fn.timeoutSeconds,
        runtime: fn.runtime,
        lastModified: fn.lastModified,
        description: fn.description,
        handler: fn.handler,
        version: fn.version,
      }));
    } catch (error) {
      console.error("Failed to list Lambda functions:", error);
      return [];
    }
  }

  /**
   * Manually trigger EventBridge rule synchronization
   *
   * Useful for testing or forcing a sync outside of config updates.
   */
  async syncEventBridge(): Promise<EventBridgeSyncResult> {
    try {
      const response = await this.client.post<EventBridgeSyncResult>(
        "/admin/sys/mgmt/schedule/sync",
        {}
      );
      return (
        response || {
          created: [],
          updated: [],
          deleted: [],
          errors: [],
        }
      );
    } catch (error) {
      console.error("Failed to sync EventBridge:", error);
      throw new Error("Failed to synchronize EventBridge rules");
    }
  }
}

/**
 * Create a new Lambda Management API client instance
 *
 * @param token - JWT access token from CORA authAdapter
 */
export function createLambdaMgmtClient(token: string): LambdaMgmtApiClient {
  return new LambdaMgmtApiClient(token);
}

/**
 * Default export for convenience
 */
export default LambdaMgmtApiClient;
