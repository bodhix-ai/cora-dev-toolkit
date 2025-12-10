#!/usr/bin/env node
/**
 * Frontend Compliance Checker
 *
 * Scans frontend code in CORA modules and checks for compliance with frontend standards.
 * Reports compliant and non-compliant components with fix suggestions.
 */

import * as fs from "fs";
import * as path from "path";

interface ComplianceIssue {
  lineNumber: number;
  lineContent: string;
  issueType: string;
  suggestion: string;
}

interface FileCompliance {
  path: string;
  isCompliant: boolean;
  issues: ComplianceIssue[];
}

interface ComplianceStats {
  totalFiles: number;
  compliant: number;
  nonCompliant: number;
  modules: string[];
}

class FrontendComplianceChecker {
  private rootDir: string;

  constructor(rootDir: string) {
    this.rootDir = rootDir;
  }

  /**
   * Find all .ts and .tsx files in packages/[module]/frontend/
   */
  findFrontendFiles(): string[] {
    const frontendFiles: string[] = [];
    const packagesDir = path.join(this.rootDir, "packages");

    if (!fs.existsSync(packagesDir)) {
      return frontendFiles;
    }

    const packages = fs.readdirSync(packagesDir);

    for (const pkg of packages) {
      const frontendDir = path.join(packagesDir, pkg, "frontend");

      if (!fs.existsSync(frontendDir)) {
        continue;
      }

      this.findTsFiles(frontendDir, frontendFiles);
    }

    return frontendFiles.sort();
  }

  /**
   * Recursively find .ts and .tsx files
   */
  private findTsFiles(dir: string, files: string[]): void {
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        // Skip node_modules, .build, dist directories
        if (
          !["node_modules", ".build", "dist", ".next"].includes(entry.name)
        ) {
          this.findTsFiles(fullPath, files);
        }
      } else if (entry.isFile()) {
        if (entry.name.endsWith(".ts") || entry.name.endsWith(".tsx")) {
          files.push(fullPath);
        }
      }
    }
  }

  /**
   * Check a single file for compliance
   */
  checkFile(filePath: string): FileCompliance {
    const content = fs.readFileSync(filePath, "utf-8");
    const lines = content.split("\n");
    const issues: ComplianceIssue[] = [];

    const relativePath = path.relative(this.rootDir, filePath);
    const isApiFile =
      relativePath.includes("/lib/api.ts") ||
      relativePath.includes("/api-client/");
    const isTypeFile = relativePath.includes("/types/");
    const isHookFile = relativePath.includes("/hooks/");
    const isComponentFile = relativePath.endsWith(".tsx");

    // Check 1: Direct fetch() calls (except in api client files)
    if (!isApiFile) {
      lines.forEach((line, index) => {
        if (line.match(/\bfetch\s*\(/)) {
          issues.push({
            lineNumber: index + 1,
            lineContent: line.trim(),
            issueType: "direct_fetch",
            suggestion:
              "Use createAuthenticatedClient from @sts-career/api-client instead of direct fetch()",
          });
        }
      });
    }

    // Check 2: useOrganizationContext in multi-tenant hooks
    if (isHookFile && !isTypeFile) {
      const hasOrgContext = content.includes("useOrganizationContext");
      const hasCurrentOrg = content.includes("currentOrg");
      const hasOrgId = content.includes("orgId");
      const isMultiTenantHook = hasCurrentOrg || hasOrgId;

      // If hook deals with org/orgId but doesn't import useOrganizationContext
      if (
        isMultiTenantHook &&
        !hasOrgContext &&
        !content.includes("OrgContext")
      ) {
        issues.push({
          lineNumber: 1,
          lineContent: "import { useOrganizationContext } ...",
          issueType: "missing_org_context",
          suggestion:
            'Add: import { useOrganizationContext } from "@sts-career/org-module-frontend"',
        });
      }
    }

    // Check 3: NextAuth session usage in hooks that need auth
    if (isHookFile && !isTypeFile) {
      const hasAuthenticatedClient = content.includes(
        "createAuthenticatedClient"
      );
      const hasUseSession = content.includes("useSession");

      if (hasAuthenticatedClient && !hasUseSession) {
        issues.push({
          lineNumber: 1,
          lineContent: "import { useSession } ...",
          issueType: "missing_use_session",
          suggestion: 'Add: import { useSession } from "next-auth/react"',
        });
      }
    }

    // Check 4: Styled-components usage (should use MUI sx prop)
    if (isComponentFile) {
      if (content.includes("styled-components") || content.includes("styled(")) {
        const styledLine = lines.findIndex(
          (line) =>
            line.includes("styled-components") || line.includes("styled(")
        );
        issues.push({
          lineNumber: styledLine + 1,
          lineContent: lines[styledLine]?.trim() || "",
          issueType: "styled_components",
          suggestion:
            "Use MUI sx prop instead of styled-components for consistent styling",
        });
      }
    }

    // Check 5: TypeScript any types (except in .d.ts files and documented exceptions)
    if (!filePath.endsWith(".d.ts")) {
      lines.forEach((line, index) => {
        // Match `: any` but not in comments
        if (
          line.match(/:\s*any\b/) &&
          !line.trim().startsWith("//") &&
          !line.trim().startsWith("*")
        ) {
          // Allow specific exceptions with @ts-expect-error or eslint-disable
          const prevLine = index > 0 ? lines[index - 1] : "";
          if (
            !prevLine.includes("@ts-expect-error") &&
            !prevLine.includes("eslint-disable") &&
            !line.includes("eslint-disable-line")
          ) {
            issues.push({
              lineNumber: index + 1,
              lineContent: line.trim(),
              issueType: "any_type",
              suggestion:
                "Replace 'any' with specific type. If necessary, document with @ts-expect-error comment",
            });
          }
        }
      });
    }

    // Check 6: Accessibility - aria-label on IconButton
    if (isComponentFile) {
      lines.forEach((line, index) => {
        // Check for IconButton without aria-label
        if (line.includes("<IconButton") || line.includes("<IconButton>")) {
          // Look ahead to see if aria-label is present within the component
          const nextFewLines = lines.slice(index, index + 5).join(" ");
          if (!nextFewLines.includes("aria-label")) {
            issues.push({
              lineNumber: index + 1,
              lineContent: line.trim(),
              issueType: "missing_aria_label",
              suggestion:
                'Add aria-label to IconButton: <IconButton aria-label="description">',
            });
          }
        }
      });
    }

    // Check 7: Error boundaries for data-fetching components
    if (isComponentFile && content.includes("useQuery")) {
      const hasErrorBoundary =
        content.includes("ErrorBoundary") || content.includes("error");
      if (!hasErrorBoundary) {
        issues.push({
          lineNumber: 1,
          lineContent: "Component with useQuery",
          issueType: "missing_error_handling",
          suggestion:
            "Add error handling for data-fetching components (error state or ErrorBoundary)",
        });
      }
    }

    // Check 8: Loading states
    if (isComponentFile && content.includes("useQuery")) {
      const hasLoadingState =
        content.includes("isLoading") ||
        content.includes("loading") ||
        content.includes("Skeleton");
      if (!hasLoadingState) {
        issues.push({
          lineNumber: 1,
          lineContent: "Component with useQuery",
          issueType: "missing_loading_state",
          suggestion:
            "Add loading state with MUI Skeleton or loading indicator",
        });
      }
    }

    return {
      path: relativePath,
      isCompliant: issues.length === 0,
      issues,
    };
  }

  /**
   * Group results by module
   */
  groupByModule(
    results: FileCompliance[]
  ): Map<string, FileCompliance[]> {
    const modules = new Map<string, FileCompliance[]>();

    for (const result of results) {
      const parts = result.path.split(path.sep);
      const moduleName =
        parts.length >= 2 && parts[0] === "packages" ? parts[1] : "other";

      if (!modules.has(moduleName)) {
        modules.set(moduleName, []);
      }
      modules.get(moduleName)!.push(result);
    }

    return modules;
  }

  /**
   * Generate compliance report
   */
  generateReport(results: FileCompliance[]): string {
    const compliant = results.filter((r) => r.isCompliant);
    const nonCompliant = results.filter((r) => !r.isCompliant);
    const modules = this.groupByModule(results);

    const lines: string[] = [];
    lines.push("=".repeat(80));
    lines.push("Frontend Compliance Report");
    lines.push("=".repeat(80));
    lines.push("");
    lines.push(`Total Files: ${results.length}`);
    lines.push(`✅ Compliant: ${compliant.length}`);
    lines.push(`❌ Non-Compliant: ${nonCompliant.length}`);
    lines.push("");
    lines.push(`Scanned Modules: ${Array.from(modules.keys()).sort().join(", ")}`);
    lines.push("");

    if (compliant.length > 0) {
      lines.push("-".repeat(80));
      lines.push("✅ COMPLIANT FILES");
      lines.push("-".repeat(80));

      const compliantByModule = this.groupByModule(compliant);
      for (const [moduleName, files] of Array.from(compliantByModule).sort()) {
        lines.push(
          `  📦 ${moduleName} (${files.length} file${files.length !== 1 ? "s" : ""})`
        );
        for (const file of files.slice(0, 5)) {
          // Show first 5
          const fileName = path.basename(file.path);
          lines.push(`     ✓ ${fileName}`);
        }
        if (files.length > 5) {
          lines.push(`     ... and ${files.length - 5} more`);
        }
      }
      lines.push("");
    }

    if (nonCompliant.length > 0) {
      lines.push("-".repeat(80));
      lines.push("❌ NON-COMPLIANT FILES");
      lines.push("-".repeat(80));

      const nonCompliantByModule = this.groupByModule(nonCompliant);
      for (const [moduleName, files] of Array.from(nonCompliantByModule).sort()) {
        lines.push(`  📦 ${moduleName} (${files.length} non-compliant)`);

        for (const file of files) {
          lines.push(`     ✗ ${file.path}`);

          // Group issues by type
          const issuesByType = new Map<string, ComplianceIssue[]>();
          for (const issue of file.issues) {
            if (!issuesByType.has(issue.issueType)) {
              issuesByType.set(issue.issueType, []);
            }
            issuesByType.get(issue.issueType)!.push(issue);
          }

          // Show issues grouped by type
          for (const [issueType, issues] of issuesByType) {
            if (issues.length === 1) {
              const issue = issues[0];
              lines.push(`       ⚠️  Line ${issue.lineNumber}: ${issue.issueType}`);
              if (issue.lineContent.length > 0 && issue.lineContent.length < 60) {
                lines.push(`          ${issue.lineContent}`);
              }
              lines.push(`       💡 ${issue.suggestion}`);
            } else {
              lines.push(
                `       ⚠️  Found ${issues.length} instance(s) of ${issueType}`
              );
              lines.push(`          Lines: ${issues.map((i) => i.lineNumber).join(", ")}`);
              lines.push(`       💡 ${issues[0].suggestion}`);
            }
          }

          lines.push("");
        }
      }
    }

    lines.push("-".repeat(80));
    lines.push("SUMMARY");
    lines.push("-".repeat(80));

    if (nonCompliant.length > 0) {
      lines.push("⚠️  Action Required: Fix non-compliant files");
      lines.push("");
      lines.push("Quick Fix Guide:");
      lines.push(
        "1. API Calls: Use createAuthenticatedClient from @sts-career/api-client"
      );
      lines.push(
        "2. Multi-tenant Hooks: Import useOrganizationContext from @sts-career/org-module-frontend"
      );
      lines.push("3. Authentication: Use useSession from next-auth/react");
      lines.push("4. Styling: Use MUI sx prop instead of styled-components");
      lines.push(
        "5. Type Safety: Replace 'any' types with specific types"
      );
      lines.push("6. Accessibility: Add aria-label to IconButton components");
      lines.push("");
      lines.push("See: docs/development/CORA-FRONTEND-STANDARDS.md");
    } else {
      lines.push("✅ All files are compliant!");
    }

    lines.push("=".repeat(80));

    return lines.join("\n");
  }
}

function main() {
  // Get the root directory (current working directory is assumed to be project root)
  const rootDir = process.cwd();

  console.log(`Scanning frontend files in: ${rootDir}`);
  console.log();

  const checker = new FrontendComplianceChecker(rootDir);

  // Find all frontend files
  const frontendFiles = checker.findFrontendFiles();

  if (frontendFiles.length === 0) {
    console.log("❌ No frontend files found!");
    process.exit(1);
  }

  console.log(`Found ${frontendFiles.length} frontend file(s)`);
  console.log();

  // Check each file
  const results: FileCompliance[] = [];
  for (const filePath of frontendFiles) {
    const result = checker.checkFile(filePath);
    results.push(result);
  }

  // Generate and print report
  const report = checker.generateReport(results);
  console.log(report);

  // Exit with error code if any non-compliant files found
  const nonCompliantCount = results.filter((r) => !r.isCompliant).length;
  if (nonCompliantCount > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

// Run main function
main();

export { FrontendComplianceChecker };
