'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTRPC } from '@/lib/trpc';

interface CollectionFormProps {
  profileId: string;
  collection?: { id: string; name: string; description: string | null };
  onSuccess: () => void;
  onCancel: () => void;
}

export function CollectionForm({ profileId, collection, onSuccess, onCancel }: CollectionFormProps) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [name, setName] = useState(collection?.name ?? '');
  const [description, setDescription] = useState(collection?.description ?? '');

  const createMutation = useMutation(
    trpc.collection.create.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: trpc.collection.list.queryKey() });
      },
    })
  );

  const updateMutation = useMutation(
    trpc.collection.update.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: trpc.collection.list.queryKey() });
      },
    })
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (collection) {
        await updateMutation.mutateAsync({
          id: collection.id,
          ownerId: profileId,
          name,
          description: description || undefined,
        });
      } else {
        await createMutation.mutateAsync({
          ownerId: profileId,
          name,
          description: description || undefined,
        });
      }
      onSuccess();
    } catch (error) {
      console.error('Failed to save collection:', error);
    }
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;
  const isEdit = !!collection;

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">{isEdit ? 'Edit' : 'New'} Collection</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="collection-name" className="block text-sm font-medium mb-1">
            Name
          </label>
          <input
            id="collection-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full border rounded px-3 py-2 bg-bg-secondary border-gray-300 dark:border-gray-600"
            required
            maxLength={255}
          />
        </div>
        <div>
          <label htmlFor="collection-description" className="block text-sm font-medium mb-1">
            Description
          </label>
          <textarea
            id="collection-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full border rounded px-3 py-2 h-24 bg-bg-secondary border-gray-300 dark:border-gray-600"
          />
        </div>
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={isLoading || !name.trim()}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Saving...' : isEdit ? 'Update' : 'Create'}
          </button>
          <button
            type="button"
            onClick={onCancel}
            disabled={isLoading}
            className="bg-gray-300 text-gray-800 px-4 py-2 rounded hover:bg-gray-400 disabled:opacity-50"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
