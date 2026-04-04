import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { HomePage } from '@/src/pages/home';
import { WordbookPage } from '@/src/pages/wordbook';
import { AuthForm } from '@/src/components/auth-form';

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/wordbook" element={<WordbookPage />} />
        <Route path="/auth" element={<div className="flex min-h-screen items-center justify-center bg-slate-50"><AuthForm /></div>} />
      </Routes>
    </Router>
  );
}
