import { useEffect, useRef, type RefObject } from 'react';
import { useLocation } from 'react-router-dom';
import { catalogIndex } from '@/data/catalog';
import { announce } from '@/stores/liveRegion';

interface RouteMeta {
  title: string;
  label: string;
}

function decode(segment: string): string {
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
}

function resolveMeta(pathname: string): RouteMeta {
  if (pathname === '/') return { title: 'Onboarding', label: 'Onboarding' };
  if (pathname === '/biblioteca') return { title: 'Biblioteca', label: 'Biblioteca' };
  if (pathname === '/conquistas') return { title: 'Conquistas', label: 'Conquistas' };
  if (pathname === '/curadoria') return { title: 'Curadoria', label: 'Curadoria' };
  if (pathname === '/lider') return { title: 'Meu time', label: 'Meu time' };
  if (pathname === '/entrar') return { title: 'Entrar', label: 'Entrar' };

  const [section, first, second] = pathname.split('/').filter(Boolean).map(decode);

  if (section === 'grupo' && first) {
    const group = catalogIndex.groupById.get(first);
    if (!group) return { title: 'Grupo não encontrado', label: 'Grupo não encontrado' };

    if (second) {
      const module = catalogIndex.moduleById.get(second);
      return module
        ? { title: module.nome, label: module.nome }
        : { title: 'Módulo não encontrado', label: 'Módulo não encontrado' };
    }

    return { title: group.nome, label: group.nome };
  }

  if (section === 'aula' && first) {
    const lesson = catalogIndex.lessonById.get(first);
    return lesson
      ? { title: lesson.titulo, label: lesson.titulo }
      : { title: 'Aula não encontrada', label: 'Aula não encontrada' };
  }

  if (section === 'quiz' && first) {
    if (first === 'final') {
      return { title: 'Quiz final de revisão', label: 'Quiz final de revisão' };
    }

    const module = catalogIndex.moduleById.get(first);
    return module
      ? { title: `Quiz · ${module.nome}`, label: `Quiz · ${module.nome}` }
      : { title: 'Quiz não encontrado', label: 'Quiz não encontrado' };
  }

  if (section === 'resultado' && first) {
    if (first === 'final') {
      return { title: 'Resultado do quiz final', label: 'Resultado do quiz final' };
    }

    const module = catalogIndex.moduleById.get(first);
    return module
      ? {
          title: `Resultado · ${module.nome}`,
          label: `Resultado · ${module.nome}`,
        }
      : { title: 'Resultado', label: 'Resultado' };
  }

  return { title: 'Página não encontrada', label: 'Página não encontrada' };
}

interface RouteEffectsProps {
  mainRef: RefObject<HTMLElement | null>;
}

/**
 * Efeitos de navegação do shell:
 * - título do documento por rota;
 * - scroll para o topo;
 * - foco no landmark principal (sem roubar foco no carregamento inicial);
 * - anúncio da nova tela na live region.
 */
export function RouteEffects({ mainRef }: RouteEffectsProps) {
  const { pathname } = useLocation();
  const meta = resolveMeta(pathname);
  const isFirstRender = useRef(true);

  useEffect(() => {
    document.title = `${meta.title} · Yooga Academy`;

    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    window.scrollTo(0, 0);
    mainRef.current?.focus({ preventScroll: true });
    announce(meta.label);
  }, [mainRef, meta.label, meta.title, pathname]);

  useEffect(() => {
    const previous = window.history.scrollRestoration;
    window.history.scrollRestoration = 'manual';

    return () => {
      window.history.scrollRestoration = previous;
    };
  }, []);

  return null;
}
