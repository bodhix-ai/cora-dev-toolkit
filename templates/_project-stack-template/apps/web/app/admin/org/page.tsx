import { Card, CardContent, Typography } from '@mui/material';

export default function OrgAdminPage() {
  return (
    <div>
      <Typography variant="h4" gutterBottom>
        Organization Admin
      </Typography>
      <Card>
        <CardContent>
          <Typography variant="body1" gutterBottom>
            Organization administration features
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Manage organization members, settings, and permissions.
          </Typography>
          {/* Future: Member management, org settings, invitations, etc. */}
        </CardContent>
      </Card>
    </div>
  );
}
