import { useState, useEffect } from 'react';
import { trpc } from '../trpc';
import { useNavigate, useParams } from 'react-router-dom';

function FeedbackForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  const { data: feedbackList } = trpc.feedback.list.useQuery();
  const createMutation = trpc.feedback.create.useMutation();
  const updateMutation = trpc.feedback.update.useMutation();

  useEffect(() => {
    if (id && feedbackList) {
      const item = feedbackList.find(f => f.id === Number(id));
      if (item) {
        setTitle(item.title);
        setDescription(item.description);
      }
    }
  }, [id, feedbackList]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (id) {
      await updateMutation.mutateAsync({ id: Number(id), title, description });
    } else {
      await createMutation.mutateAsync({ title, description });
    }
    navigate('/feedback');
  };

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">{id ? 'Edit' : 'New'} Feedback</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">Title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full border rounded px-3 py-2 bg-bg-secondary border-gray-300 dark:border-gray-600"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full border rounded px-3 py-2 h-32 bg-bg-secondary border-gray-300 dark:border-gray-600"
            required
          />
        </div>
        <div className="flex gap-2">
          <button type="submit" className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600">
            Save
          </button>
          <button type="button" onClick={() => navigate('/feedback')} className="bg-gray-300 px-4 py-2 rounded hover:bg-gray-400">
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

export default FeedbackForm;
