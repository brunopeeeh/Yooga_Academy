import { createBrowserRouter, type RouteObject } from 'react-router-dom';
import { AppLayout } from './AppLayout';
import { RequireLeader } from './RequireLeader';
import { AchievementsPage } from '@/features/achievements/AchievementsPage';
import { LoginPage } from '@/features/auth/LoginPage';
import { GroupPage } from '@/features/group/GroupPage';
import { HomePage } from '@/features/home/HomePage';
import { LibraryPage } from '@/features/library/LibraryPage';
import { NotFoundPage } from '@/features/placeholder/PlaceholderPage';
import { TeamPage } from '@/features/team/TeamPage';

export const routes: RouteObject[] = [
  {
    path: '/',
    element: <AppLayout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'grupo/:groupId', element: <GroupPage /> },
      { path: 'grupo/:groupId/:moduleId', element: <GroupPage /> },
      {
        // Carregada sob demanda: o texto e as imagens das 170 aulas (≈700 kB)
        // ficam em um chunk separado e não pesam no carregamento inicial.
        path: 'aula/:lessonId',
        HydrateFallback: RouteFallback,
        lazy: async () => {
          const { LessonPage } = await import('@/features/lesson/LessonPage');
          return { Component: LessonPage };
        },
      },
      {
        // Os quizzes dos 32 módulos (≈165 kB de perguntas geradas) só são
        // baixados quando o aluno entra na tela de quiz.
        path: 'quiz/:moduleId',
        HydrateFallback: RouteFallback,
        lazy: async () => {
          const { QuizPage } = await import('@/features/quiz/QuizPage');
          return { Component: QuizPage };
        },
      },
      {
        path: 'resultado/:moduleId',
        HydrateFallback: RouteFallback,
        lazy: async () => {
          const { ResultPage } = await import('@/features/result/ResultPage');
          return { Component: ResultPage };
        },
      },
      { path: 'biblioteca', element: <LibraryPage /> },
      { path: 'conquistas', element: <AchievementsPage /> },
      {
        // Carregada sob demanda: a fila precisa das perguntas geradas
        // (≈100 kB), que não devem pesar no carregamento inicial.
        path: 'curadoria',
        HydrateFallback: RouteFallback,
        lazy: async () => {
          const { CurationPage } = await import('@/features/curation/CurationPage');
          return { Component: CurationPage };
        },
      },
      { path: 'entrar', element: <LoginPage /> },
      {
        path: 'lider',
        element: (
          <RequireLeader>
            <TeamPage />
          </RequireLeader>
        ),
      },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
];

/** Mostrado enquanto o chunk da rota carrega (deep link para uma aula). */
function RouteFallback() {
  return (
    <div className="wrap" aria-busy="true" style={{ padding: '48px 0' }}>
      <p className="slab">Carregando…</p>
    </div>
  );
}

export const router = createBrowserRouter(routes);
