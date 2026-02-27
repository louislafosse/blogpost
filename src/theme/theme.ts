import { createTheme } from "@mui/material";
import { gruvboxDark, gruvboxLight } from 'react-syntax-highlighter/dist/esm/styles/prism';

declare module '@mui/material/styles' {
    interface Palette {
        button: {
            main: string;
            hover: string;
        };
    }
    interface PaletteOptions {
        button?: {
            main?: string;
            hover?: string;
        };
    }
}

export const lightTheme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: "#f5f5fa",
    },
    secondary: {
      main: "#ffffff",
    },
    text: {
      primary: "#364764",
      secondary: "#7d889b",
    },
    error: {
        main: "#ef5350",
    },

    button: {
      main: '#0493D4',
      hover: '#0479af',
    },
  },
  typography: {
    fontFamily: "Poppins, sans-serif",
  },
  spacing: 8,
  components: {
    MuiTypography: {
      styleOverrides: {
        h6: {
          color: '#ffffff',
        },
      },
    },
  },
});

export const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: "#1D2125",
    },
    secondary: {
      main: "#1D2125",
    },
    text: {
      primary: "#ffffff",
      secondary: "rgba(255, 255, 255, 0.8)",
    },
    error: {
        main: "#ef5350",
    },
    button: {
      main: '#0493D4',
      hover: '#0479af',
    },
    background: {
      default: "#121212", // Ensure background default is black
    },
  },
  typography: {
    fontFamily: "Poppins, sans-serif",
  },
  spacing: 8,
  components: {
    MuiTypography: {
      styleOverrides: {
        h6: {
          color: '#ffffff',
        },
      },
    },
  },
});

export const customGruvboxDark = {
  ...gruvboxDark,
  'pre[class*="language-"]': {
    ...gruvboxDark['pre[class*="language-"]'],
    background: '#2a2a2a',
  },
  'code[class*="language-"]': {
    ...gruvboxDark['code[class*="language-"]'],
    background: '#2a2a2a',
  },
};

export const customGruvboxLight = {
  ...gruvboxLight,
  'pre[class*="language-"]': {
    ...gruvboxLight['pre[class*="language-"]'],
    background: '#d4d4d4',
  },
  'code[class*="language-"]': {
    ...gruvboxLight['code[class*="language-"]'],
    background: '#d4d4d4',
  },
};

// export const codeDarkTheme = {
//   'code[class*="language-"]': {
//     color: 'rgba(255, 255, 255, 87%)',
//     background: '#121212',
//     fontFamily: 'monospace, Monaco, "Andale Mono", "Ubuntu Mono"',
//     fontSize: '1em',
//     lineHeight: '1.5',
//     direction: 'ltr',
//     textAlign: 'left',
//     whiteSpace: 'pre',
//     wordSpacing: 'normal',
//     wordBreak: 'normal',
//     MozTabSize: '4',
//     OTabSize: '4',
//     tabSize: '4',
//     WebkitHyphens: 'none',
//     MozHyphens: 'none',
//     msHyphens: 'none',
//     hyphens: 'none',
//   },
//   'pre[class*="language-"]': {
//     color: 'rgba(255, 255, 255, 87%)',
//     background: '#121212',
//     fontFamily: 'Consolas, Monaco, "Andale Mono", "Ubuntu Mono", monospace',
//     fontSize: '1em',
//     lineHeight: '1.5',
//     direction: 'ltr',
//     textAlign: 'left',
//     whiteSpace: 'pre',
//     wordSpacing: 'normal',
//     wordBreak: 'normal',
//     MozTabSize: '4',
//     OTabSize: '4',
//     tabSize: '4',
//     WebkitHyphens: 'none',
//     MozHyphens: 'none',
//     msHyphens: 'none',
//     hyphens: 'none',
//     padding: '1em',
//     margin: '.5em 0',
//     overflow: 'auto',
//     borderRadius: '0.3em',
//   },
//   'comment': { color: 'rgba(255, 255, 255, 60%)' },
//   'prolog': { color: 'rgba(255, 255, 255, 60%)' },
//   'doctype': { color: 'rgba(255, 255, 255, 60%)' },
//   'cdata': { color: 'rgba(255, 255, 255, 60%)' },
//   'punctuation': { color: 'rgba(255, 255, 255, 87%)' },
//   'namespace': { opacity: 0.7 },
//   'property': { color: '#ef5350' },
//   'tag': { color: '#ef5350' },
//   'constant': { color: '#ef5350' },
//   'symbol': { color: '#ef5350' },
//   'deleted': { color: '#ef5350' },
//   'boolean': { color: '#f88478' },
//   'number': { color: '#f88478' },
//   'selector': { color: '#f8819c' },
//   'attr-name': { color: '#f8819c' },
//   'string': { color: '#89a2f6' },
//   'char': { color: '#89a2f6' },
//   'builtin': { color: '#89a2f6' },
//   'inserted': { color: '#89a2f6' },
//   'operator': { color: '#ef5350' },
//   'entity': { color: 'rgba(255, 255, 255, 87%)', cursor: 'help' },
//   'url': { color: 'rgba(255, 255, 255, 87%)' },
//   'atrule': { color: 'rgba(255, 255, 255, 87%)' },
//   'attr-value': { color: 'rgba(255, 255, 255, 87%)' },
//   'keyword': { color: '#b794f6' },
//   'function': { color: '#ef5350' },
//   'class-name': { color: '#f8819c' },
//   'regex': { color: '#89a2f6' },
//   'important': { color: '#ef5350', fontWeight: 'bold' },
//   'variable': { color: '#ef5350' },
//   'bold': { fontWeight: 'bold' },
//   'italic': { fontStyle: 'italic' },
// };


// export const codeLightTheme = {
//   'code[class*="language-"]': {
//     color: 'rgba(0, 0, 0, 87%)',
//     background: '#ffffff',
//     fontFamily: 'monospace, Monaco, "Andale Mono", "Ubuntu Mono"',
//     fontSize: '1em',
//     lineHeight: '1.5',
//     direction: 'ltr',
//     textAlign: 'left',
//     whiteSpace: 'pre',
//     wordSpacing: 'normal',
//     wordBreak: 'normal',
//     MozTabSize: '4',
//     OTabSize: '4',
//     tabSize: '4',
//     WebkitHyphens: 'none',
//     MozHyphens: 'none',
//     msHyphens: 'none',
//     hyphens: 'none',
//   },
//   'pre[class*="language-"]': {
//     color: 'rgba(0, 0, 0, 87%)',
//     background: '#ffffff',
//     fontFamily: 'Consolas, Monaco, "Andale Mono", "Ubuntu Mono", monospace',
//     fontSize: '1em',
//     lineHeight: '1.5',
//     direction: 'ltr',
//     textAlign: 'left',
//     whiteSpace: 'pre',
//     wordSpacing: 'normal',
//     wordBreak: 'normal',
//     MozTabSize: '4',
//     OTabSize: '4',
//     tabSize: '4',
//     WebkitHyphens: 'none',
//     MozHyphens: 'none',
//     msHyphens: 'none',
//     hyphens: 'none',
//     padding: '1em',
//     margin: '.5em 0',
//     overflow: 'auto',
//     borderRadius: '0.3em',
//   },
//   'comment': { color: 'rgba(0, 0, 0, 60%)' },
//   'prolog': { color: 'rgba(0, 0, 0, 60%)' },
//   'doctype': { color: 'rgba(0, 0, 0, 60%)' },
//   'cdata': { color: 'rgba(0, 0, 0, 60%)' },
//   'punctuation': { color: 'rgba(0, 0, 0, 87%)' },
//   'namespace': { opacity: 0.7 },
//   'property': { color: '#ef5350' },
//   'tag': { color: '#ef5350' },
//   'constant': { color: '#ef5350' },
//   'symbol': { color: '#ef5350' },
//   'deleted': { color: '#ef5350' },
//   'boolean': { color: '#f88478' },
//   'number': { color: '#f88478' },
//   'selector': { color: '#f8819c' },
//   'attr-name': { color: '#f8819c' },
//   'string': { color: '#89a2f6' },
//   'char': { color: '#89a2f6' },
//   'builtin': { color: '#89a2f6' },
//   'inserted': { color: '#89a2f6' },
//   'operator': { color: '#ef5350' },
//   'entity': { color: 'rgba(0, 0, 0, 87%)', cursor: 'help' },
//   'url': { color: 'rgba(0, 0, 0, 87%)' },
//   'atrule': { color: 'rgba(0, 0, 0, 87%)' },
//   'attr-value': { color: 'rgba(0, 0, 0, 87%)' },
//   'keyword': { color: '#b794f6' },
//   'function': { color: '#ef5350' },
//   'class-name': { color: '#f8819c' },
//   'regex': { color: '#89a2f6' },
//   'important': { color: '#ef5350', fontWeight: 'bold' },
//   'variable': { color: '#ef5350' },
//   'bold': { fontWeight: 'bold' },
//   'italic': { fontStyle: 'italic' },
// };
