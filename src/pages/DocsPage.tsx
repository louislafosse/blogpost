import React, { useState, useEffect, useRef } from "react";
import { useParams, Link as RouterLink } from 'react-router-dom';
import { Box, Typography, useTheme } from "@mui/material";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { SyntaxHighlighter } from '../lib/syntax.ts';
import rehypeRaw from "rehype-raw";
import rehypeStringify from "rehype-stringify";

import { customGruvboxDark, customGruvboxLight } from './../theme/theme.ts';
import { useThemeToggle } from './../components/utils/Theme.tsx';
import postsData from '../../content/posts.json' with { type: 'json' };

type PostEntry = typeof postsData[number] & { author?: string };
import { MarkdownContainer, Heading, ImageLightbox, HoverIframeLink } from './../components/utils/MarkdownContainer.tsx';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { IconButton } from '@mui/material';
import DoneIcon from '@mui/icons-material/Done';
import Tooltip from '@mui/material/Tooltip';

// All markdown files eagerly bundled — no async fetch, available instantly
const markdownFiles = import.meta.glob('../../content/posts/*.md', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;

interface AuthorData {
  slug: string; name: string; handle: string;
  avatar: string; bio: string; pgp?: string; email?: string;
  links?: { label: string; url: string }[];
}
const authorsIndex = import.meta.glob('../../content/authors/*.json', {
  eager: true, import: 'default',
}) as Record<string, AuthorData>;

const DetailsDropdown: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  const [open, setOpen] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const theme = useTheme();
  const dark = theme.palette.mode === 'dark';

  const childArray = React.Children.toArray(children);
  const summaryEl = childArray.find(
    c => React.isValidElement(c) && (c as React.ReactElement).type === 'summary'
  ) as React.ReactElement | undefined;
  const summaryContent = summaryEl?.props?.children ?? '';
  const restChildren = childArray.filter(c => c !== summaryEl);

  const handleToggle = () => {
    const el = contentRef.current;
    if (!el) { setOpen(o => !o); return; }
    if (!open) {
      setOpen(true);
      el.style.height = '0px';
      requestAnimationFrame(() => requestAnimationFrame(() => {
        el.style.height = el.scrollHeight + 'px';
      }));
    } else {
      el.style.height = el.scrollHeight + 'px';
      requestAnimationFrame(() => requestAnimationFrame(() => {
        el.style.height = '0px';
      }));
      setOpen(false);
    }
  };

  const handleTransitionEnd = () => {
    const el = contentRef.current;
    if (!el) return;
    if (open) el.style.height = 'auto';
  };

  return (
    <Box sx={{
      my: '1.5rem',
      border: `1px solid ${dark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.10)'}`,
      borderRadius: '6px',
      background: open
        ? (dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)')
        : (dark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)'),
      overflow: 'hidden',
      transition: 'background 0.2s ease',
    }}>
      <Box
        onClick={handleToggle}
        sx={{
          display: 'flex', alignItems: 'center', gap: '0.5rem',
          px: '1.1rem', py: '0.7rem',
          fontFamily: '"Fira Code", monospace',
          fontSize: '0.9rem', fontWeight: 500, letterSpacing: '0.03em',
          color: theme.palette.text.primary,
          cursor: 'pointer', userSelect: 'none',
          transition: 'background 0.15s ease',
          '&:hover': { background: dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' },
        }}
      >
        <Box component="span" sx={{
          fontSize: '1.5rem',
          color: dark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.4)',
          transition: 'transform 0.25s cubic-bezier(0.4,0,0.2,1)',
          transform: open ? 'rotate(90deg)' : 'rotate(0deg)',
          display: 'inline-block',
          lineHeight: 1,
        }}>▸</Box>
        {summaryContent}
      </Box>
      <Box
        ref={contentRef}
        style={{ height: '0px', overflow: 'hidden', transition: 'height 0.30s cubic-bezier(0.4,0,0.2,1)' }}
        onTransitionEnd={handleTransitionEnd}
      >
        <Box sx={{ px: '1.2rem', pb: '1rem', pt: '0.2rem' }}>
          {restChildren}
        </Box>
      </Box>
    </Box>
  );
};

export const DocsPage: React.FC = () => {
  const theme = useTheme();
  const { isDarkMode, toggleTheme } = useThemeToggle();
  const { slug } = useParams<{ slug: string }>();
  const post = (postsData as PostEntry[]).find(p => p.slug === slug);
  const author = post?.author ? authorsIndex[`../../content/authors/${post.author}.json`] : null;
  const markdownContent = slug
    ? (markdownFiles[`../../content/posts/${slug}.md`] ?? '# Not Found\n\nThis article does not exist.')
    : '';
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const [remarkMermaid, setRemarkMermaid] = useState<any>(null);

  // Lazy-load Mermaid — keeps it out of the initial bundle
  useEffect(() => {
    import('remark-mermaid-plugin').then((m) => setRemarkMermaid(() => m.default));
  }, []);

  const titleRef = useRef<HTMLHeadingElement>(null);
  const [, setGridPosition] = useState({ top: 80, left: 455 });
  const [, setGridPositionBR] = useState({ bottom: 80, right: 80 });

  useEffect(() => {
    window.scrollTo(0, 0);
    document.body.style.backgroundColor = 'transparent';
    return () => { document.body.style.backgroundColor = ''; };
  }, []);

  const handleImageClick = (src: string) => setLightboxSrc(src);

  useEffect(() => {
    const updateGridPosition = () => {
      if (titleRef.current) {
        const titleRect = titleRef.current.getBoundingClientRect();
        const container = titleRef.current.offsetParent?.getBoundingClientRect();
        const containerLeft = container?.left || 0;
        const containerRight = container?.right || window.innerWidth;
  
        setGridPosition({
          top: titleRect.top + window.scrollY - 65,
          left: titleRect.left - containerLeft - 70
        });
  
        setGridPositionBR({
          bottom: window.innerHeight - (titleRect.bottom + window.scrollY) - 380,
          right: containerRight - titleRect.right - 60
        });
      }
    };
  
    updateGridPosition();
    window.addEventListener('resize', updateGridPosition);
    return () => window.removeEventListener('resize', updateGridPosition);
  }, []);

  const ink = isDarkMode ? "#f2f2f2" : "#1a1a1a";
  const inkSec = isDarkMode ? "#a0a0a0" : "#4a4a4a";

  return (
    <Box sx={{ minHeight: "100vh", position: "relative", overflow: "hidden" }}>

      {/* Fixed background — light */}
      <Box sx={{
        position: "fixed", top: 0, left: 0, width: "100%", height: "100vh",
        backgroundImage: `url(${import.meta.env.BASE_URL}light_theme.png)`, backgroundSize: "cover",
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

      {/* Navigation */}
      <Box component="nav" sx={{
        position: "fixed", top: 0, left: 0, right: 0,
        zIndex: 10,
        display: "flex", justifyContent: "space-between", alignItems: "center",
        padding: "30px 60px",
        pointerEvents: "none",
      }}>
        {/* Back to log */}
        <Box component={RouterLink} to="/" sx={{
          pointerEvents: "auto",
          fontFamily: "'Fira Code', monospace",
          fontSize: "0.85rem",
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          color: ink,
          textDecoration: "none",
          borderBottom: `1px solid ${ink}`,
          pb: "2px",
          transition: "color 1.2s ease, border-color 1.2s ease, opacity 0.3s ease",
          "&:hover": { opacity: 0.6 },
        }}>
          ← Log
        </Box>

        {/* Theme toggle */}
        <Box
          onClick={toggleTheme}
          sx={{
            pointerEvents: "auto",
            cursor: "pointer",
            color: inkSec,
            fontFamily: "'Fira Code', monospace",
            fontSize: "1rem",
            letterSpacing: "0.05em",
            transition: "color 1.2s ease, opacity 0.3s ease",
            "&:hover": { opacity: 0.6 },
            userSelect: "none",
          }}
        >
          {isDarkMode ? "[ light ]" : "[ dark ]"}
        </Box>
      </Box>

      {/* Contenu Markdown */}
      <Box sx={{ position: "relative", zIndex: 3, pt: "20px" }}>
      {/* Glass article panel */}
      <Box sx={{
        maxWidth: "960px",
        mx: "auto",
        px: { xs: "20px", md: 0 },
        pb: "120px",
        position: "relative",
      }}>
      {/* Left margin dot grid */}
      <Box sx={{
        display: { xs: "none", lg: "block" },
        position: "fixed",
        top: 0, left: 0,
        width: "calc((100vw - 960px) / 2 - 10px)",
        height: "100vh",
        pointerEvents: "none",
        zIndex: 4,
        backgroundImage: `radial-gradient(circle, ${isDarkMode ? "rgba(255,255,255,0.18) 1px" : "rgba(0,0,0,0.2) 1.5px"}, transparent ${isDarkMode ? "1px" : "1.5px"})`,
        backgroundSize: "24px 24px",
        maskImage: "linear-gradient(to right, transparent 0%, black 40%, black 60%, transparent 100%)",
        WebkitMaskImage: "linear-gradient(to right, transparent 0%, black 40%, black 60%, transparent 100%)",
      }} />
      {/* Right margin dot grid */}
      <Box sx={{
        display: { xs: "none", lg: "block" },
        position: "fixed",
        top: 0, right: 0,
        width: "calc((100vw - 960px) / 2 - 10px)",
        height: "100vh",
        pointerEvents: "none",
        zIndex: 4,
        backgroundImage: `radial-gradient(circle, ${isDarkMode ? "rgba(255,255,255,0.18) 1px" : "rgba(0,0,0,0.2) 1.5px"}, transparent ${isDarkMode ? "1px" : "1.5px"})`,
        backgroundSize: "24px 24px",
        maskImage: "linear-gradient(to right, transparent 0%, black 40%, black 60%, transparent 100%)",
        WebkitMaskImage: "linear-gradient(to right, transparent 0%, black 40%, black 60%, transparent 100%)",
      }} />
      <Box sx={{
        background: isDarkMode ? "rgba(8,9,12,0.88)" : "rgba(249,247,242,0.93)",
        backdropFilter: "blur(28px)",
        WebkitBackdropFilter: "blur(28px)",
        border: isDarkMode ? "1px solid rgba(255,255,255,0.06)" : "1px solid rgba(0,0,0,0.07)",
        borderRadius: "6px",
        boxShadow: isDarkMode
          ? "0 40px 100px rgba(0,0,0,0.9)"
          : "0 20px 60px rgba(0,0,0,0.07)",
        transition: "background 1.2s ease-in-out, border-color 1.2s ease-in-out, box-shadow 1.2s ease-in-out",
        overflow: "hidden",
      }}>
      <MarkdownContainer>
        <Typography
          ref={titleRef}
          component="div"
        >
          <Typography
            component="h1"
            sx={{
              fontFamily: "'Cormorant Garamond', serif",
              fontSize: { xs: "2.6rem", md: "3.8rem" },
              fontWeight: 700,
              lineHeight: 1.1,
              letterSpacing: "-0.025em",
              color: ink,
              transition: "color 1.2s ease",
              mb: "1.5rem",
            }}
          >
            {post?.title ?? ''}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', mt: 0.5, mb: 0.5 }}>
            <Box
              component={RouterLink}
              to={author ? `/author/${author.slug}` : '/'}
              sx={{
                display: 'flex', alignItems: 'center', gap: '12px',
                color: 'inherit', textDecoration: 'none',
                transition: 'opacity 0.3s ease',
                '&:hover': { opacity: 0.7 },
              }}
            >
              {author?.avatar && (
                <Box
                  component="img"
                  src={author.avatar}
                  alt={author.name}
                  sx={{
                    width: 48, height: 48, borderRadius: '50%',
                    objectFit: 'cover',
                    border: `2px solid ${isDarkMode ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.12)'}`,
                    flexShrink: 0,
                    transition: 'border-color 1.2s ease',
                  }}
                />
              )}
              <Box>
                <Box sx={{
                  color: ink,
                  fontFamily: "'Fira Code', monospace",
                  fontWeight: 500, fontSize: '0.9rem', lineHeight: 1.1,
                  transition: 'color 1.2s ease',
                }}>
                  {author?.name ?? (author?.handle ? `@${author.handle}` : 'Unknown')}
                </Box>
                <Box sx={{
                  color: inkSec,
                  fontFamily: "'Fira Code', monospace",
                  fontSize: '0.8rem', lineHeight: 1.3, mt: '3px',
                  transition: 'color 1.2s ease',
                }}>
                  {post?.date ?? ''}
                </Box>
              </Box>
            </Box>
          </Box>
          {/* Horizontal line */}
          <Box
            sx={{
              width: 128,
              marginTop: "12px",
              height: 4,
              bgcolor: theme.palette.mode === 'dark' ? '#222' : '#ddd',
              borderRadius: 2,
              mb: 2,
              ml: 0.5,
            }}
          />
        </Typography>

        <ReactMarkdown
          children={markdownContent.replace(/__(.*?)__/g, "<u>$1</u>")}
          remarkPlugins={[
            remarkGfm,
            ...(remarkMermaid ? [[remarkMermaid, { theme: isDarkMode ? 'dark' : 'default' }] as any] : []),
          ]}
          rehypePlugins={[
            rehypeRaw,
            rehypeStringify,
          ]}
          components={{
            h1: ({ children, ...props }) => <Heading level={1} {...props}>{children}</Heading>,
            h2: ({ children, ...props }) => <Heading level={2} {...props}>{children}</Heading>,
            h3: ({ children, ...props }) => <Heading level={3} {...props}>{children}</Heading>,
            h4: ({ children, ...props }) => <Heading level={4} {...props}>{children}</Heading>,
            h5: ({ children, ...props }) => <Heading level={5} {...props}>{children}</Heading>,
            h6: ({ children, ...props }) => <Heading level={6} {...props}>{children}</Heading>,
            img: ({ node, src, alt, ...props }) => (
              <img
                {...props}
                src={src}
                alt={alt}
                className="markdown-img"
                onClick={() => src && handleImageClick(src)}
              />
            ),
            svg: ({ node, id, viewBox, ...props }: any) => {
              const isMermaid = typeof id === 'string' && id.startsWith('mermaid-');
              if (!isMermaid) return <svg id={id} viewBox={viewBox} {...props} />;
              // Parse viewBox to get natural dimensions and scale them for layout
              const SCALE = 1.6;
              let scaledW: number | undefined;
              let scaledH: number | undefined;
              if (viewBox) {
                const parts = String(viewBox).trim().split(/[\s,]+/);
                if (parts.length === 4) {
                  scaledW = parseFloat(parts[2]) * SCALE;
                  scaledH = parseFloat(parts[3]) * SCALE;
                }
              }
              return (
                <Box sx={{
                  my: '3rem',
                  p: '2rem',
                  background: isDarkMode ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)',
                  border: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)'}`,
                  borderRadius: '6px',
                  display: 'flex',
                  justifyContent: 'center',
                  overflow: 'visible',
                }}>
                  <svg
                    id={id}
                    viewBox={viewBox}
                    {...props}
                    width={scaledW ?? '100%'}
                    height={scaledH ?? 'auto'}
                    style={{ display: 'block', maxWidth: '100%' }}
                  />
                </Box>
              );
            },
            pre: ({ children, ...props }) => {
              const isMermaid = React.Children.toArray(children).some(
                child => React.isValidElement(child) &&
                  child.props.className?.includes('language-mermaid')
              );

              return <pre {...props} data-is-mermaid={isMermaid}>{children}</pre>;
            },
            details: ({ node: _node, children }: any) => <DetailsDropdown>{children}</DetailsDropdown>,
            blockquote: ({ node, ...props }) => (
              <blockquote style={{ margin: 0 }} {...props} />
            ),
            a: ({ node, ...props }) => (
              <HoverIframeLink {...props} href={props.href || ''}>
                {props.children}
              </HoverIframeLink>
            ),
            code({ node, className, children, ...props }) {
              const match = /language-(\w+)/.exec(className || '');
              const inline = !className?.includes('language-');
              const codeContent = String(children).replace(/\n$/, '');
              const isMermaid = match?.[1] === 'mermaid';

              // State for copy feedback
              const [copied, setCopied] = useState(false);

              const gruvboxYellow = '#fabd2f';

              if (match && !isMermaid) {
                const handleCopy = () => {
                  navigator.clipboard.writeText(codeContent);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                };

                return (
                  <Box sx={{ position: 'relative' }}>
                    <Tooltip
                      title={copied ? "" : "Copy"}
                      placement="bottom"
                      arrow
                      disableInteractive={copied}
                      slotProps={{
                        tooltip: {
                          sx: {
                            bgcolor: theme.palette.background.paper,
                            color: theme.palette.text.secondary,
                            fontSize: 14,
                            boxShadow: 2,
                            borderRadius: 1,
                          }
                        }
                      }}
                    >
                      <IconButton
                        size="small"
                        onClick={handleCopy}
                        sx={{
                          position: 'absolute',
                          top: 12,
                          right: 12,
                          zIndex: 2,
                          background: "transparent",
                          color: copied ? gruvboxYellow : theme.palette.text.secondary,
                          border: "none",
                          boxShadow: "none",
                          transition: 'all 0.3s',
                          width: 28,
                          height: 28,
                          minWidth: 0,
                          minHeight: 0,
                          padding: '2px',
                          '& .MuiSvgIcon-root': {
                            fontSize: 16,
                          },
                          '&:hover': {
                            background: "transparent",
                            color: gruvboxYellow,
                          }
                        }}
                        aria-label="Copy code"
                      >
                        {copied ? <DoneIcon fontSize="small" /> : <ContentCopyIcon fontSize="small" />}
                      </IconButton>
                    </Tooltip>
                    <SyntaxHighlighter
                      style={isDarkMode ? customGruvboxDark : customGruvboxLight}
                      language={match[1]}
                      PreTag="div"
                    >
                      {codeContent}
                    </SyntaxHighlighter>
                  </Box>
                );
              }
              if (isMermaid) {
                return (
                  <div className="mermaid-container">
                    <code
                      className={className}
                      {...props}
                      style={{ display: 'block' }}
                    >
                      {children}
                    </code>
                  </div>
                );
              }

              if (inline) {
                return (
                  <code className={className} {...props} style={{
                    background: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
                    padding: '0.2em 0.4em',
                    borderRadius: '3px',
                    fontSize: '0.9em',
                  }}>
                    {children}
                  </code>
                );
              }

              return (
                <code className={className} {...props}>
                  {children}
                </code>
              );
            },

          }}

        />

        {/* Footer */}
        {(() => {
          const currentIndex = postsData.findIndex(p => p.slug === slug);
          const prevPost = currentIndex > 0 ? postsData[currentIndex - 1] : null;
          const nextPost = currentIndex !== -1 && currentIndex < postsData.length - 1 ? postsData[currentIndex + 1] : null;
          const tags = post?.tags ?? [];

          const navLinkSx = {
            color: theme.palette.text.primary,
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: '1.2rem',
            lineHeight: 1.3,
            display: 'block',
            fontWeight: 600,
            textDecoration: 'none',
            transition: 'opacity 0.2s ease',
            '&:hover': { opacity: 0.6 },
          };

          const labelSx = {
            color: theme.palette.text.secondary,
            fontFamily: "'Fira Code', monospace",
            fontWeight: 600,
            letterSpacing: '0.12em',
            fontSize: '0.7rem',
            textTransform: 'uppercase' as const,
            mb: '4px',
            display: 'block',
          };

          return (
            <Box sx={{ mt: 6, mb: 2 }}>
              {/* TAGS */}
              {tags.length > 0 && (
                <Typography
                  variant="caption"
                  sx={{
                    color: theme.palette.text.secondary,
                    fontFamily: "'Fira Code', monospace",
                    letterSpacing: '0.05em',
                    fontSize: 13,
                    mb: 1,
                    display: 'block',
                  }}
                >
                  Tagged{' '}
                  {tags.map((tag, idx) => (
                    <React.Fragment key={tag}>
                      <Box
                        component={RouterLink}
                        to={`/tags/${tag}`}
                        sx={{
                          color: ink,
                          fontFamily: "'Fira Code', monospace",
                          fontSize: 13,
                          ml: idx === 0 ? 0.5 : 0,
                          textDecoration: 'none',
                          borderBottom: `1px solid ${ink}`,
                          pb: '1px',
                          transition: 'opacity 0.2s ease, color 1.2s ease, border-color 1.2s ease',
                          '&:hover': { opacity: 0.6 },
                        }}
                      >
                        {tag}
                      </Box>
                      {idx < tags.length - 1 && (
                        <Box component="span" sx={{ color: theme.palette.text.secondary }}>, </Box>
                      )}
                    </React.Fragment>
                  ))}
                </Typography>
              )}

              {/* NEXT / PREVIOUS */}
              {(prevPost || nextPost) && (
                <Box sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '24px',
                  mt: '32px',
                  pt: '32px',
                  borderTop: `1px solid ${theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`,
                }}>
                  {nextPost && (
                    <Box>
                      <Box component="span" sx={labelSx}>Next</Box>
                      <Box component={RouterLink} to={`/posts/${nextPost.slug}`} sx={navLinkSx}>
                        {nextPost.title}
                      </Box>
                    </Box>
                  )}
                  {prevPost && (
                    <Box>
                      <Box component="span" sx={labelSx}>Previous</Box>
                      <Box component={RouterLink} to={`/posts/${prevPost.slug}`} sx={navLinkSx}>
                        {prevPost.title}
                      </Box>
                    </Box>
                  )}
                </Box>
              )}
            </Box>
          );
        })()}

      </MarkdownContainer>
      </Box> {/* end glass panel */}
      </Box> {/* end article column */}

      {/* Image lightbox */}
      {lightboxSrc && (
        <ImageLightbox
          src={lightboxSrc}
          onClose={() => setLightboxSrc(null)}
        />
      )}
      </Box> {/* end zIndex:3 content wrapper */}

    </Box>
  );
};
