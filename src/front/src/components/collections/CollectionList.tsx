'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTRPC } from '@/lib/trpc';
import { CollectionForm } from './CollectionForm';

interface CollectionListProps {
  profileId: string;
  onSelect: (collectionId: string) => void;
}

export function CollectionList({ profileId, onSelect }: CollectionListProps) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);

  const { data: collections, isLoading } = useQuery(
    trpc.collection.list.queryOptions({ ownerId: profileId })
  );

  const deleteMutation = useMutation(
    trpc.collection.delete.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: trpc.collection.list.queryKey() });
      },
    })
  );

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await deleteMutation.mutateAsync({ id, ownerId: profileId });
    } catch (error) {
      console.error('Failed to delete collection:', error);
    }
  };

  if (showForm) {
    return (
      <CollectionForm
        profileId={profileId}
        onSuccess={() => setShowForm(false)}
        onCancel={() => setShowForm(false)}
      />
    );
  }

  if (isLoading) return <div className="text-gray-500">Loading collections...</div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-6 bg-bg-secondary p-4 rounded-lg">
        <h2 className="text-xl font-semibold">Collections</h2>
        <button
          onClick={() => setShowForm(true)}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          New Collection
        </button>
      </div>
      <div className="space-y-3">
        {collections?.length === 0 && (
          <p className="text-gray-500 text-sm">No collections yet. Create one to get started.</p>
        )}
        {collections?.map((item) => (
          <div
            key={item.id}
            onClick={() => onSelect(item.id)}
            className="bg-bg-secondary p-4 rounded-lg cursor-pointer hover:ring-2 hover:ring-blue-400 transition"
          >
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-medium">{item.name}</h3>
                {item.description && (
                  <p className="text-text-secondary text-sm mt-1">{item.description}</p>
                )}
              </div>
              <button
                onClick={(e) => handleDelete(item.id, e)}
                disabled={deleteMutation.isPending}
                className="text-red-500 text-sm hover:underline disabled:opacity-50"
              >
                {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
