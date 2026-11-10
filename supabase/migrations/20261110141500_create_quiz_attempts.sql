-- ==============================================================================
-- Migration: 20261110141500_create_quiz_attempts.sql
-- Descrição: Cria tabela para histórico de tentativas e respostas de quizzes,
--            armazenando tanto respostas certas quanto erradas para o Diagnóstico
--            de Gaps do Líder e Dossiê 1:1.
-- ==============================================================================

-- 1. Extensões necessárias
create extension if not exists pgcrypto;

-- 2. Tabela de tentativas de quiz
create table if not exists public.quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  module_id text not null,
  score smallint not null check (score >= 0),
  total smallint not null check (total > 0),
  passed boolean not null default false,
  -- Estrutura JSONB de cada resposta:
  -- [
  --   {
  --     "question_id": "fiscal--nfc-e--q1",
  --     "prompt": "Em caso de instabilidade na SEFAZ...",
  --     "selected_index": 1,
  --     "selected_option": "Aguardar retorno...",
  --     "correct_index": 0,
  --     "correct_option": "Emitir em contingência...",
  --     "is_correct": false
  --   }
  -- ]
  answers jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Comentários da tabela e colunas
comment on table public.quiz_attempts is 'Registra cada tentativa de realização de quiz pelos analistas de suporte.';
comment on column public.quiz_attempts.module_id is 'ID do módulo correspondente no catálogo (ex: pdv-mesa-e-balcao--configuracoes-gerais-do-pdv-cardapio).';
comment on column public.quiz_attempts.answers is 'Lista detalhada das questões respondidas, registrando gabarito, alternativa escolhida e se acertou/errou.';

-- 3. Índices otimizados (Supabase Postgres Best Practices)
create index if not exists idx_quiz_attempts_user_id on public.quiz_attempts (user_id);
create index if not exists idx_quiz_attempts_module_id on public.quiz_attempts (module_id);
create index if not exists idx_quiz_attempts_user_module on public.quiz_attempts (user_id, module_id);
create index if not exists idx_quiz_attempts_created_at on public.quiz_attempts (created_at desc);
create index if not exists idx_quiz_attempts_answers_gin on public.quiz_attempts using gin (answers);

-- 4. Habilita RLS (Row-Level Security)
alter table public.quiz_attempts enable row level security;

-- 5. Políticas de Acesso
-- A) Analista pode visualizar apenas as suas próprias tentativas
drop policy if exists "quiz_attempts_select_own" on public.quiz_attempts;
create policy "quiz_attempts_select_own" on public.quiz_attempts
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

-- B) Líder pode visualizar todas as tentativas (para o Diagnóstico e Dossiê)
drop policy if exists "quiz_attempts_select_leader" on public.quiz_attempts;
create policy "quiz_attempts_select_leader" on public.quiz_attempts
  for select
  to authenticated
  using (
    (select coalesce((auth.jwt() -> 'app_metadata' ->> 'role'), '')) = 'lider'
    or exists (
      select 1 from public.users u
      where u.id = (select auth.uid()) and u.role in ('lider', 'leader', 'admin')
    )
  );

-- C) Analista pode registrar sua própria tentativa
drop policy if exists "quiz_attempts_insert_own" on public.quiz_attempts;
create policy "quiz_attempts_insert_own" on public.quiz_attempts
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

-- 6. Permissões de Acesso (Grants)
grant select, insert on public.quiz_attempts to authenticated;
grant select, insert on public.quiz_attempts to service_role;

-- 7. View de Agregação para o Diagnóstico de Gaps do Líder
-- (Utiliza security_invoker = true conforme recomendação Postgres 15+ do Supabase)
create or replace view public.view_quiz_question_stats with (security_invoker = true) as
select
  qa.module_id,
  a.elem->>'question_id' as question_id,
  a.elem->>'prompt' as prompt,
  count(*) as total_answers,
  count(*) filter (where (a.elem->>'is_correct')::boolean = true) as correct_answers,
  count(*) filter (where (a.elem->>'is_correct')::boolean = false) as wrong_answers,
  round(
    (count(*) filter (where (a.elem->>'is_correct')::boolean = false)::numeric / nullif(count(*), 0)) * 100,
    1
  ) as error_percentage
from public.quiz_attempts qa,
lateral jsonb_array_elements(qa.answers) as a(elem)
group by qa.module_id, a.elem->>'question_id', a.elem->>'prompt';

grant select on public.view_quiz_question_stats to authenticated;
grant select on public.view_quiz_question_stats to service_role;
