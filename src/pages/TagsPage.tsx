import React, { useEffect, useState } from "react";
import { Box, Typography } from "@mui/material";
import { Link as RouterLink } from 'react-router-dom';
import { useThemeToggle } from '../components/utils/Theme.tsx';
import postsData from '../../content/posts.json' with { type: 'json' };

// Collect all tags with post counts
const tagMap: Record<string, number> = {};
postsData.forEach((post) => {
  post.tags.forEach((tag) => {
    tagMap[tag] = (tagMap[tag] ?? 0) + 1;
  });
});
const allTags = Object.entries(tagMap).sort((a, b) => b[1] - a[1]);

export const TagsPage: React.FC = () => {
  const { isDarkMode, toggleTheme } = useThemeToggle();
  const [visible, setVisible] = useState(false);

  const ink = isDarkMode ? "#f2f2f2" : "#1a1a1a";
  const inkSec = isDarkMode ? "#a0a0a0" : "#4a4a4a";
  const glassBg = isDarkMode ? "rgba(10,11,14,0.75)" : "rgba(249,247,242,0.85)";
  const border = isDarkMode ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.08)";

  useEffect(() => {
    window.scrollTo(0, 0);
    document.body.style.backgroundColor = "transparent";
    const t = setTimeout(() => setVisible(true), 50);
    return () => {
      document.body.style.backgroundColor = "";
      clearTimeout(t);
    };
  }, []);

  return (
    <Box sx={{ minHeight: "100vh", position: "relative", overflow: "hidden", backgroundColor: "transparent" }}>

      {/* Fixed background — light */}
      <Box sx={{
        position: "fixed", top: 0, left: 0, width: "100%", height: "100vh",
        backgroundImage: `url(${import.meta.env.BASE_URL}orig1.png)`, backgroundSize: "cover",
        backgroundRepeat: "no-repeat", backgroundPosition: "center 10%",
        zIndex: 0,
        transform: isDarkMode ? "scale(1)" : "scale(1.05)",
        filter: isDarkMode ? "blur(10px) brightness(0.6)" : "blur(0px) brightness(1)",
        transition: "transform 1.2s cubic-bezier(0.2,0.8,0.2,1), filter 1.2s ease",
      }} />
      {/* Fixed background — dark */}
      <Box sx={{
        position: "fixed", top: 0, left: 0, width: "100%", height: "100vh",
        backgroundImage: `url(${import.meta.env.BASE_URL}dark_theme.png)`, backgroundSize: "cover",
        backgroundRepeat: "no-repeat", backgroundPosition: "center top",
        zIndex: 1,
        opacity: isDarkMode ? 1 : 0,
        transform: isDarkMode ? "scale(1.05)" : "scale(1.1)",
        filter: isDarkMode ? "blur(0px)" : "blur(15px)",
        transition: "opacity 1.2s ease-in-out, transform 1.2s cubic-bezier(0.2,0.8,0.2,1), filter 1.2s ease-out",
      }} />
      {/* Light overlay */}
      <Box sx={{
        position: "fixed", top: 0, left: 0, width: "100%", height: "100%",
        zIndex: 2, pointerEvents: "none",
        background: "linear-gradient(to bottom, rgba(249,247,242,0.05) 0%, rgba(249,247,242,0.5) 50%, rgba(249,247,242,0.97) 100%)",
        opacity: isDarkMode ? 0 : 1,
        transition: "opacity 1.2s ease-in-out",
      }} />
      {/* Dark overlay */}
      <Box sx={{
        position: "fixed", top: 0, left: 0, width: "100%", height: "100%",
        zIndex: 2, pointerEvents: "none",
        background: "linear-gradient(to bottom, rgba(10,11,14,0.15) 0%, rgba(10,11,14,0.65) 50%, rgba(10,11,14,0.95) 100%)",
        opacity: isDarkMode ? 1 : 0,
        transition: "opacity 1.2s ease-in-out",
      }} />

      {/* Nav */}
      <Box component="nav" sx={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 10,
        display: "flex", justifyContent: "space-between", alignItems: "center",
        padding: "30px 60px", pointerEvents: "none",
      }}>
        <Box component={RouterLink} to="/" sx={{
          pointerEvents: "auto",
          fontFamily: "'Fira Code', monospace", fontSize: "0.85rem",
          letterSpacing: "0.12em", textTransform: "uppercase",
          color: ink, textDecoration: "none",
          borderBottom: `1px solid ${ink}`, pb: "2px",
          transition: "color 1.2s ease, border-color 1.2s ease, opacity 0.3s ease",
          "&:hover": { opacity: 0.6 },
        }}>← Log</Box>
        <Box onClick={toggleTheme} sx={{
          pointerEvents: "auto", cursor: "pointer", color: inkSec,
          fontFamily: "'Fira Code', monospace", fontSize: "1rem",
          letterSpacing: "0.05em", userSelect: "none",
          transition: "color 1.2s ease, opacity 0.3s ease",
          "&:hover": { opacity: 0.6 },
        }}>
          {isDarkMode ? "[ light ]" : "[ dark ]"}
        </Box>
      </Box>

      {/* Content */}
      <Box sx={{
        position: "relative", zIndex: 3,
        maxWidth: "900px", margin: "0 auto",
        px: { xs: "20px", md: 0 },
        pt: "140px", pb: "100px",
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(20px)",
        transition: "opacity 0.8s ease, transform 0.8s cubic-bezier(0.2,0.8,0.2,1)",
      }}>
        {/* Page title */}
        <Box sx={{ mb: "60px" }}>
          <Typography sx={{
            fontFamily: "'Fira Code', monospace", fontSize: "0.8rem",
            textTransform: "uppercase", letterSpacing: "0.15em",
            color: inkSec, mb: "12px",
            display: "flex", alignItems: "center", gap: "12px",
            "&::before": {
              content: '""', display: "inline-block",
              width: "30px", height: "1px", backgroundColor: inkSec,
            },
          }}>// index</Typography>
          <Typography sx={{
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: { xs: "3rem", md: "4.5rem" },
            fontWeight: 600, letterSpacing: "-0.02em",
            color: ink, lineHeight: 1,
            transition: "color 1.2s ease",
          }}>
            Tags
          </Typography>
        </Box>

        {/* Tag grid */}
        <Box sx={{
          display: "flex", flexWrap: "wrap", gap: "16px",
        }}>
          {allTags.map(([tag, count]) => (
            <Box
              key={tag}
              component={RouterLink}
              to={`/tags/${tag}`}
              sx={{
                display: "flex", alignItems: "baseline", gap: "8px",
                padding: "14px 24px",
                background: glassBg,
                backdropFilter: "blur(15px)",
                WebkitBackdropFilter: "blur(15px)",
                border: `1px solid ${border}`,
                borderRadius: "4px",
                textDecoration: "none",
                transition: "all 0.3s ease, background 1.2s ease-in-out, border-color 1.2s ease-in-out",
                "&:hover": {
                  borderColor: ink,
                  transform: "translateY(-2px)",
                },
              }}
            >
              <Box sx={{
                fontFamily: "'Fira Code', monospace",
                fontSize: "0.85rem", letterSpacing: "0.05em",
                textTransform: "lowercase", color: ink,
                transition: "color 1.2s ease",
              }}>
                {tag}
              </Box>
              <Box sx={{
                fontFamily: "'Fira Code', monospace",
                fontSize: "0.7rem", color: inkSec,
                transition: "color 1.2s ease",
              }}>
                {count}
              </Box>
            </Box>
          ))}
        </Box>
      </Box>
    </Box>
  );
};
