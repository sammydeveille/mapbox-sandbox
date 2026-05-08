'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTRPC } from '@/lib/trpc';

interface FeedbackFormProps {
  id?: string;
}

export function FeedbackForm({ id }: FeedbackFormProps) {
  const router = useRouter();
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  const { data: feedbackList } = useQuery(trpc.feedback.list.queryOptions());
  const createMutation = useMutation(
    trpc.feedback.create.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: trpc.feedback.list.queryKey() });
      },
    })
  );
  const updateMutation = useMutation(
    trpc.feedback.update.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: trpc.feedback.list.queryKey() });
      },
    })
  );

  useEffect(() => {
    if (id && feedbackList) {
      const item = feedbackList.find((f) => f.id === Number(id));
      if (item) {
        setTitle(item.title);
        setDescription(item.description);
      }
    }
  }, [id, feedbackList]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await (id
        ? updateMutation.mutateAsync({ id: Number(id), title, description })
        : createMutation.mutateAsync({ title, description }));
      router.push('/feedback');
    } catch (error) {
      console.error('Failed to save feedback:', error);
    }
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">{id ? 'Edit' : 'New'} Feedback</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="title" className="block text-sm font-medium mb-2">Title</label>
          <input
            id="title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full border rounded px-3 py-2 bg-bg-secondary border-gray-300 dark:border-gray-600"
            required
          />
        </div>
        <div>
          <label htmlFor="description" className="block text-sm font-medium mb-2">Description</label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full border rounded px-3 py-2 h-32 bg-bg-secondary border-gray-300 dark:border-gray-600"
            required
          />
        </div>
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={isLoading || !title.trim() || !description.trim()}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Saving...' : 'Save'}
          </button>
          <button
            type="button"
            onClick={() => router.push('/feedback')}
            disabled={isLoading}
            className="bg-gray-300 px-4 py-2 rounded hover:bg-gray-400 disabled:opacity-50"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
