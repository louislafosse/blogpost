import React, { useEffect, useRef, useState } from "react";
import { useParams, Link as RouterLink } from "react-router-dom";
import { Box, Typography } from "@mui/material";
import ReactMarkdown from "react-markdown";
import { useThemeToggle } from '../components/utils/Theme.tsx';
import postsData from '../../content/posts.json' with { type: 'json' };

export const TagPage: React.FC = () => {
  const { tag } = useParams<{ tag: string }>();
  const { isDarkMode, toggleTheme } = useThemeToggle();
  const [visibleCards, setVisibleCards] = useState<Set<number>>(new Set());
  const entryRefs = useRef<(HTMLElement | null)[]>([]);

  const filtered = postsData.filter(p => p.tags.includes(tag ?? ""));

  const ink = isDarkMode ? "#f2f2f2" : "#1a1a1a";
  const inkSec = isDarkMode ? "#a0a0a0" : "#4a4a4a";
  const glassBg = isDarkMode ? "rgba(10,11,14,0.75)" : "rgba(249,247,242,0.85)";
  const border = isDarkMode ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.1)";
  const cardShadow = isDarkMode
    ? "0 25px 60px rgba(0,0,0,0.9), inset 0 1px 0 rgba(255,255,255,0.1)"
    : "0 20px 50px rgba(0,0,0,0.05)";

  useEffect(() => {
    document.body.style.backgroundColor = "transparent";
    return () => { document.body.style.backgroundColor = ""; };
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const idx = entryRefs.current.indexOf(entry.target as HTMLElement);
            if (idx !== -1) {
              setVisibleCards((prev) => new Set([...prev, idx]));
              observer.unobserve(entry.target);
            }
          }
        });
      },
      { threshold: 0.1, rootMargin: "0px 0px -40px 0px" }
    );
    entryRefs.current.forEach((el) => { if (el) observer.observe(el); });
    return () => observer.disconnect();
  }, [filtered.length]);

  return (
    <Box sx={{
      minHeight: "100vh", position: "relative", overflow: "hidden",
      backgroundColor: "transparent", color: ink, transition: "color 1.2s ease",
    }}>

      {/* Fixed background — light */}
      <Box sx={{
        position: "fixed", top: 0, left: 0, width: "100%", height: "100vh",
        backgroundImage: "url(/orig1.png)", backgroundSize: "cover",
        backgroundRepeat: "no-repeat", backgroundPosition: "center 10%",
        zIndex: 0,
        transform: isDarkMode ? "scale(1)" : "scale(1.05)",
        filter: isDarkMode ? "blur(10px) brightness(0.6)" : "blur(0px) brightness(1)",
        transition: "transform 1.2s cubic-bezier(0.2,0.8,0.2,1), filter 1.2s ease",
      }} />
      {/* Fixed background — dark */}
      <Box sx={{
        position: "fixed", top: 0, left: 0, width: "100%", height: "100vh",
        backgroundImage: "url(/dark_theme.png)", backgroundSize: "cover",
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
        background: "linear-gradient(to bottom, rgba(249,247,242,0.1) 0%, rgba(249,247,242,0.4) 40%, rgba(249,247,242,0.95) 85%, #f9f7f2 100%)",
        opacity: isDarkMode ? 0 : 1,
        transition: "opacity 1.2s ease-in-out",
      }} />
      {/* Dark overlay */}
      <Box sx={{
        position: "fixed", top: 0, left: 0, width: "100%", height: "100%",
        zIndex: 2, pointerEvents: "none",
        background: "linear-gradient(to bottom, rgba(10,11,14,0.1) 0%, rgba(10,11,14,0.6) 50%, rgba(10,11,14,0.92) 100%)",
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
      <Box component="main" sx={{
        position: "relative", zIndex: 3,
        maxWidth: "900px", margin: "0 auto",
        px: { xs: "20px", md: 0 },
        pt: "140px", pb: "100px",
      }}>
        {/* Tag header */}
        <Box sx={{ mb: "60px" }}>
          <Typography sx={{
            fontFamily: "'Fira Code', monospace", fontSize: "0.8rem",
            textTransform: "uppercase", letterSpacing: "0.15em",
            color: inkSec, mb: "12px",
            display: "flex", alignItems: "center", gap: "12px",
            transition: "color 1.2s ease",
            "&::before": {
              content: '""', display: "inline-block",
              width: "30px", height: "1px", backgroundColor: inkSec,
            },
          }}>
            // tag
          </Typography>
          <Typography sx={{
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: { xs: "3rem", md: "4.5rem" },
            fontWeight: 600, letterSpacing: "-0.02em",
            color: ink, lineHeight: 1,
            transition: "color 1.2s ease",
          }}>
            {tag}
          </Typography>
          <Typography sx={{
            fontFamily: "'Fira Code', monospace", fontSize: "0.8rem",
            color: inkSec, mt: "12px", transition: "color 1.2s ease",
          }}>
            {filtered.length} {filtered.length === 1 ? "article" : "articles"}
          </Typography>
        </Box>

        {/* Cards */}
        {filtered.length === 0 ? (
          <Typography sx={{
            fontFamily: "'Cormorant Garamond', serif", fontSize: "1.5rem",
            fontStyle: "italic", color: inkSec,
          }}>
            No articles found for this tag.
          </Typography>
        ) : (
          filtered.map((post, i) => {
            const isVisible = visibleCards.has(i);
            return (
              <Box
                key={post.slug}
                ref={(el) => { entryRefs.current[i] = el as HTMLElement; }}
                sx={{
                  position: "relative",
                  background: glassBg,
                  backdropFilter: "blur(15px)",
                  WebkitBackdropFilter: "blur(15px)",
                  border: `1px solid ${border}`,
                  padding: { xs: "30px", md: "50px 60px" },
                  mb: "60px", borderRadius: "8px",
                  boxShadow: cardShadow,
                  opacity: isVisible ? 1 : 0,
                  transform: isVisible ? "translateY(0)" : "translateY(40px)",
                  transition: "opacity 1s ease, transform 0.6s cubic-bezier(0.2,0.8,0.2,1), background 1.2s ease-in-out, border-color 1.2s ease-in-out",
                  "&:hover": isVisible ? {
                    transform: "translateY(-5px)",
                    borderColor: inkSec,
                  } : {},
                }}
              >
                {/* Meta */}
                <Box sx={{
                  fontFamily: "'Fira Code', monospace", fontSize: "0.8rem",
                  textTransform: "uppercase", letterSpacing: "0.1em",
                  color: inkSec, mb: "20px",
                  display: "flex", alignItems: "center", gap: "15px",
                  transition: "color 1.2s ease",
                  "&::before": {
                    content: '""', display: "inline-block",
                    width: "30px", height: "1px",
                    backgroundColor: inkSec, transition: "background 1.2s ease",
                  },
                }}>
                  <span>{post.date}</span>
                  <span>// {post.category}</span>
                </Box>

                {/* Title */}
                <Typography sx={{
                  fontFamily: "'Cormorant Garamond', serif",
                  fontSize: { xs: "2rem", md: "3rem" },
                  fontWeight: 600, letterSpacing: "-0.02em",
                  color: ink, mb: "20px", transition: "color 1.2s ease",
                }}>
                  {post.title}
                </Typography>

                {/* Description */}
                <Box sx={{
                  fontFamily: "'Cormorant Garamond', serif", fontSize: "1.35rem",
                  lineHeight: 1.6, color: inkSec, transition: "color 1.2s ease",
                  "& p": { margin: 0 },
                  "& strong": { color: ink, fontWeight: 700 },
                  "& em": { fontStyle: "italic" },
                  "& code": {
                    fontFamily: "'Fira Code', monospace", fontSize: "1.1rem",
                    background: isDarkMode ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.06)",
                    padding: "0.1em 0.35em", borderRadius: "3px",
                  },
                }}>
                  <ReactMarkdown>{post.description}</ReactMarkdown>
                </Box>

                {/* Read more */}
                <Box component={RouterLink} to={`/posts/${post.slug}`} sx={{
                  display: "inline-block", mt: "30px",
                  textDecoration: "none", color: ink, fontSize: "1.1rem",
                  fontFamily: "'Cormorant Garamond', serif", fontWeight: 700,
                  borderBottom: "1px solid transparent",
                  transition: "all 0.3s ease, color 1.2s ease", zIndex: 2,
                  "&::after": {
                    content: '""', position: "absolute",
                    top: 0, left: 0, width: "100%", height: "100%", zIndex: 1,
                  },
                  "&:hover": { borderBottomColor: ink, letterSpacing: "0.05em" },
                }}>
                  Continue Reading →
                </Box>
              </Box>
            );
          })
        )}
      </Box>
    </Box>
  );
};
