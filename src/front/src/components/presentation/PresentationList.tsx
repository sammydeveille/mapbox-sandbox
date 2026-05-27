'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTRPC } from '@/lib/trpc';
import { truncateDescription } from '../../utils/truncation';

interface PresentationListProps {
  collectionId?: string;
  ownerId: string;
  onSelectPresentation: (id: string) => void;
}

export function PresentationList({ collectionId, ownerId, onSelectPresentation }: PresentationListProps) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Fetch presentations — filter by collection if provided, otherwise by owner
  const { data: presentations, isLoading, error, refetch } = useQuery(
    trpc.presentation.list.queryOptions(
      collectionId ? { collectionId } : { ownerId }
    )
  );

  // Create mutation
  const createMutation = useMutation(
    trpc.presentation.create.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: trpc.presentation.list.queryKey() });
        setShowCreateForm(false);
      },
    })
  );

  // Delete mutation
  const deleteMutation = useMutation(
    trpc.presentation.delete.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: trpc.presentation.list.queryKey() });
        setDeleteConfirmId(null);
      },
    })
  );

  // Loading state
  if (isLoading) {
    return (
      <div className="flex flex-col gap-3 p-3">
        <h2 className="text-sm font-semibold text-text-primary">Presentations</h2>
        <div className="space-y-2">
          <div className="h-16 rounded bg-white/5 animate-pulse" />
          <div className="h-16 rounded bg-white/5 animate-pulse" />
          <div className="h-16 rounded bg-white/5 animate-pulse" />
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex flex-col gap-3 p-3">
        <h2 className="text-sm font-semibold text-text-primary">Presentations</h2>
        <div className="text-center py-4">
          <p className="text-xs text-red-400 mb-2">
            Failed to load presentations: {error.message}
          </p>
          <button
            type="button"
            onClick={() => refetch()}
            className="text-xs px-3 py-1 rounded bg-white/10 text-text-primary hover:bg-white/15 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-3 pt-3">
        <h2 className="text-sm font-semibold text-text-primary">Presentations</h2>
        <button
          type="button"
          onClick={() => setShowCreateForm(true)}
          className="text-xs px-2.5 py-1 rounded-md bg-blue-600 text-white hover:bg-blue-500 transition-colors"
        >
          New Presentation
        </button>
      </div>

      {/* Creation form */}
      {showCreateForm && (
        <CreateForm
          ownerId={ownerId}
          collectionId={collectionId}
          isPending={createMutation.isPending}
          error={createMutation.error?.message ?? null}
          onSubmit={(title, description) => {
            createMutation.mutateAsync({ ownerId, collectionId, title, description });
          }}
          onCancel={() => {
            setShowCreateForm(false);
            createMutation.reset();
          }}
        />
      )}

      {/* Presentation list */}
      <div className="flex-1 overflow-y-auto min-h-0 px-3">
        {/* Empty state */}
        {presentations && presentations.length === 0 && (
          <div className="text-center py-8">
            <p className="text-xs text-text-secondary">
              No presentations yet.
            </p>
            <p className="text-[10px] text-text-secondary mt-1">
              Click "New Presentation" to get started.
            </p>
          </div>
        )}

        {/* List items */}
        {presentations && presentations.length > 0 && (
          <ul className="space-y-2">
            {presentations.map((pres) => (
              <li key={pres.id} className="relative">
                <button
                  type="button"
                  onClick={() => onSelectPresentation(pres.id)}
                  className="w-full text-left rounded-lg bg-white/5 hover:bg-white/10 p-3 transition-colors"
                >
                  <h3 className="text-sm font-medium text-text-primary truncate">
                    {pres.title}
                  </h3>
                  {pres.description && (
                    <p className="text-xs text-text-secondary mt-0.5">
                      {truncateDescription(pres.description, 100)}
                    </p>
                  )}
                  <p className="text-[10px] text-text-secondary mt-1">
                    {formatCreationDate(pres.createdAt)}
                  </p>
                </button>

                {/* Delete button */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setDeleteConfirmId(pres.id);
                  }}
                  className="absolute top-2 right-2 text-text-secondary hover:text-red-400 transition-colors p-1 rounded"
                  aria-label={`Delete presentation "${pres.title}"`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </button>

                {/* Delete confirmation dialog */}
                {deleteConfirmId === pres.id && (
                  <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-black/80 backdrop-blur-sm z-10">
                    <div className="text-center p-3">
                      <p className="text-xs text-text-primary mb-2">Delete this presentation?</p>
                      <div className="flex gap-2 justify-center">
                        <button
                          type="button"
                          onClick={() => setDeleteConfirmId(null)}
                          className="text-xs px-2.5 py-1 rounded bg-white/10 text-text-primary hover:bg-white/15 transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteMutation.mutateAsync({ id: pres.id })}
                          disabled={deleteMutation.isPending}
                          className="text-xs px-2.5 py-1 rounded bg-red-600 text-white hover:bg-red-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
                        </button>
                      </div>
                      {deleteMutation.error && (
                        <p className="text-[10px] text-red-400 mt-1">
                          Deletion failed: {deleteMutation.error.message}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

// ─── Inline Creation Form ─────────────────────────────────────────────────────

interface CreateFormProps {
  ownerId: string;
  collectionId?: string;
  isPending: boolean;
  error: string | null;
  onSubmit: (title: string, description?: string) => void;
  onCancel: () => void;
}

function CreateForm({ isPending, error, onSubmit, onCancel }: CreateFormProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setValidationError('Title is required');
      return;
    }
    if (trimmedTitle.length > 200) {
      setValidationError('Title must be 200 characters or fewer');
      return;
    }
    if (description.length > 2000) {
      setValidationError('Description must be 2000 characters or fewer');
      return;
    }

    onSubmit(trimmedTitle, description.trim() || undefined);
  };

  return (
    <form onSubmit={handleSubmit} className="mx-3 p-3 rounded-lg bg-white/5 border border-white/10 space-y-2">
      <div>
        <label htmlFor="pres-title" className="block text-[10px] text-text-secondary mb-0.5">
          Title <span className="text-red-400">*</span>
        </label>
        <input
          id="pres-title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={200}
          placeholder="Presentation title"
          className="w-full text-xs bg-white/5 border border-white/10 rounded px-2 py-1.5 text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:border-blue-500"
          autoFocus
        />
      </div>

      <div>
        <label htmlFor="pres-description" className="block text-[10px] text-text-secondary mb-0.5">
          Description
        </label>
        <textarea
          id="pres-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={2000}
          rows={2}
          placeholder="Optional description"
          className="w-full text-xs bg-white/5 border border-white/10 rounded px-2 py-1.5 text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:border-blue-500 resize-none"
        />
      </div>

      {/* Validation error */}
      {validationError && (
        <p className="text-[10px] text-red-400">{validationError}</p>
      )}

      {/* Server error */}
      {error && (
        <p className="text-[10px] text-red-400">{error}</p>
      )}

      <div className="flex gap-2 justify-end">
        <button
          type="button"
          onClick={onCancel}
          className="text-xs px-2.5 py-1 rounded bg-white/10 text-text-primary hover:bg-white/15 transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isPending}
          className="text-xs px-2.5 py-1 rounded bg-blue-600 text-white hover:bg-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isPending ? 'Creating...' : 'Create'}
        </button>
      </div>
    </form>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Formats a creation date as a locale-appropriate date string (e.g., "Jan 15, 2025").
 */
function formatCreationDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}
