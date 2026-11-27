import { Component, lazy, Suspense, useEffect, type ReactNode } from 'react';
import { useAuth } from '@/lib/auth';
import { HashRouter, Route, Routes } from 'react-router-dom';
import { BankGate } from '@/components/BankGate';
import { AppLayout } from '@/components/layout/AppLayout';
import { Toaster } from '@/components/Toaster';
import { PageSkeleton } from '@/components/PageSkeleton';
import { useApplyTheme } from '@/hooks/useTheme';
import { Button } from '@/components/ui';
import { STORE_KEY } from '@/store/useAppStore';

const Dashboard = lazy(() => import('@/pages/Dashboard'));
const Practice = lazy(() => import('@/pages/Practice'));
const PracticeSession = lazy(() => import('@/pages/PracticeSession'));
const Exams = lazy(() => import('@/pages/Exams'));
const ExamSession = lazy(() => import('@/pages/ExamSession'));
const ExamResultPage = lazy(() => import('@/pages/ExamResult'));
const Subjects = lazy(() => import('@/pages/Subjects'));
const SubjectDetail = lazy(() => import('@/pages/SubjectDetail'));
const Mistakes = lazy(() => import('@/pages/Mistakes'));
const Planner = lazy(() => import('@/pages/Planner'));
const Analytics = lazy(() => import('@/pages/Analytics'));
const Achievements = lazy(() => import('@/pages/Achievements'));
const Settings = lazy(() => import('@/pages/Settings'));
const NotFound = lazy(() => import('@/pages/NotFound'));
const Assistant = lazy(() => import('@/pages/Assistant'));
const Questions = lazy(() => import('@/pages/Questions'));
const Admin = lazy(() => import('@/pages/Admin'));
const Login = lazy(() => import('@/pages/Login'));
const Onboarding = lazy(() => import('@/pages/Onboarding'));
const Studio = lazy(() => import('@/pages/Studio'));

class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="grid min-h-screen place-items-center p-6">
        <div className="max-w-md rounded-2xl border bg-card p-8 text-center">
          <h1 className="text-lg font-semibold">Что-то пошло не так</h1>
          <p className="mt-2 text-sm text-muted-foreground">Произошла непредвиденная ошибка интерфейса. Ваши данные сохранены локально.</p>
          <pre className="mt-4 max-h-32 overflow-auto rounded-lg bg-secondary p-3 text-left text-xs text-muted-foreground">{this.state.error.message}</pre>
          <div className="mt-5 flex justify-center gap-2">
            <Button variant="secondary" onClick={() => ((location.hash = '#/'), location.reload())}>
              На главную
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                if (confirm('Сбросить все локальные данные LexEdu?')) {
                  localStorage.removeItem(STORE_KEY);
                  location.hash = '#/';
                  location.reload();
                }
              }}
            >
              Сбросить данные
            </Button>
          </div>
        </div>
      </div>
    );
  }
}

export function App() {
  useApplyTheme();
  useEffect(() => {
    void useAuth.getState().init();
  }, []);
  return (
    <ErrorBoundary>
      <HashRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Suspense fallback={<PageSkeleton full />}>
          <Routes>
            <Route path="/practice/session" element={<BankGate full><PracticeSession /></BankGate>} />
            <Route path="/exams/session" element={<BankGate full><ExamSession /></BankGate>} />
            <Route path="/login" element={<Login standalone />} />
            <Route path="/onboarding" element={<Onboarding />} />
            <Route element={<AppLayout />}>
              <Route index element={<Suspense fallback={<PageSkeleton />}><Dashboard /></Suspense>} />
              <Route path="practice" element={<Suspense fallback={<PageSkeleton />}><Practice /></Suspense>} />
              <Route path="exams" element={<Suspense fallback={<PageSkeleton />}><Exams /></Suspense>} />
              <Route path="exams/:id" element={<Suspense fallback={<PageSkeleton />}><ExamResultPage /></Suspense>} />
              <Route path="subjects" element={<Suspense fallback={<PageSkeleton />}><Subjects /></Suspense>} />
              <Route path="subjects/:id" element={<Suspense fallback={<PageSkeleton />}><SubjectDetail /></Suspense>} />
              <Route path="mistakes" element={<Suspense fallback={<PageSkeleton />}><Mistakes /></Suspense>} />
              <Route path="planner" element={<Suspense fallback={<PageSkeleton />}><Planner /></Suspense>} />
              <Route path="analytics" element={<Suspense fallback={<PageSkeleton />}><Analytics /></Suspense>} />
              <Route path="achievements" element={<Suspense fallback={<PageSkeleton />}><Achievements /></Suspense>} />
              <Route path="settings" element={<Suspense fallback={<PageSkeleton />}><Settings /></Suspense>} />
              <Route path="assistant" element={<Suspense fallback={<PageSkeleton />}><Assistant /></Suspense>} />
              <Route path="questions" element={<Suspense fallback={<PageSkeleton />}><Questions /></Suspense>} />
              <Route path="admin" element={<Suspense fallback={<PageSkeleton />}><Admin /></Suspense>} />
              <Route path="account" element={<Suspense fallback={<PageSkeleton />}><Login /></Suspense>} />
              <Route path="studio" element={<Suspense fallback={<PageSkeleton />}><Studio /></Suspense>} />
              <Route path="*" element={<Suspense fallback={<PageSkeleton />}><NotFound /></Suspense>} />
            </Route>
          </Routes>
        </Suspense>
      </HashRouter>
      <Toaster />
    </ErrorBoundary>
  );
}
