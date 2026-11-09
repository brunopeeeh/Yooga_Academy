import { useState } from 'react';
import { Button } from '@/components/Button/Button';
import { formatNoteDate, NOTE_MAX_LENGTH } from '@/domain/annotations';
import { useAnnotationsStore } from '@/stores/annotations';
import { toast } from '@/stores/toast';
import styles from './LessonPage.module.css';

interface LessonNoteProps {
  readonly lessonId: string;
  readonly lessonTitle: string;
}

/**
 * Caderno do analista: uma nota livre por aula.
 *
 * O rascunho fica no estado local da tela e só vai para o store (e para o
 * `localStorage`) quando o analista clica em "Salvar nota" — assim digitar não
 * escreve no disco a cada tecla.
 */
export function LessonNote({ lessonId, lessonTitle }: LessonNoteProps) {
  const note = useAnnotationsStore((state) => state.notes[lessonId]);
  const setNote = useAnnotationsStore((state) => state.setNote);
  const removeNote = useAnnotationsStore((state) => state.removeNote);

  const savedText = note?.text ?? '';
  const [prev, setPrev] = useState({ lessonId, savedText });
  const [draft, setDraft] = useState(savedText);

  // Ao trocar de aula (ou salvar), o rascunho acompanha a nota guardada.
  if (prev.lessonId !== lessonId || prev.savedText !== savedText) {
    setPrev({ lessonId, savedText });
    setDraft(savedText);
  }

  const dirty = draft.trim() !== savedText;

  const handleSave = () => {
    if (!dirty) return;

    setNote(lessonId, draft);
    toast('Nota salva neste navegador.', 'success');
  };

  const handleRemove = () => {
    removeNote(lessonId);
    setDraft('');
    toast('Nota apagada.', 'default');
  };

  return (
    <section className={styles.noteSection} aria-labelledby="note-title">
      <div className={styles.noteHead}>
        <h2 id="note-title">Sua nota</h2>
        {note ? (
          <span className={styles.noteSaved}>Salva em {formatNoteDate(note.updatedAt)}</span>
        ) : null}
      </div>

      <p className={styles.noteHint}>
        Anote o que você precisa lembrar desta aula. A nota fica só neste navegador.
      </p>

      <label className="sr" htmlFor={`note-${lessonId}`}>
        Sua nota sobre {lessonTitle}
      </label>
      <textarea
        id={`note-${lessonId}`}
        className={styles.noteInput}
        value={draft}
        maxLength={NOTE_MAX_LENGTH}
        rows={4}
        placeholder="Ex.: cliente pediu PIX, mas a maquininha estava sem bateria — explicar antes de abrir o caixa."
        onChange={(event) => setDraft(event.target.value)}
      />

      <div className={styles.noteActions}>
        <span className={styles.noteCount}>
          {draft.length}/{NOTE_MAX_LENGTH}
        </span>
        <Button type="button" variant="light" onClick={handleSave} disabled={!dirty}>
          Salvar nota
        </Button>
        {note ? (
          <Button type="button" variant="ghost" onClick={handleRemove}>
            Apagar nota
          </Button>
        ) : null}
      </div>
    </section>
  );
}
