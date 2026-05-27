'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTRPC } from '@/lib/trpc';

interface PresentationFormProps {
  ownerId: string;
  collectionId?: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export function PresentationForm({ ownerId, collectionId, onSuccess, onCancel }: PresentationFormProps) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  const createMutation = useMutation(
    trpc.presentation.create.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: trpc.presentation.list.queryKey() });
        onSuccess();
      },
    })
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate({
      ownerId,
      collectionId,
      title: title.trim(),
      description: description.trim() || undefined,
    });
  };

  const titleError =
    createMutation.error?.message && createMutation.error.message.toLowerCase().includes('title')
      ? createMutation.error.message
      : null;

  const descriptionError =
    createMutation.error?.message && createMutation.error.message.toLowerCase().includes('description')
      ? createMutation.error.message
      : null;

  const generalError =
    createMutation.error && !titleError && !descriptionError
      ? createMutation.error.message
      : null;

  return (
    <div>
      <h2 className="text-lg font-semibold text-text-primary mb-4">New Presentation</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="presentation-title" className="block text-sm font-medium text-text-secondary mb-1">
            Title <span className="text-red-400">*</span>
          </label>
          <input
            id="presentation-title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full text-sm bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:border-blue-500"
            placeholder="Enter presentation title"
            required
            minLength={1}
            maxLength={200}
          />
          <div className="flex justify-between mt-1">
            {titleError ? (
              <p className="text-xs text-red-400">{titleError}</p>
            ) : (
              <span />
            )}
            <span className="text-xs text-text-secondary">{title.length}/200</span>
          </div>
        </div>

        <div>
          <label htmlFor="presentation-description" className="block text-sm font-medium text-text-secondary mb-1">
            Description
          </label>
          <textarea
            id="presentation-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full text-sm bg-white/5 border border-white/10 rounded-lg px-3 py-2 h-24 text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:border-blue-500 resize-none"
            placeholder="Optional description"
            maxLength={2000}
          />
          <div className="flex justify-between mt-1">
            {descriptionError ? (
              <p className="text-xs text-red-400">{descriptionError}</p>
            ) : (
              <span />
            )}
            <span className="text-xs text-text-secondary">{description.length}/2000</span>
          </div>
        </div>

        {generalError && (
          <p className="text-xs text-red-400">{generalError}</p>
        )}

        <div className="flex gap-2">
          <button
            type="submit"
            disabled={createMutation.isPending || !title.trim()}
            className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {createMutation.isPending && (
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            )}
            {createMutation.isPending ? 'Creating...' : 'Create'}
          </button>
          <button
            type="button"
            onClick={onCancel}
            disabled={createMutation.isPending}
            className="text-sm font-medium px-4 py-2 rounded-lg border border-white/10 text-text-secondary hover:text-text-primary hover:border-white/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
