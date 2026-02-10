import { OrgsRedirectComponent } from "./OrgsRedirectComponent";

/**
 * Organizations List Parent Route
 * 
 * Thin wrapper that delegates to OrgsRedirectComponent.
 * Required by Next.js routing for child routes like /admin/sys/access/orgs/[id].
 * 
 * @see OrgsRedirectComponent for implementation details
 */
export default function OrgsListPage() {
  return <OrgsRedirectComponent />;
}
