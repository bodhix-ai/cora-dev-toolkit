/**
 * Validate organization name
 */
export function validateOrgName(name: string): string | null {
  if (!name || name.trim().length === 0) {
    return "Organization name is required";
  }
  if (name.length < 3) {
    return "Organization name must be at least 3 characters";
  }
  if (name.length > 100) {
    return "Organization name must be less than 100 characters";
  }
  return null;
}

/**
 * Validate organization slug
 */
export function validateSlug(slug: string): string | null {
  if (!slug || slug.trim().length === 0) {
    return "Slug is required";
  }
  if (!/^[a-z0-9-]+$/.test(slug)) {
    return "Slug must contain only lowercase letters, numbers, and hyphens";
  }
  if (slug.length < 3) {
    return "Slug must be at least 3 characters";
  }
  return null;
}

/**
 * Generate slug from organization name
 */
export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/**
 * Validate email address
 */
export function validateEmail(email: string): string | null {
  if (!email || email.trim().length === 0) {
    return "Email is required";
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return "Invalid email format";
  }
  return null;
}

/**
 * Validate URL
 */
export function validateUrl(url: string): string | null {
  if (!url || url.trim().length === 0) {
    return null; // URL is optional
  }
  try {
    new URL(url);
    return null;
  } catch {
    return "Invalid URL format";
  }
}
