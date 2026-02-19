import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { httpBatchLink } from '@trpc/client';
import { trpc } from './trpc';
import App from './App';
import Home from './pages/Home';
import FeedbackList from './pages/FeedbackList';
import FeedbackForm from './pages/FeedbackForm';
import './index.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      refetchOnMount: false,
      staleTime: Infinity,
      cacheTime: Infinity,
    },
  },
});
const trpcClient = trpc.createClient({
  links: [httpBatchLink({ url: 'http://localhost:3001/trpc' })],
});

function AppWrapper() {
  return (
    <App>
      {({ onLocationSearch, onOpenViewer, accessToken }: any) => (
        <Routes>
          <Route path="/" element={<Home onLocationSearch={onLocationSearch} onOpenViewer={onOpenViewer} accessToken={accessToken} />} />
          <Route path="/feedback" element={<FeedbackList />} />
          <Route path="/feedback/new" element={<FeedbackForm />} />
          <Route path="/feedback/:id/edit" element={<FeedbackForm />} />
        </Routes>
      )}
    </App>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <trpc.Provider client={trpcClient} queryClient={queryClient}>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AppWrapper />
      </BrowserRouter>
    </QueryClientProvider>
  </trpc.Provider>
);
