import React, { useState, useEffect } from "react";
import ReactDOM from 'react-dom';
import { styled } from '@mui/material/styles';
import { Box, useTheme, Link } from '@mui/material';

export const MarkdownContainer = styled('div')`
  margin: 0 auto;
  padding: 3rem 4rem 4rem;
  color: ${props => props.theme.palette.text.primary};
  font-family: "Cormorant Garamond", Georgia, serif;
  font-size: 1.2rem;
  line-height: 1.85;
  max-width: 960px;

  @media (max-width: 640px) {
    padding: 2rem 1.5rem;
  }

  p {
    font-family: "Cormorant Garamond", Georgia, serif;
    font-size: 1.2rem;
    line-height: 1.85;
    margin-bottom: 1.4rem;
    color: ${props => props.theme.palette.text.primary};
  }

  blockquote {
    position: relative;
    font-style: italic;
    font-family: "Cormorant Garamond", Georgia, serif;
    font-size: 1.25rem;
    color: ${props => props.theme.palette.text.secondary};
    margin: 2rem 0;
    padding: 0.4rem 0 0.4rem 1.8rem;
    border-left: 2px solid ${props => props.theme.palette.mode === 'dark'
      ? 'rgba(255,255,255,0.25)'
      : 'rgba(0,0,0,0.22)'};
    background: transparent;

    p {
      margin: 0;
      color: inherit;
    }
  }

  h1, h2, h3, h4, h5, h6 {
    font-family: "Cormorant Garamond", Georgia, serif;
    font-weight: 600;
    letter-spacing: -0.01em;
    color: ${props => props.theme.palette.text.primary};
    margin-top: 2.5rem;
    margin-bottom: 0.75rem;
  }

  h1.markdown-h1 {
    font-size: 2.6rem;
    font-weight: 700;
    line-height: 1.15;
    letter-spacing: -0.02em;
    border-bottom: 1px solid ${props => props.theme.palette.mode === 'dark'
      ? 'rgba(255,255,255,0.1)'
      : 'rgba(0,0,0,0.1)'};
    padding-bottom: 0.6rem;
    margin-bottom: 1.2rem;

    a {
      text-decoration: none;
      color: inherit;
      transition: opacity 0.2s ease;
      &:hover { opacity: 0.7; }
    }
  }

  h2 {
    font-size: 1.9rem;
    a {
      text-decoration: none;
      color: inherit;
      transition: opacity 0.2s ease;
      &:hover { opacity: 0.7; }
    }
  }

  h3 {
    font-size: 1.5rem;
    a {
      text-decoration: none;
      color: inherit;
      transition: opacity 0.2s ease;
      &:hover { opacity: 0.7; }
    }
  }

  h4 {
    font-size: 1.25rem;
    a {
      text-decoration: none;
      color: inherit;
      transition: opacity 0.2s ease;
      &:hover { opacity: 0.7; }
    }
  }

  pre {
    border-radius: 4px;
    margin: 1.5rem 0;
    font-size: 0.88rem;
    line-height: 1.6;
    position: relative;
    overflow: auto;
  }

  /* Reset margin on any pre nested inside SyntaxHighlighter's div wrapper */
  div[class*="language-"] pre,
  div[class*="prism-code"] pre {
    margin: 0;
    padding: 0;
    background: transparent;
    border: none;
    overflow: visible;
  }

  pre:has(code.language-mermaid) {
    background: transparent;
    border: none;
    padding: 0;
    &::before { display: none; }
  }

  /* Mermaid SVG is intercepted in DocsPage components — styling applied there */

  code:not(pre > code):not([class*="language-"]) {
    font-family: "Fira Code", monospace;
    font-size: 0.85em;
    background: ${props => props.theme.palette.mode === 'dark'
      ? 'rgba(255,255,255,0.08)'
      : 'rgba(0,0,0,0.06)'};
    border-radius: 3px;
    padding: 0.15em 0.45em;
  }

  a {
    color: ${props => props.theme.palette.text.primary};
    text-decoration: none;
    border-bottom: 1px solid ${props => props.theme.palette.mode === 'dark'
      ? 'rgba(255,255,255,0.35)'
      : 'rgba(0,0,0,0.3)'};
    padding-bottom: 1px;
    transition: opacity 0.2s ease;
    &:hover {
      opacity: 0.6;
    }
  }

  p, ul, ol {
    font-family: "Cormorant Garamond", Georgia, serif;
    font-size: 1.2rem;
    line-height: 1.85;
  }

  ul, ol {
    margin-left: 0;
    padding-left: 1.4em;
    margin-bottom: 1.4rem;
  }

  ul li, ol li {
    padding-left: 0.3em;
    margin-bottom: 0.3em;
  }

  hr {
    border: none;
    border-top: 1px solid ${props => props.theme.palette.mode === 'dark'
      ? 'rgba(255,255,255,0.1)'
      : 'rgba(0,0,0,0.1)'};
    margin: 2.5rem 0;
  }

  details {
    margin: 1.5rem 0;
    border: 1px solid ${props => props.theme.palette.mode === 'dark'
      ? 'rgba(255,255,255,0.10)'
      : 'rgba(0,0,0,0.10)'};
    border-radius: 6px;
    background: ${props => props.theme.palette.mode === 'dark'
      ? 'rgba(255,255,255,0.03)'
      : 'rgba(0,0,0,0.02)'};
    overflow: hidden;
    transition: background 0.2s ease;

    &[open] {
      background: ${props => props.theme.palette.mode === 'dark'
        ? 'rgba(255,255,255,0.05)'
        : 'rgba(0,0,0,0.03)'};
    }

    summary {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.7rem 1.1rem;
      font-family: "Fira Code", "Courier New", monospace;
      font-size: 0.9rem;
      font-weight: 500;
      letter-spacing: 0.03em;
      color: ${props => props.theme.palette.text.primary};
      cursor: pointer;
      user-select: none;
      list-style: none;
      border-radius: 6px;
      transition: background 0.15s ease, color 0.15s ease;

      &::-webkit-details-marker { display: none; }

      &::before {
        content: '▸';
        font-size: 1.5rem;
        transition: transform 0.2s ease;
        color: ${props => props.theme.palette.mode === 'dark'
          ? 'rgba(255,255,255,0.45)'
          : 'rgba(0,0,0,0.4)'};
      }

      &:hover {
        background: ${props => props.theme.palette.mode === 'dark'
          ? 'rgba(255,255,255,0.06)'
          : 'rgba(0,0,0,0.05)'};
      }
    }

    &[open] > summary::before {
      transform: rotate(90deg);
    }

    /* content area — everything after summary */
    & > *:not(summary) {
      padding: 0 1.2rem;
      &:first-of-type { margin-top: 0.8rem; }
      &:last-child { margin-bottom: 1rem; }
    }
  }

  img.markdown-img {
    display: block;
    margin: 2rem auto;
    width: 80%;
    max-width: 100%;
    border: 1px solid ${props => props.theme.palette.mode === 'dark'
      ? 'rgba(255,255,255,0.08)'
      : 'rgba(0,0,0,0.1)'};
    border-radius: 4px;
    cursor: zoom-in;
    transition: opacity 0.3s ease, transform 0.3s ease;

    &:hover {
      opacity: 0.88;
      transform: scale(1.01);
    }
  }
`;

export const Heading: React.FC<{
  level: number;
  children: React.ReactNode;
  noShitPlease?: boolean;
}> = ({ level, children, noShitPlease, style }: { level: number; children: React.ReactNode; noShitPlease?: boolean; style?: React.CSSProperties }) => {
  const text = React.Children.toArray(children).reduce((acc, child) => {
    if (typeof child === 'string') {
      return acc + child;
    } else if (React.isValidElement(child) && typeof child.props.children === 'string') {
      return acc + child.props.children;
    }
    return acc;
  }, '');

  const id = typeof text === 'string' ? text.toLowerCase().replace(/\s+/g, '-') : '';

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    const element = document.getElementById(id);
    if (element) {
      window.history.pushState(null, '', `#${id}`);
      const yOffset = -25; // Adjust this value to control the offset
      const y = element.getBoundingClientRect().top + window.pageYOffset + yOffset;
      window.scrollTo({ top: y, behavior: 'smooth' });
    }
  };

  return React.createElement(
    `h${level}`,
    {
      id,
      className: [level === 1 && !noShitPlease ? "markdown-h1" : undefined].filter(Boolean).join(' '),
      style,
    },
    <a href={`#${id}`} onClick={handleClick} style={{ textDecoration: 'none', color: 'inherit' }}>
      {children}
    </a>
  );
};

export const ImageLightbox: React.FC<{ src: string; alt?: string; onClose: () => void }> = ({ src, alt, onClose }) => {
  const [closing, setClosing] = useState(false);

  const dismiss = () => {
    if (closing) return;
    setClosing(true);
  };

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') dismiss(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [closing]);

  return (
    <Box
      onClick={dismiss}
      onAnimationEnd={(e) => { if (closing && e.target === e.currentTarget) onClose(); }}
      sx={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.85)',
        zIndex: 9998,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: 'zoom-out',
        animation: closing
          ? 'lbFadeOut 0.5s cubic-bezier(0.4,0,0.2,1) forwards'
          : 'lbFadeIn 0.45s cubic-bezier(0.2,0.8,0.2,1) forwards',
        '@keyframes lbFadeIn':  { from: { opacity: 0 }, to: { opacity: 1 } },
        '@keyframes lbFadeOut': { from: { opacity: 1 }, to: { opacity: 0 } },
      }}
    >
      <Box
        component="img"
        src={src}
        alt={alt ?? ''}
        onClick={dismiss}
        sx={{
          maxWidth: '88vw',
          maxHeight: '88vh',
          objectFit: 'contain',
          borderRadius: '6px',
          cursor: 'zoom-out',
          boxShadow: '0 30px 80px rgba(0,0,0,0.7)',
          animation: closing
            ? 'lbImgOut 0.5s cubic-bezier(0.4,0,0.2,1) forwards'
            : 'lbImgIn 1.1s cubic-bezier(0.16,1,0.3,1) forwards',
          '@keyframes lbImgIn':  { from: { opacity: 0, transform: 'scale(0.68)' }, to: { opacity: 1, transform: 'scale(1)' } },
          '@keyframes lbImgOut': { from: { opacity: 1, transform: 'scale(1)' },    to: { opacity: 0, transform: 'scale(0.82)' } },
        }}
      />
    </Box>
  );
};

export const HoverIframeLink: React.FC<{
  href: string;
  children: React.ReactNode;
  [key: string]: any;
}> = ({ href, children }) => {
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);
  const overIframe = React.useRef(false);
  const theme = useTheme();

  const OFFSET_X = 20;
  const OFFSET_Y = 20;
  const iframeW = 540;
  const iframeH = 380;

  const computePos = (x: number, y: number) => {
    const flipX = x + OFFSET_X + iframeW > window.innerWidth;
    const flipY = y + OFFSET_Y + iframeH > window.innerHeight;
    return {
      left: flipX ? x - iframeW - OFFSET_X : x + OFFSET_X,
      top:  flipY ? y - iframeH - OFFSET_Y : y + OFFSET_Y,
    };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!overIframe.current) setMousePos({ x: e.clientX, y: e.clientY });
  };

  const handleMouseLeave = () => {
    setTimeout(() => { if (!overIframe.current) setMousePos(null); }, 50);
  };

  const pos = mousePos ? computePos(mousePos.x, mousePos.y) : null;

  return (
    <span
      style={{ position: 'relative', display: 'inline' }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      <Link href={href} target="_blank" rel="noreferrer">
        {children}
      </Link>

      {pos && ReactDOM.createPortal(
        <Box
          onMouseEnter={() => { overIframe.current = true; }}
          onMouseLeave={() => { overIframe.current = false; setMousePos(null); }}
          onWheelCapture={(e: React.WheelEvent) => { e.stopPropagation(); }}
          sx={{
            position: 'fixed',
            top: pos.top,
            left: pos.left,
            width: iframeW,
            height: iframeH,
            border: `1px solid ${theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.12)'}`,
            borderRadius: '8px',
            backgroundColor: theme.palette.mode === 'dark' ? '#141414' : '#fff',
            zIndex: 9999,
            overflow: 'hidden',
            pointerEvents: 'auto',
            boxShadow: theme.palette.mode === 'dark'
              ? '0 24px 70px rgba(0,0,0,0.9), 0 0 0 1px rgba(255,255,255,0.08), 0 0 32px 4px rgba(120,120,160,0.18), inset 0 0 0 1px rgba(255,255,255,0.06)'
              : '0 16px 48px rgba(0,0,0,0.18), 0 0 0 1px rgba(0,0,0,0.08), 0 0 28px 4px rgba(80,80,120,0.10), inset 0 0 0 1px rgba(255,255,255,0.7)',
            animation: 'iframeAppear 0.18s cubic-bezier(0.2,0.8,0.2,1) forwards',
            '@keyframes iframeAppear': {
              from: { opacity: 0, transform: 'scale(0.95) translateY(4px)' },
              to:   { opacity: 1, transform: 'scale(1) translateY(0)' },
            },
          }}
        >
          <iframe
            src={href}
            width="100%"
            height="100%"
            style={{ border: 'none', display: 'block', pointerEvents: 'auto' }}
          />
        </Box>,
        document.body
      )}
    </span>
  );
};