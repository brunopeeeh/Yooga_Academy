import { useLiveRegionStore } from '@/stores/liveRegion';

export function LiveRegion() {
  const message = useLiveRegionStore((state) => state.message);

  return (
    <div className="sr" aria-live="polite" aria-atomic="true" data-testid="live-region">
      {message}
    </div>
  );
}
