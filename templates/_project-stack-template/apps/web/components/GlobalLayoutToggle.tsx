'use client';
import * as React from 'react';
import IconButton from '@mui/material/IconButton';
import MenuIcon from '@mui/icons-material/Menu';

export default function GlobalLayoutToggle() {
  return (
    <IconButton color="inherit" size="small">
      <MenuIcon />
    </IconButton>
  );
}
