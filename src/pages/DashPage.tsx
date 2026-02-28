import React, { useEffect, useRef, useState } from "react";
import { Box, Typography } from "@mui/material";
import { Link as RouterLink } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { SyntaxHighlighter } from '../lib/syntax.ts';
import { customGruvboxDark, customGruvboxLight } from '../theme/theme.ts';
import { useThemeToggle } from '../components/utils/Theme.tsx';
import postsData from '../../content/posts.json' with { type: 'json' };

const authorsIndex = import.meta.glob('../../content/authors/*.json', { eager: true, import: 'default' }) as Record<string, any>;

function getAuthor(slug?: string) {
  if (!slug) return null;
  return authorsIndex[`../../content/authors/${slug}.json`] ?? null;
}

const journalEntries = postsData.map((post) => ({
  date: post.date,
  category: `// ${post.category}`,
  title: post.title,
  body: [post.description],
  link: `/posts/${post.slug}`,
  linkLabel: "Continue Reading \u2192",
  tags: (post as any).tags as string[] | undefined,
  author: (post as any).author as string | undefined,
}));

export const Dash: React.FC = () => {
  const { isDarkMode, toggleTheme } = useThemeToggle();
  const [viewAbout, setViewAbout] = useState(false);
  const [visibleCards, setVisibleCards] = useState<Set<number>>(() => new Set());
  const entryRefs = useRef<(HTMLElement | null)[]>([]);
  const hasScrolled = useRef(false);
  const observerRef = useRef<IntersectionObserver | null>(null);

  // Scroll reveal — only after the user has scrolled at least 1px
  useEffect(() => {
    const reveal = (entries: IntersectionObserverEntry[]) => {
      if (!hasScrolled.current) return;
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const idx = entryRefs.current.indexOf(entry.target as HTMLElement);
          if (idx !== -1) {
            setVisibleCards((prev) => new Set([...prev, idx]));
            observerRef.current?.unobserve(entry.target);
          }
        }
      });
    };

    observerRef.current = new IntersectionObserver(reveal, {
      threshold: 0.05,
      rootMargin: "0px 0px 0px 0px",
    });
    entryRefs.current.forEach((el) => { if (el) observerRef.current!.observe(el); });

    const onScroll = () => {
      if (hasScrolled.current) return;
      hasScrolled.current = true;
      // Re-observe so the already-intersecting entries fire now that the gate is open
      entryRefs.current.forEach((el) => {
        if (el) {
          observerRef.current!.unobserve(el);
          observerRef.current!.observe(el);
        }
      });
    };

    self.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      observerRef.current?.disconnect();
      self.removeEventListener('scroll', onScroll);
    };
  }, []);

  // Make body transparent so fixed background images show through
  useEffect(() => {
    const prev = document.body.style.backgroundColor;
    document.body.style.backgroundColor = 'transparent';
    return () => { document.body.style.backgroundColor = prev; };
  }, []);

  // Lock scroll when About panel is open — lock both html and body for full browser coverage
  useEffect(() => {
    const html = document.documentElement;
    if (viewAbout) {
      html.style.overflow = 'hidden';
      document.body.style.overflow = 'hidden';
    } else {
      html.style.overflow = '';
      document.body.style.overflow = '';
    }
    return () => {
      html.style.overflow = '';
      document.body.style.overflow = '';
    };
  }, [viewAbout]);

  const ink = isDarkMode ? "#f2f2f2" : "#1a1a1a";
  const inkSec = isDarkMode ? "#a0a0a0" : "#4a4a4a";
  const glassBg = isDarkMode ? "rgba(10,11,14,0.75)" : "rgba(249,247,242,0.85)";
  const border = isDarkMode ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.1)";
  const codeBg = isDarkMode ? "#15161a" : "#ebe9e4";
  const cardShadow = isDarkMode
    ? "0 25px 60px rgba(0,0,0,0.9), inset 0 1px 0 rgba(255,255,255,0.1)"
    : "0 20px 50px rgba(0,0,0,0.05)";
  const titleGlow = isDarkMode ? "rgba(150,200,255,0.5)" : "rgba(255,255,255,0.8)";

  return (
    <Box sx={{
      fontFamily: "'Cormorant Garamond', serif",
      backgroundColor: 'transparent',
      color: ink,
      overflowX: "hidden",
      transition: "color 1.2s ease",
      minHeight: "100vh",
      position: 'relative',
      zIndex: 1,
      // Global keyframes declared once here
      "@keyframes inkReveal": {
        from: { opacity: 0, transform: "translateY(30px) scale(0.98)" },
        to: { opacity: 1, transform: "translateY(0) scale(1)" },
      },
      "@keyframes fadeIn": {
        to: { opacity: 0.8 },
      },
      "@keyframes drawLine": {
        to: { width: "100%" },
      },
      "@keyframes pulseGlow": {
        "0%": { textShadow: "0 0 20px rgba(150,200,255,0.3)" },
        "100%": { textShadow: "0 0 40px rgba(150,200,255,0.7), 0 0 10px #fff" },
      },
    }}>
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

      {/* Gradient overlay — two layers crossfading like the HTML */}
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
        position: "fixed", top: "20px", left: "50%", transform: "translateX(-50%)",
        zIndex: 20, display: "flex", gap: "30px",
        fontFamily: "'Fira Code', monospace", fontSize: "0.9rem",
        textTransform: "uppercase", letterSpacing: "0.1em",
      }}>
        {[
          {
            label: "Log", active: !viewAbout, onClick: () => {
              window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
              setViewAbout(false);
            }
          },
          {
            label: "About", active: viewAbout, onClick: () => {
              window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
              setViewAbout(true);
            }
          },
        ].map(({ label, active, onClick }) => (
          <Box key={label} component="a" href="#" onClick={(e: React.MouseEvent) => { e.preventDefault(); onClick(); }} sx={{
            color: active ? ink : inkSec,
            textDecoration: "none",
            borderBottom: active ? `1px solid ${ink}` : "1px solid transparent",
            paddingBottom: "5px",
            transition: "color 0.4s ease",
          }}>
            {label}
          </Box>
        ))}
      </Box>

      {/* Header */}
      <Box component="header" sx={{
        height: "85vh", display: "flex", flexDirection: "column",
        justifyContent: "center", alignItems: "center",
        textAlign: "center", position: "relative", zIndex: 3, padding: "20px",
      }}>
        {/* Hero text container — transition controlled at this level (no GSAP inline style conflict) */}
        <Box sx={{
          opacity: viewAbout ? 0 : 1,
          transform: viewAbout ? "translateY(-30px)" : "translateY(0)",
          pointerEvents: viewAbout ? "none" : "auto",
          transition: "opacity 1s ease, transform 1s cubic-bezier(0.2,0.8,0.2,1)",
        }}>
          {/* Title — CSS animation only, matching original HTML inkReveal */}
          <Typography onClick={toggleTheme} sx={{
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: { xs: "3rem", md: "5rem" },
            fontWeight: 600,
            letterSpacing: "-0.02em",
            color: ink,
            cursor: "pointer",
            userSelect: "none",
            mb: "10px",
            textShadow: `0 0 30px ${titleGlow}`,
            // CSS animation on mount, no GSAP — avoids inline style conflict with parent transition
            opacity: 0,
            animation: isDarkMode
              ? "inkReveal 1.5s cubic-bezier(0.23,1,0.32,1) forwards 0.5s, pulseGlow 4s infinite alternate 2s"
              : "inkReveal 1.5s cubic-bezier(0.23,1,0.32,1) forwards 0.5s",
            transition: "color 1.2s ease, text-shadow 1.2s ease, transform 0.3s ease",
            "&:hover": { transform: "scale(1.02)" },
          }}>
            Above the Sea of Nulls
          </Typography>

          {/* Subtitle — CSS fadeIn + drawLine, matching original HTML */}
          <Box sx={{
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: "1.5rem",
            fontStyle: "italic",
            fontWeight: 300,
            color: ink,
            display: "inline-block",
            position: "relative",
            opacity: 0,
            animation: "fadeIn 1s ease forwards 1.5s",
            transition: "color 1.2s ease",
            "&::after": {
              content: '""',
              position: "absolute",
              bottom: "-5px",
              left: 0,
              width: 0,
              height: "1px",
              backgroundColor: ink,
              animation: "drawLine 1.2s ease-out forwards 1.8s",
              transition: "background-color 1.2s ease",
            },
          }}>
            Notes from the precipice of memory safety.
          </Box>
        </Box>

        {/* About panel — fixed to viewport so scrolling the journal behind it is impossible */}
        {(() => {
          const a = getAuthor('louislafosse');
          return (
        <Box sx={{
          position: "fixed", top: "50%", left: "50%",
          transform: viewAbout ? "translate(-50%,-50%)" : "translate(-50%,-44%)",
          width: "90%", maxWidth: "650px",
          opacity: viewAbout ? 1 : 0,
          pointerEvents: viewAbout ? "auto" : "none",
          zIndex: 15,
          transition: "opacity 1s ease, transform 1s cubic-bezier(0.2,0.8,0.2,1)",
          background: glassBg, backdropFilter: "blur(15px)",
          WebkitBackdropFilter: "blur(15px)",
          padding: { xs: "30px", md: "50px" },
          borderRadius: "8px", border: `1px solid ${border}`,
          boxShadow: cardShadow, textAlign: "left",
        }}>
          {/* Avatar + name row */}
          <Box sx={{ display: "flex", alignItems: "center", gap: "18px", mb: "25px", borderBottom: `1px solid ${border}`, pb: "20px" }}>
            {a?.avatar && (
              <Box component="img" src={a.avatar} alt={a?.name}
                sx={{ width: 64, height: 64, borderRadius: "50%", objectFit: "cover", border: `2px solid ${border}`, flexShrink: 0 }} />
            )}
            <Box>
              <Typography sx={{
                fontFamily: "'Cormorant Garamond', serif", fontSize: "2.2rem", fontWeight: 600,
                color: ink, lineHeight: 1.1, transition: "color 1.2s ease",
              }}>
                {a?.name ?? 'Unknown'}
              </Typography>
              {a?.handle && (
                <Typography sx={{
                  fontFamily: "'Fira Code', monospace", fontSize: "0.8rem",
                  color: inkSec, letterSpacing: "0.08em", transition: "color 1.2s ease",
                }}>
                  @{a.handle}
                </Typography>
              )}
            </Box>
          </Box>

          {/* Bio */}
          {a?.bio && (
            <Typography sx={{
              fontFamily: "'Cormorant Garamond', serif", fontSize: "1.25rem",
              color: inkSec, lineHeight: 1.8, mb: "28px", transition: "color 1.2s ease",
            }}>{a.bio}</Typography>
          )}

          {/* Links row */}
          <Box sx={{ display: "flex", gap: "20px", alignItems: "center", flexWrap: "wrap" }}>
            {a?.pgp && (
              <Box sx={{
                fontFamily: "'Fira Code', monospace", fontSize: "0.85rem",
                background: codeBg, padding: "8px 15px", borderRadius: "4px",
                border: `1px solid ${border}`, color: ink,
              }}>
                PGP: {a.pgp}
              </Box>
            )}
            {a?.email && (
              <Box component="a" href={`mailto:${a.email}`} target="_blank" rel="noreferrer" sx={{
                fontFamily: "'Fira Code', monospace", color: ink, textDecoration: "none",
                fontSize: "0.85rem", borderBottom: `1px solid ${ink}`, pb: "2px",
                transition: "opacity 0.3s ease", "&:hover": { opacity: 0.7 },
              }}>
                CONTACT
              </Box>
            )}
            {a?.links?.map((link: { label: string; url: string; handle?: string }) => (
              <Box key={link.label} component="a" href={link.url} target="_blank" rel="noreferrer" sx={{
                fontFamily: "'Fira Code', monospace", color: inkSec, textDecoration: "none",
                fontSize: "0.8rem", letterSpacing: "0.08em",
                textTransform: link.handle ? "none" : "uppercase",
                transition: "opacity 0.3s ease, color 1.2s ease",
                "&:hover": { opacity: 0.6 },
              }}>
                {link.handle ?? link.label}
              </Box>
            ))}
          </Box>
        </Box>
          );
        })()}
      </Box>

      {/* Journal entries */}
      <Box component="main" sx={{
        position: "relative", zIndex: 3, maxWidth: "900px",
        margin: "0 auto", pb: "100px", px: { xs: "20px", md: 0 },
        opacity: viewAbout ? 0 : 1,
        transform: viewAbout ? "translateY(40px)" : "translateY(0)",
        pointerEvents: viewAbout ? "none" : "auto",
        transition: "opacity 1s ease, transform 1s cubic-bezier(0.2,0.8,0.2,1)",
      }}>
        {journalEntries.map((entry, i) => {
          const isVisible = visibleCards.has(i);
          return (
            <Box
              key={i}
              ref={(el) => { entryRefs.current[i] = el as HTMLElement; }}
              sx={{
                position: "relative",
                background: glassBg,
                backdropFilter: "blur(15px)",
                WebkitBackdropFilter: "blur(15px)",
                border: `1px solid ${border}`,
                padding: { xs: "30px", md: "50px 60px" },
                mb: "60px",
                borderRadius: "8px",
                boxShadow: cardShadow,
                // Visibility driven by React state — survives theme re-renders
                opacity: isVisible ? 1 : 0,
                transform: isVisible ? "translateY(0)" : "translateY(40px)",
                transition: "opacity 1s ease, transform 0.6s cubic-bezier(0.2,0.8,0.2,1), background 1.2s ease-in-out, border-color 1.2s ease-in-out, box-shadow 1.2s ease-in-out, color 1.2s ease-in-out",
                "&:hover": isVisible ? {
                  transform: "translateY(-5px)",
                  borderColor: inkSec,
                  boxShadow: isDarkMode
                    ? "0 35px 70px rgba(0,0,0,0.95), inset 0 1px 0 rgba(255,255,255,0.2)"
                    : "0 30px 60px rgba(0,0,0,0.08)",
                } : {},
              }}
            >
              {/* Meta row: date · category · author */}
              <Box sx={{
                fontFamily: "'Fira Code', monospace", fontSize: "0.8rem",
                textTransform: "uppercase", letterSpacing: "0.1em",
                color: inkSec, mb: "20px",
                display: "flex", alignItems: "center", gap: "15px",
                flexWrap: "wrap",
                transition: "color 1.2s ease",
                "&::before": {
                  content: '""', display: "inline-block",
                  width: "30px", height: "1px",
                  backgroundColor: inkSec, transition: "background 1.2s ease",
                  flexShrink: 0,
                },
              }}>
                <span>{entry.date}</span>
                <span>{entry.category}</span>
                {(() => {
                  const a = getAuthor(entry.author);
                  if (!a) return null;
                  return (
                    <Box
                      component={RouterLink}
                      to={`/author/${entry.author}`}
                      sx={{
                        display: "flex", alignItems: "center", gap: "7px",
                        ml: "auto", textDecoration: "none",
                        color: inkSec, transition: "color 0.2s ease",
                        "&:hover": { color: ink },
                      }}
                    >
                      {a.avatar && (
                        <Box
                          component="img"
                          src={a.avatar}
                          alt={a.name}
                          sx={{
                            width: 22, height: 22, borderRadius: "50%",
                            objectFit: "cover",
                            border: `1px solid ${border}`,
                            flexShrink: 0,
                          }}
                        />
                      )}
                      <span>{a.name ?? entry.author}</span>
                    </Box>
                  );
                })()}
              </Box>

              {/* Title */}
              <Typography sx={{
                fontFamily: "'Cormorant Garamond', serif",
                fontSize: { xs: "2rem", md: "3rem" },
                fontWeight: 600, letterSpacing: "-0.02em",
                color: ink, mb: "30px", transition: "color 1.2s ease",
              }}>
                {entry.title}
              </Typography>

              {/* Body — rendered as markdown */}
              {entry.body.map((para, j) => (
                <Box key={j} sx={{
                  fontFamily: "'Cormorant Garamond', serif", fontSize: "1.35rem",
                  lineHeight: 1.6, color: inkSec, transition: "color 1.2s ease", mb: "1em",
                  "& p": { margin: 0 },
                  "& strong": { color: ink, fontWeight: 700 },
                  "& em": { fontStyle: "italic" },
                  "& code": {
                    fontFamily: "'Fira Code', monospace", fontSize: "1.1rem",
                    background: isDarkMode ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.06)",
                    padding: "0.1em 0.35em", borderRadius: "3px",
                  },
                }}>
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      code({ className, children, ...props }: any) {
                        const match = /language-(\w+)/.exec(className || '');
                        if (match) {
                          return (
                            <SyntaxHighlighter
                              style={isDarkMode ? customGruvboxDark : customGruvboxLight}
                              language={match[1]}
                              PreTag="div"
                              customStyle={{ borderRadius: '6px', fontSize: '0.82rem', margin: '0.8em 0' }}
                            >
                              {String(children).replace(/\n$/, '')}
                            </SyntaxHighlighter>
                          );
                        }
                        return <code className={className} {...props}>{children}</code>;
                      },
                    }}
                  >{para}</ReactMarkdown>
                </Box>
              ))}

              {/* Tags row */}
              {entry.tags && entry.tags.length > 0 && (
                <Box sx={{ display: "flex", flexWrap: "wrap", gap: "6px", mt: "28px" }}>
                  {entry.tags.map((tag) => (
                    <Box
                      key={tag}
                      component={RouterLink}
                      to={`/tags/${tag}`}
                      sx={{
                        fontFamily: "'Fira Code', monospace", fontSize: "0.7rem",
                        textTransform: "lowercase", letterSpacing: "0.05em",
                        color: inkSec,
                        border: `1px solid ${border}`,
                        borderRadius: "3px",
                        px: "8px", py: "3px",
                        textDecoration: "none",
                        transition: "color 0.2s ease, border-color 0.2s ease",
                        "&:hover": { color: ink, borderColor: inkSec },
                      }}
                    >
                      #{tag}
                    </Box>
                  ))}
                </Box>
              )}

              {/* Read more — ::after covers the whole card (card has position:relative) */}
              <Box component={RouterLink} to={entry.link} sx={{
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
                {entry.linkLabel}
              </Box>
            </Box>
          );
        })}
      </Box>

      {/* Footer */}
      <Box component="footer" sx={{
        textAlign: "center", padding: "80px 20px",
        position: "relative", zIndex: 3,
        opacity: viewAbout ? 0 : 1,
        transform: viewAbout ? "translateY(40px)" : "translateY(0)",
        pointerEvents: viewAbout ? "none" : "auto",
        transition: "opacity 1s ease, transform 1s cubic-bezier(0.2,0.8,0.2,1)",
      }}>
        <Box sx={{
          fontFamily: "'Cormorant Garamond', serif", fontSize: "2rem",
          fontStyle: "italic", color: inkSec, transition: "color 1.2s ease",
        }}>
          The Wanderer
        </Box>
        <Box sx={{
          fontFamily: "'Fira Code', monospace", mt: "10px",
          fontSize: "0.7rem", color: inkSec, transition: "color 1.2s ease",
        }}>
          EST. 2026 • Nowhere
        </Box>
      </Box>
    </Box>
  );
};

