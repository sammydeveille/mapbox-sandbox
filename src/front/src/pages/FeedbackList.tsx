import { trpc } from '../trpc';
import { Link } from 'react-router-dom';

function FeedbackList() {
  const { data: feedbackList, isLoading } = trpc.feedback.list.useQuery();
  const deleteMutation = trpc.feedback.delete.useMutation();
  const utils = trpc.useContext();

  const handleDelete = async (id: number) => {
    await deleteMutation.mutateAsync({ id });
    utils.feedback.list.invalidate();
  };

  if (isLoading) return <div>Loading...</div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-6 bg-bg-secondary p-4 rounded-lg">
        <h1>Feedback</h1>
        <Link to="/feedback/new" className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600">
          New
        </Link>
      </div>
      <div className="space-y-4">
        {feedbackList?.map((item) => (
          <div key={item.id} className="bg-bg-secondary p-4 rounded-lg">
            <h2 className="text-lg font-semibold mb-2">{item.title}</h2>
            <p className="text-text-secondary text-sm mb-3">{item.description}</p>
            <div className="flex gap-2">
              <Link to={`/feedback/${item.id}/edit`} className="text-blue-500 text-sm hover:underline">
                Edit
              </Link>
              <button onClick={() => handleDelete(item.id)} className="text-red-500 text-sm hover:underline">
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default FeedbackList;
