/**
 * Lambda Management Module - Lambda Functions Hook
 *
 * React hook for fetching and managing Lambda function information.
 */

import { useState, useEffect, useCallback, useMemo } from "react";
import type { CoraAuthAdapter } from "@${project}/api-client";
import { createLambdaMgmtClient } from "../lib/api";
import type { LambdaFunctionInfo } from "../types";

interface UseLambdaFunctionsReturn {
  functions: LambdaFunctionInfo[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

/**
 * Hook for fetching Lambda function information
 *
 * Provides a list of Lambda functions in the environment with their
 * memory, timeout, runtime, and other configuration details.
 *
 * @returns Lambda functions state and refresh method
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { functions, loading, refresh } = useLambdaFunctions();
 *
 *   if (loading) return <CircularProgress />;
 *
 *   return (
 *     <Table>
 *       {functions.map(fn => (
 *         <TableRow key={fn.name}>
 *           <TableCell>{fn.name}</TableCell>
 *           <TableCell>{fn.memory_mb} MB</TableCell>
 *         </TableRow>
 *       ))}
 *     </Table>
 *   );
 * }
 * ```
 */
export function useLambdaFunctions(
  authAdapter: CoraAuthAdapter
): UseLambdaFunctionsReturn {
  const [token, setToken] = useState<string | null>(null);
  const [functions, setFunctions] = useState<LambdaFunctionInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Get token from authAdapter
  useEffect(() => {
    let mounted = true;

    authAdapter.getToken().then((t) => {
      if (mounted) {
        setToken(t);
        if (!t) {
          setError("Authentication required");
          setLoading(false);
        }
      }
    });

    return () => {
      mounted = false;
    };
  }, [authAdapter]);

  // Create client with token - memoized to prevent infinite re-renders
  const client = useMemo(() => {
    return token ? createLambdaMgmtClient(token) : null;
  }, [token]);

  /**
   * Fetch Lambda functions from API
   */
  const fetchFunctions = useCallback(async () => {
    if (!client) {
      setError("Not authenticated");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await client.listLambdaFunctions();
      setFunctions(response);
    } catch (err) {
      console.error("Failed to fetch Lambda functions:", err);
      setError(
        err instanceof Error ? err.message : "Failed to load Lambda functions"
      );
      setFunctions([]);
    } finally {
      setLoading(false);
    }
  }, [client]);

  /**
   * Manually refresh the Lambda functions list
   */
  const refresh = useCallback(async () => {
    await fetchFunctions();
  }, [fetchFunctions]);

  // Initial load
  useEffect(() => {
    fetchFunctions();
  }, [fetchFunctions]);

  return {
    functions,
    loading,
    error,
    refresh,
  };
}

export default useLambdaFunctions;
