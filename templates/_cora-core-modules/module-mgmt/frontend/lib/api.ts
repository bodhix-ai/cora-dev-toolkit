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
 * Communicates with the Lambda Management Lambda via the new platform endpoints:
 * - GET /platform/lambda-config - List all configurations
 * - GET /platform/lambda-config/{configKey} - Get specific config
 * - PUT /platform/lambda-config/{configKey} - Update config (triggers EventBridge sync)
 * - GET /platform/lambda-functions - List Lambda functions
 * - POST /platform/lambda-config/sync - Manual EventBridge sync
 */
export class LambdaMgmtApiClient {
  private client: ReturnType<typeof createCoraAuthenticatedClient>;

  constructor(token: string) {
    this.client = createCoraAuthenticatedClient(token);
  }

  /**
   * List all platform Lambda configurations
   */
  async listConfigs(): Promise<LambdaConfig[]> {
    try {
      const response = await this.client.get<LambdaConfig[]>(
        "/platform/lambda-config"
      );
      return Array.isArray(response) ? response : [];
    } catch (error) {
      console.error("Failed to list Lambda configs:", error);
      throw new Error("Failed to load Lambda configurations");
    }
  }

  /**
   * Get a specific Lambda configuration by key
   *
   * @param configKey - The configuration key (e.g., "lambda_warming")
   */
  async getConfig(configKey: string): Promise<LambdaConfig | null> {
    try {
      const response = await this.client.get<LambdaConfig>(
        `/platform/lambda-config/${configKey}`
      );
      return response || null;
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

      // config_value is JSONB, should already be parsed
      const warmingConfig = config.config_value as unknown as LambdaWarmingConfig;
      return warmingConfig;
    } catch (error) {
      console.error("Failed to get warming config:", error);
      return null;
    }
  }

  /**
   * Update a Lambda configuration
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
      const response = await this.client.put<LambdaConfig>(
        `/platform/lambda-config/${configKey}`,
        { config_value: value }
      );
      return response || null;
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
        functions: LambdaFunctionInfo[];
      }>("/platform/lambda-functions");
      return response?.functions || [];
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
        "/platform/lambda-config/sync",
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
