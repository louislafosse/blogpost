import React from 'react';
import { Box, IconButton, Link, useTheme } from '@mui/material';
import { Brightness7, Brightness4 } from '@mui/icons-material';
import { useThemeToggle } from './../components/utils/Theme.tsx';

export const NavBar: React.FC = () => {
  const theme = useTheme();
  const { isDarkMode, toggleTheme } = useThemeToggle();

    return (
    <Box sx={{
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      py: 3,
      width: "100%",
      maxWidth: "1000px",
      mx: "auto",
      px: 4,
    }}>
      <Link
        href="/"
        underline="none"
        sx={{
          fontWeight: 800,
          background: theme.palette.mode === 'dark' 
            ? 'linear-gradient(45deg, #ffffff 30%, #a0a0a0 90%)'
            : 'linear-gradient(45deg, #2d3436 30%, #636e72 90%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          fontFamily: "'Space Grotesk', Helvetica, sans-serif",
          fontSize: "24px",
          letterSpacing: "-0.5px",
          '&:hover': {
            textDecoration: 'none',
            opacity: 0.8
          }
        }}
      >
        SECRET CLUB
      </Link>
      <Box sx={{ display: "flex", alignItems: "center", gap: 4 }}>
        <IconButton
          edge="end"
          color="inherit"
          onClick={toggleTheme}
          aria-label="toggle theme"
          sx={{
            '&:hover': {
              textDecoration: 'none',
              opacity: 0.8
            }
          }}
        >
          {isDarkMode ? <Brightness7 /> : <Brightness4 />}
        </IconButton>
        <Link
          href="#"
          underline="none"
          sx={{
            fontWeight: "bold",
            cursor: "pointer",
            fontFamily: "'Space Grotesk', Helvetica, sans-serif",
            letterSpacing: "0.07em",
            color: theme.palette.text.primary,
            '&:hover': {
              textDecoration: 'none',
              opacity: 0.8
            }
          }}
        >
          ABOUT
        </Link>
      </Box>
    </Box>
  );
};