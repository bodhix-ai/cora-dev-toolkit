'use client';
import * as React from 'react';
import Box from '@mui/material/Box';

export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {children}
    </Box>
  );
}
