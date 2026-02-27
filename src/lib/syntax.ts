/**
 * Light Prism build — only registers languages actually used in posts.
 * Import SyntaxHighlighter from here instead of 'react-syntax-highlighter'.
 * To add a language: import it from prism/dist/esm/languages/prism/<name>
 * and call SyntaxHighlighter.registerLanguage().
 */
// @ts-ignore — light build typings live on the full package
import SyntaxHighlighter from 'react-syntax-highlighter/dist/esm/prism-light';

// @ts-ignore
import c       from 'react-syntax-highlighter/dist/esm/languages/prism/c';
// @ts-ignore
import cpp     from 'react-syntax-highlighter/dist/esm/languages/prism/cpp';
// @ts-ignore
import bash    from 'react-syntax-highlighter/dist/esm/languages/prism/bash';
// @ts-ignore
import python  from 'react-syntax-highlighter/dist/esm/languages/prism/python';
// @ts-ignore
import rust    from 'react-syntax-highlighter/dist/esm/languages/prism/rust';
// @ts-ignore
import js      from 'react-syntax-highlighter/dist/esm/languages/prism/javascript';
// @ts-ignore
import ts      from 'react-syntax-highlighter/dist/esm/languages/prism/typescript';

SyntaxHighlighter.registerLanguage('c',          c);
SyntaxHighlighter.registerLanguage('cpp',        cpp);
SyntaxHighlighter.registerLanguage('bash',       bash);
SyntaxHighlighter.registerLanguage('sh',         bash);
SyntaxHighlighter.registerLanguage('python',     python);
SyntaxHighlighter.registerLanguage('py',         python);
SyntaxHighlighter.registerLanguage('rust',       rust);
SyntaxHighlighter.registerLanguage('rs',         rust);
SyntaxHighlighter.registerLanguage('javascript', js);
SyntaxHighlighter.registerLanguage('js',         js);
SyntaxHighlighter.registerLanguage('typescript', ts);
SyntaxHighlighter.registerLanguage('ts',         ts);

export { SyntaxHighlighter };
