/**
 * IDP Configuration Admin Card
 *
 * Platform admin card for managing Identity Provider (IDP) configurations.
 * Only visible to users with platform admin roles:
 * - super_admin
 * - platform_owner
 * - platform_admin
 * - global_owner
 * - global_admin
 */

"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Shield,
  Key,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Loader2,
  Settings,
} from "lucide-react";

/**
 * IDP Configuration type
 */
interface IdpConfig {
  id: string;
  provider_type: "clerk" | "okta";
  display_name: string;
  config: {
    client_id?: string;
    issuer?: string;
    jwks_uri?: string;
    publishable_key?: string;
  };
  is_active: boolean;
  is_configured: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Props for IdpConfigCard
 */
interface IdpConfigCardProps {
  /** Authenticated API client for making requests */
  apiClient: {
    get: (url: string) => Promise<{ data: any; success: boolean }>;
    put: (url: string, data: any) => Promise<{ data: any; success: boolean }>;
    post: (url: string, data?: any) => Promise<{ data: any; success: boolean }>;
  };
  /** Callback when IDP is changed */
  onIdpChanged?: () => void;
}

/**
 * IDP Configuration Card Component
 *
 * Displays and manages identity provider configurations for platform admins.
 */
export function IdpConfigCard({ apiClient, onIdpChanged }: IdpConfigCardProps) {
  const [configs, setConfigs] = useState<IdpConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingConfig, setEditingConfig] = useState<IdpConfig | null>(null);
  const [saving, setSaving] = useState(false);

  // Fetch IDP configurations on mount
  useEffect(() => {
    fetchConfigs();
  }, []);

  const fetchConfigs = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiClient.get("/admin/idp-config");
      if (response.success) {
        setConfigs(response.data || []);
      } else {
        setError("Failed to load IDP configurations");
      }
    } catch (err) {
      setError("Failed to load IDP configurations");
      console.error("Error fetching IDP configs:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveConfig = async (
    providerType: string,
    configData: Record<string, string>
  ) => {
    try {
      setSaving(true);
      setError(null);

      const response = await apiClient.put(
        `/admin/idp-config/${providerType}`,
        {
          config: configData,
        }
      );

      if (response.success) {
        await fetchConfigs();
        setEditingConfig(null);
        onIdpChanged?.();
      } else {
        setError("Failed to save IDP configuration");
      }
    } catch (err) {
      setError("Failed to save IDP configuration");
      console.error("Error saving IDP config:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleActivate = async (providerType: string) => {
    try {
      setSaving(true);
      setError(null);

      const response = await apiClient.post(
        `/admin/idp-config/${providerType}/activate`
      );

      if (response.success) {
        await fetchConfigs();
        onIdpChanged?.();
      } else {
        setError("Failed to activate IDP");
      }
    } catch (err) {
      setError("Failed to activate IDP");
      console.error("Error activating IDP:", err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Identity Providers
          </CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Identity Providers
        </CardTitle>
        <CardDescription>
          Configure authentication providers for your platform. Only one
          provider can be active at a time.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {configs.map((config) => (
          <IdpProviderRow
            key={config.id}
            config={config}
            onEdit={() => setEditingConfig(config)}
            onActivate={() => handleActivate(config.provider_type)}
            saving={saving}
          />
        ))}

        {/* Edit Dialog */}
        {editingConfig && (
          <IdpEditDialog
            config={editingConfig}
            onClose={() => setEditingConfig(null)}
            onSave={handleSaveConfig}
            saving={saving}
          />
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Individual IDP Provider Row
 */
function IdpProviderRow({
  config,
  onEdit,
  onActivate,
  saving,
}: {
  config: IdpConfig;
  onEdit: () => void;
  onActivate: () => void;
  saving: boolean;
}) {
  return (
    <div className="flex items-center justify-between p-4 border rounded-lg">
      <div className="flex items-center gap-4">
        <div className="flex-shrink-0">
          {config.provider_type === "okta" ? (
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <Key className="h-5 w-5 text-blue-600" />
            </div>
          ) : (
            <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
              <Shield className="h-5 w-5 text-purple-600" />
            </div>
          )}
        </div>

        <div>
          <div className="flex items-center gap-2">
            <span className="font-medium">{config.display_name}</span>
            {config.is_active && (
              <Badge variant="default" className="bg-green-500">
                Active
              </Badge>
            )}
            {config.is_configured ? (
              <Badge
                variant="outline"
                className="text-green-600 border-green-600"
              >
                <CheckCircle className="h-3 w-3 mr-1" />
                Configured
              </Badge>
            ) : (
              <Badge
                variant="outline"
                className="text-orange-600 border-orange-600"
              >
                <XCircle className="h-3 w-3 mr-1" />
                Not Configured
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            {config.provider_type === "okta"
              ? "Okta OIDC Authentication"
              : "Clerk Authentication"}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={onEdit} disabled={saving}>
          <Settings className="h-4 w-4 mr-1" />
          Configure
        </Button>
        {config.is_configured && !config.is_active && (
          <Button
            variant="default"
            size="sm"
            onClick={onActivate}
            disabled={saving}
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
            Activate
          </Button>
        )}
      </div>
    </div>
  );
}

/**
 * IDP Edit Dialog
 */
function IdpEditDialog({
  config,
  onClose,
  onSave,
  saving,
}: {
  config: IdpConfig;
  onClose: () => void;
  onSave: (providerType: string, data: Record<string, string>) => void;
  saving: boolean;
}) {
  const [formData, setFormData] = useState<Record<string, string>>(
    config.config as Record<string, string>
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(config.provider_type, formData);
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Configure {config.display_name}</DialogTitle>
          <DialogDescription>
            {config.provider_type === "okta"
              ? "Enter your Okta OIDC credentials. Client secrets are stored securely in AWS Secrets Manager."
              : "Enter your Clerk credentials. Secret keys are stored securely in AWS Secrets Manager."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {config.provider_type === "okta" ? (
            <OktaConfigFields formData={formData} setFormData={setFormData} />
          ) : (
            <ClerkConfigFields formData={formData} setFormData={setFormData} />
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
              Save Configuration
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Okta-specific configuration fields
 */
function OktaConfigFields({
  formData,
  setFormData,
}: {
  formData: Record<string, string>;
  setFormData: (data: Record<string, string>) => void;
}) {
  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="client_id">Client ID</Label>
        <Input
          id="client_id"
          value={formData.client_id || ""}
          onChange={(e) =>
            setFormData({ ...formData, client_id: e.target.value })
          }
          placeholder="0oax0eaf3bgW5NP73697"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="issuer">Issuer URL</Label>
        <Input
          id="issuer"
          value={formData.issuer || ""}
          onChange={(e) => setFormData({ ...formData, issuer: e.target.value })}
          placeholder="https://your-domain.okta.com/oauth2/default"
          required
        />
        <p className="text-xs text-muted-foreground">
          Usually: https://your-domain.okta.com/oauth2/default
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="jwks_uri">JWKS URI (optional)</Label>
        <Input
          id="jwks_uri"
          value={formData.jwks_uri || ""}
          onChange={(e) =>
            setFormData({ ...formData, jwks_uri: e.target.value })
          }
          placeholder="https://your-domain.okta.com/oauth2/default/v1/keys"
        />
        <p className="text-xs text-muted-foreground">
          Auto-derived from issuer if not provided
        </p>
      </div>

      <Alert>
        <Key className="h-4 w-4" />
        <AlertDescription>
          Client Secret is managed separately in AWS Secrets Manager for
          security.
        </AlertDescription>
      </Alert>
    </>
  );
}

/**
 * Clerk-specific configuration fields
 */
function ClerkConfigFields({
  formData,
  setFormData,
}: {
  formData: Record<string, string>;
  setFormData: (data: Record<string, string>) => void;
}) {
  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="publishable_key">Publishable Key</Label>
        <Input
          id="publishable_key"
          value={formData.publishable_key || ""}
          onChange={(e) =>
            setFormData({ ...formData, publishable_key: e.target.value })
          }
          placeholder="pk_test_..."
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="issuer">Issuer URL</Label>
        <Input
          id="issuer"
          value={formData.issuer || ""}
          onChange={(e) => setFormData({ ...formData, issuer: e.target.value })}
          placeholder="https://clerk.your-domain.com"
          required
        />
      </div>

      <Alert>
        <Key className="h-4 w-4" />
        <AlertDescription>
          Secret Key is managed separately in AWS Secrets Manager for security.
        </AlertDescription>
      </Alert>
    </>
  );
}

export default IdpConfigCard;
