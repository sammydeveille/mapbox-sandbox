'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTRPC } from '@/lib/trpc';

const RENDER_TYPES = ['point', 'heatmap', 'choropleth', 'route', 'cluster'] as const;

interface DataLayerPanelProps {
  collectionId: string;
  profileId: string;
  selectedLayerId?: string | null;
  onLayerSelect: (layerId: string) => void;
}

export function DataLayerPanel({ collectionId, profileId, selectedLayerId, onLayerSelect }: DataLayerPanelProps) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [showAddForm, setShowAddForm] = useState(false);
  const [newLayerName, setNewLayerName] = useState('');
  const [newLayerRenderType, setNewLayerRenderType] = useState<(typeof RENDER_TYPES)[number]>('point');

  const { data: layers, isLoading } = useQuery(
    trpc.dataLayer.list.queryOptions({ collectionId, ownerId: profileId })
  );

  const createMutation = useMutation(
    trpc.dataLayer.create.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: trpc.dataLayer.list.queryKey() });
        setNewLayerName('');
        setNewLayerRenderType('point');
        setShowAddForm(false);
      },
    })
  );

  const deleteMutation = useMutation(
    trpc.dataLayer.delete.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: trpc.dataLayer.list.queryKey() });
      },
    })
  );

  const handleAddLayer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLayerName.trim()) return;
    try {
      await createMutation.mutateAsync({
        collectionId,
        ownerId: profileId,
        name: newLayerName,
        renderType: newLayerRenderType,
      });
    } catch (error) {
      console.error('Failed to create layer:', error);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await deleteMutation.mutateAsync({ id, ownerId: profileId });
    } catch (error) {
      console.error('Failed to delete layer:', error);
    }
  };

  if (isLoading) return <div className="text-gray-500">Loading layers...</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold">Data Layers</h3>
        {!showAddForm && (
          <button
            type="button"
            onClick={() => setShowAddForm(true)}
            className="text-xs text-blue-500 hover:text-blue-600 font-medium"
          >
            + Add
          </button>
        )}
      </div>

      <div className="space-y-1.5 mb-4">
        {layers?.length === 0 && (
          <p className="text-text-secondary text-xs">No layers yet.</p>
        )}
        {layers?.map((layer) => (
          <div
            key={layer.id}
            onClick={() => onLayerSelect(layer.id)}
            className={`px-3 py-2 rounded-lg cursor-pointer transition flex justify-between items-center ${
              selectedLayerId === layer.id
                ? 'bg-blue-50 dark:bg-blue-900/30 ring-2 ring-blue-500'
                : 'bg-bg-secondary hover:ring-2 hover:ring-blue-400'
            }`}
          >
            <div>
              <span className="text-sm font-medium">{layer.name}</span>
              <span className="ml-2 text-[10px] text-text-secondary bg-gray-200 dark:bg-gray-700 px-1.5 py-0.5 rounded">
                {layer.renderType}
              </span>
            </div>
            <button
              onClick={(e) => handleDelete(layer.id, e)}
              disabled={deleteMutation.isPending}
              className="text-red-500 text-xs hover:underline disabled:opacity-50"
            >
              Delete
            </button>
          </div>
        ))}
      </div>

      <form onSubmit={handleAddLayer} className="border-t pt-4 space-y-3">
        {showAddForm && (
          <>
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium">New Layer</h4>
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="text-xs text-gray-400 hover:text-gray-600"
              >
                Cancel
              </button>
            </div>
            <div>
              <label htmlFor="layer-name" className="block text-sm mb-1">
                Name
              </label>
              <input
                id="layer-name"
                type="text"
                value={newLayerName}
                onChange={(e) => setNewLayerName(e.target.value)}
                className="w-full border rounded px-3 py-2 bg-bg-secondary border-gray-300 dark:border-gray-600"
                required
                maxLength={255}
              />
            </div>
            <div>
              <label htmlFor="layer-render-type" className="block text-sm mb-1">
                Render Type
              </label>
              <select
                id="layer-render-type"
                value={newLayerRenderType}
                onChange={(e) => setNewLayerRenderType(e.target.value as (typeof RENDER_TYPES)[number])}
                className="w-full border rounded px-3 py-2 bg-bg-secondary border-gray-300 dark:border-gray-600"
              >
                {RENDER_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="submit"
              disabled={createMutation.isPending || !newLayerName.trim()}
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed w-full"
            >
              {createMutation.isPending ? 'Adding...' : 'Add Layer'}
            </button>
          </>
        )}
      </form>
    </div>
  );
}
