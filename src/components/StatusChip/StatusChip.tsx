import { Chip, type ChipTone } from '@/components/Chip/Chip';
import type { GroupStatus } from '@/domain/types';

const STATUS_META = {
  done: { label: 'Concluído', tone: 'done' },
  doing: { label: 'Em andamento', tone: 'doing' },
  next: { label: 'Próximo', tone: 'next' },
  todo: { label: 'A fazer', tone: 'todo' },
} as const satisfies Record<GroupStatus, { label: string; tone: ChipTone }>;

interface StatusChipProps {
  status: GroupStatus;
  className?: string;
}

export function StatusChip({ status, className }: StatusChipProps) {
  const meta = STATUS_META[status];

  return (
    <Chip tone={meta.tone} className={className}>
      {meta.label}
    </Chip>
  );
}
