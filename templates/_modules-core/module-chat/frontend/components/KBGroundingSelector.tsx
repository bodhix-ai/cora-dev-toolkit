/**
 * Module Chat - KB Grounding Selector Component
 *
 * Dialog/panel for selecting which knowledge bases to ground a chat in.
 */

"use client";

import React, { useState, useCallback, useMemo, useEffect } from "react";
import {
  BookOpen,
  Search,
  Check,
  Plus,
  X,
  Loader2,
  Database,
  Building2,
  Globe,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { useChatKBGrounding } from "../hooks/useChatKBGrounding";
import type { KBInfo, ChatKBGrounding } from "../types";

// =============================================================================
// PROPS TYPES
// =============================================================================

export interface KBGroundingSelectorProps {
  /** Chat session ID */
  chatId: string;
  /** Whether the dialog is open */
  open: boolean;
  /** Callback when dialog closes */
  onOpenChange: (open: boolean) => void;
  /** Callback when error occurs */
  onError?: (message: string) => void;
  /** Callback when successfully updated */
  onSuccess?: () => void;
}

// =============================================================================
// KB ITEM COMPONENT
// =============================================================================

interface KBItemProps {
  kb: KBInfo;
  isGrounded: boolean;
  isLoading: boolean;
  onToggle: () => void;
}

function KBItem({ kb, isGrounded, isLoading, onToggle }: KBItemProps) {
  const scopeIcon = {
    system: <Globe className="h-3 w-3" />,
    org: <Building2 className="h-3 w-3" />,
    workspace: <Database className="h-3 w-3" />,
  };

  const scopeLabel = {
    system: "System",
    org: "Organization",
    workspace: "Workspace",
  };

  return (
    <div
      className={cn(
        "flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors",
        isGrounded
          ? "border-primary bg-primary/5"
          : "border-border hover:border-muted-foreground/50",
        isLoading && "opacity-50 pointer-events-none"
      )}
      onClick={onToggle}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onToggle();
        }
      }}
    >
      {/* Checkbox */}
      <Checkbox
        checked={isGrounded}
        disabled={isLoading}
        className="mt-0.5"
        aria-label={`${isGrounded ? "Remove" : "Add"} ${kb.name}`}
      />

      {/* KB Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium text-sm truncate">{kb.name}</span>
          {isLoading && <Loader2 className="h-3 w-3 animate-spin" />}
        </div>
        {kb.description && (
          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
            {kb.description}
          </p>
        )}
        <div className="flex items-center gap-2 mt-2">
          <Badge variant="outline" className="text-xs">
            {scopeIcon[kb.scope]}
            <span className="ml-1">{scopeLabel[kb.scope]}</span>
          </Badge>
          {kb.documentCount !== undefined && (
            <span className="text-xs text-muted-foreground">
              {kb.documentCount} docs
            </span>
          )}
        </div>
      </div>

      {/* Selected Indicator */}
      {isGrounded && !isLoading && (
        <Check className="h-4 w-4 text-primary flex-shrink-0" />
      )}
    </div>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

/**
 * Dialog for selecting KB grounding for a chat
 *
 * Features:
 * - Search available KBs
 * - Toggle KBs on/off for grounding
 * - Shows currently grounded KBs
 * - Scope indicators (system/org/workspace)
 *
 * @example
 * ```tsx
 * <KBGroundingSelector
 *   chatId={currentSession.id}
 *   open={kbDialogOpen}
 *   onOpenChange={setKbDialogOpen}
 *   onError={(msg) => toast.error(msg)}
 *   onSuccess={() => toast.success("KB grounding updated")}
 * />
 * ```
 */
export function KBGroundingSelector({
  chatId,
  open,
  onOpenChange,
  onError,
  onSuccess,
}: KBGroundingSelectorProps) {
  const [search, setSearch] = useState("");

  // Hook for KB grounding
  const {
    groundedKbs,
    availableKbs,
    isLoading,
    isGrounded,
    add,
    remove,
    toggle,
    reload,
    reloadAvailable,
  } = useChatKBGrounding({
    sessionId: chatId,
    autoLoad: true,
    loadAvailable: true,
  });

  // Reload data when dialog opens
  useEffect(() => {
    if (open) {
      reload();
      reloadAvailable();
    }
  }, [open, reload, reloadAvailable]);

  // Filter KBs by search
  const filteredKbs = useMemo(() => {
    if (!search.trim()) return availableKbs;
    const lowerSearch = search.toLowerCase();
    return availableKbs.filter(
      (kb) =>
        kb.name.toLowerCase().includes(lowerSearch) ||
        kb.description?.toLowerCase().includes(lowerSearch)
    );
  }, [availableKbs, search]);

  // Group KBs by scope
  const groupedKbs = useMemo(() => {
    const groups: Record<"workspace" | "org" | "system", KBInfo[]> = {
      workspace: [],
      org: [],
      system: [],
    };
    filteredKbs.forEach((kb) => {
      groups[kb.scope].push(kb);
    });
    return groups;
  }, [filteredKbs]);

  // Track loading state per KB
  const [loadingKbs, setLoadingKbs] = useState<Set<string>>(new Set());

  // Handle toggle
  const handleToggle = useCallback(
    async (kb: KBInfo) => {
      setLoadingKbs((prev: Set<string>) => new Set(prev).add(kb.id));
      try {
        await toggle(kb.id);
        onSuccess?.();
      } catch {
        // Error handled by hook
        onError?.("Failed to update KB grounding");
      } finally {
        setLoadingKbs((prev: Set<string>) => {
          const next = new Set(prev);
          next.delete(kb.id);
          return next;
        });
      }
    },
    [toggle, onSuccess, onError]
  );

  // Render KB group
  const renderGroup = (title: string, kbs: KBInfo[]) => {
    if (kbs.length === 0) return null;
    return (
      <div className="space-y-2">
        <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          {title}
        </h4>
        {kbs.map((kb) => (
          <KBItem
            key={kb.id}
            kb={kb}
            isGrounded={isGrounded(kb.id)}
            isLoading={loadingKbs.has(kb.id)}
            onToggle={() => handleToggle(kb)}
          />
        ))}
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Knowledge Base Grounding
          </DialogTitle>
          <DialogDescription>
            Select knowledge bases to ground this chat. The AI will use these
            sources to provide informed answers.
          </DialogDescription>
        </DialogHeader>

        {/* Currently Grounded */}
        {groundedKbs.length > 0 && (
          <div className="flex flex-wrap gap-2 p-3 bg-muted/50 rounded-lg">
            <span className="text-xs text-muted-foreground w-full mb-1">
              Currently grounded ({groundedKbs.length}):
            </span>
            {groundedKbs.map((grounding) => (
              <Badge
                key={grounding.id}
                variant="secondary"
                className="cursor-pointer hover:bg-secondary/80"
                onClick={() =>
                  handleToggle({
                    id: grounding.kbId,
                    name: grounding.kbName ?? "Unknown KB",
                    scope: "workspace",
                  })
                }
              >
                {grounding.kbName}
                <X className="h-3 w-3 ml-1" />
              </Badge>
            ))}
          </div>
        )}

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search knowledge bases..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>

        {/* KB List */}
        <ScrollArea className="h-[300px] -mx-6 px-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredKbs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <Database className="h-12 w-12 mb-4 opacity-50" />
              <p className="text-sm">
                {search
                  ? "No knowledge bases match your search"
                  : "No knowledge bases available"}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {renderGroup("Workspace", groupedKbs.workspace)}
              {renderGroup("Organization", groupedKbs.org)}
              {renderGroup("System", groupedKbs.system)}
            </div>
          )}
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default KBGroundingSelector;
