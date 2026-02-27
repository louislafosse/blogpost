import React from 'react';
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom';
import { Dash } from './pages/DashPage.tsx';
import { DocsPage } from './pages/DocsPage.tsx';
import { TagsPage } from './pages/TagsPage.tsx';
import { TagPage } from './pages/TagPage.tsx';
import { AuthorPage } from './pages/AuthorPage.tsx';
import { ThemeToggleProvider } from './components/utils/Theme.tsx';

const RedirectToRoot: React.FC = () => {
  const navigate = useNavigate();
  React.useEffect(() => {
    navigate('/', { state: { showAlert: true }, replace: true });
  }, [navigate]);
  return null;
};

const App: React.FC = () => {

  function setTheme(comp : React.ReactNode) {
    return <ThemeToggleProvider>{comp}</ThemeToggleProvider>
  }

  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <Routes>
        <Route path="/" element={setTheme(<Dash/>)} />
        <Route path="/example" element={setTheme(<DocsPage/>)} />
        <Route path="/posts/:slug" element={setTheme(<DocsPage/>)} />
        <Route path="/tags" element={setTheme(<TagsPage/>)} />
        <Route path="/tags/:tag" element={setTheme(<TagPage/>)} />
        <Route path="/author/:slug" element={setTheme(<AuthorPage/>)} />
        <Route path="*" element={<RedirectToRoot />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;