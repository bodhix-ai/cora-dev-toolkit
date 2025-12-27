import { Card, CardContent, Typography } from '@mui/material';

export default function ProfilePage() {
  return (
    <div>
      <Typography variant="h4" gutterBottom>
        User Profile
      </Typography>
      <Card>
        <CardContent>
          <Typography variant="body1" gutterBottom>
            Your profile information
          </Typography>
          <Typography variant="body2" color="text.secondary">
            View and edit your profile details, including name, email, and avatar.
          </Typography>
          {/* Future: Edit name, email, avatar, bio, etc. */}
        </CardContent>
      </Card>
    </div>
  );
}
