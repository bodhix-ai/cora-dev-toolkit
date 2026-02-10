import { Card, CardContent, Typography } from '@mui/material';

export default function SettingsPage() {
  return (
    <div>
      <Typography variant="h4" gutterBottom>
        Settings
      </Typography>
      <Card>
        <CardContent>
          <Typography variant="body1" gutterBottom>
            User settings and preferences
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Manage your account settings, preferences, and notifications.
          </Typography>
          {/* Future: Preferences, notifications, appearance, etc. */}
        </CardContent>
      </Card>
    </div>
  );
}
