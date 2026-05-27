'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTRPC } from '@/lib/trpc';
import { useMapShell } from '../MapShell';
import { ItemTypeBadge } from './ItemTypeBadge';
import { groupEvidenceByRelevance } from '../../utils/evidenceGrouping';
import { formatTemporalBinding, type TemporalPrecision } from '../../utils/formatTemporal';
import { computeCentroid, getGeometryTypeLabel, type SupportedGeometry } from '../../utils/geometryHelpers';

interface KnowledgeDetailViewProps {
  itemId: string;
  onBack: () => void;
  slideContext?: { slideId: string; nextPosition: number };
}

export function KnowledgeDetailView({ itemId, onBack, slideContext }: KnowledgeDetailViewProps) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { flyTo } = useMapShell();

  const { data, isLoading, error, refetch } = useQuery(
    trpc.knowledgeItem.get.queryOptions({ id: itemId })
  );

  const addSlideItemMutation = useMutation(
    trpc.presentation.addSlideItem.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: trpc.presentation.get.queryKey() });
      },
    })
  );

  const handleAddToSlide = () => {
    if (!slideContext) return;
    addSlideItemMutation.mutateAsync({
      slideId: slideContext.slideId,
      knowledgeItemId: itemId,
      position: slideContext.nextPosition,
    });
  };

  const handleFlyTo = (geometry: SupportedGeometry) => {
    const [lng, lat] = computeCentroid(geometry);
    flyTo(lng, lat, 12);
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="p-3 space-y-3 animate-pulse">
        <div className="h-4 bg-white/10 rounded w-16" />
        <div className="h-6 bg-white/10 rounded w-3/4" />
        <div className="h-4 bg-white/10 rounded w-full" />
        <div className="h-4 bg-white/10 rounded w-5/6" />
        <div className="h-20 bg-white/10 rounded w-full" />
        <div className="h-16 bg-white/10 rounded w-full" />
      </div>
    );
  }

  // Error / not-found state
  if (error) {
    return (
      <div className="p-3">
        <button
          onClick={onBack}
          className="text-xs text-text-secondary hover:text-text-primary transition-colors mb-3"
        >
          ← Back
        </button>
        <div className="text-center py-6">
          <p className="text-sm text-red-400 mb-2">
            {error.message || 'Could not load this item.'}
          </p>
          <button
            onClick={() => refetch()}
            className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!data) return null;

  // Group evidence by relevance
  const evidenceLinks = (data.evidence ?? []).map((e) => ({
    id: e.id,
    relevance: e.relevance as 'primary' | 'supporting' | 'contextual',
    sourceExternalId: e.sourceDocument?.externalId ?? e.sourceDocumentId,
    excerpt: e.excerpt ?? undefined,
  }));
  const groupedEvidence = groupEvidenceByRelevance(evidenceLinks);

  const relevanceGroups = [
    { key: 'primary', label: 'Primary', items: groupedEvidence.primary },
    { key: 'supporting', label: 'Supporting', items: groupedEvidence.supporting },
    { key: 'contextual', label: 'Contextual', items: groupedEvidence.contextual },
  ] as const;

  return (
    <div className="p-3 space-y-4 overflow-y-auto">
      {/* Back button */}
      <button
        onClick={onBack}
        className="text-xs text-text-secondary hover:text-text-primary transition-colors"
      >
        ← Back
      </button>

      {/* Header: title + type badge */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <ItemTypeBadge itemType={data.itemType} />
        </div>
        <h2 className="text-base font-semibold text-text-primary">{data.title}</h2>
        <p className="text-xs text-text-secondary mt-1">{data.summary}</p>
      </div>

      {/* Content body */}
      {data.content && (
        <div className="text-sm text-text-primary leading-relaxed whitespace-pre-wrap">
          {data.content}
        </div>
      )}

      {/* Add to Slide button */}
      {slideContext && (
        <button
          onClick={handleAddToSlide}
          disabled={addSlideItemMutation.isPending}
          className="w-full text-xs font-medium px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {addSlideItemMutation.isPending ? 'Adding...' : 'Add to Slide'}
        </button>
      )}
      {addSlideItemMutation.error && (
        <p className="text-xs text-red-400">
          {addSlideItemMutation.error.message}
        </p>
      )}

      {/* Evidence section */}
      <section>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-text-secondary mb-2">
          Evidence
        </h3>
        {evidenceLinks.length === 0 ? (
          <p className="text-xs text-text-secondary italic">
            No evidence has been linked.
          </p>
        ) : (
          <div className="space-y-3">
            {relevanceGroups.map(
              (group) =>
                group.items.length > 0 && (
                  <div key={group.key}>
                    <h4 className="text-[11px] font-medium text-text-secondary mb-1 capitalize">
                      {group.label}
                    </h4>
                    <div className="space-y-1.5">
                      {group.items.map((ev) => (
                        <div
                          key={ev.id}
                          className="rounded bg-white/5 px-2 py-1.5 text-xs"
                        >
                          <p className="text-text-primary font-medium truncate">
                            {ev.sourceExternalId}
                          </p>
                          {ev.excerpt && (
                            <p className="text-text-secondary mt-0.5 line-clamp-3">
                              {ev.excerpt}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )
            )}
          </div>
        )}
      </section>

      {/* Temporal bindings */}
      {data.times && data.times.length > 0 && (
        <section>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-text-secondary mb-2">
            Temporal Bindings
          </h3>
          <div className="space-y-1">
            {data.times.map((time) => {
              const precision = (time.precision as TemporalPrecision) || 'day';
              const startFormatted = formatTemporalBinding(
                String(time.startTime),
                precision
              );
              const endFormatted = time.endTime
                ? formatTemporalBinding(String(time.endTime), precision)
                : null;

              return (
                <div
                  key={time.id}
                  className="flex items-center gap-2 text-xs text-text-primary"
                >
                  <span className="opacity-60">🕐</span>
                  <span>
                    {startFormatted}
                    {endFormatted && ` – ${endFormatted}`}
                  </span>
                  <span className="text-text-secondary text-[10px]">
                    ({precision})
                  </span>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Spatial bindings */}
      {data.places && data.places.length > 0 && (
        <section>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-text-secondary mb-2">
            Spatial Bindings
          </h3>
          <div className="space-y-1.5">
            {data.places.map((place) => {
              const geom = place.geometry as SupportedGeometry | null;
              const label =
                place.place_name && String(place.place_name).trim()
                  ? String(place.place_name)
                  : geom
                    ? getGeometryTypeLabel(geom)
                    : 'Unknown';

              return (
                <div
                  key={place.id as string}
                  className="flex items-center justify-between gap-2 text-xs"
                >
                  <div className="flex items-center gap-2 text-text-primary min-w-0">
                    <span className="opacity-60">
                      {geom?.type === 'Point'
                        ? '📍'
                        : geom?.type === 'Polygon'
                          ? '🔷'
                          : '🗺️'}
                    </span>
                    <span className="truncate">{label}</span>
                  </div>
                  {geom && (
                    <button
                      onClick={() => handleFlyTo(geom)}
                      className="shrink-0 text-[10px] text-blue-400 hover:text-blue-300 transition-colors px-1.5 py-0.5 rounded hover:bg-white/5"
                    >
                      Fly to
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
