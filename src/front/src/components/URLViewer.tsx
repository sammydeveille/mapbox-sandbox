interface URLViewerProps {
  url: string;
  title: string | null;
  source: string | null;
  onClose: () => void;
}

function URLViewer({ url, title, source, onClose }: URLViewerProps) {
  return (
    <div className="fixed left-1/3 top-16 right-16 bottom-16 bg-bg-primary z-10 rounded-lg shadow-2xl ml-16">
      <div className="h-full flex flex-col p-6">
        <div className="bg-bg-secondary p-4 rounded-lg mb-4 flex justify-between items-center">
          <a href={url} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">
            {source && title ? `${source} - ${title}` : title || 'Open in new tab'}
          </a>
          <button
            onClick={onClose}
            className="px-3 py-1 rounded bg-blue-500 text-white hover:bg-blue-600 text-xl"
          >
            ×
          </button>
        </div>
        <iframe
          src={url}
          className="w-full flex-1 border-0 rounded-lg"
          title="URL Viewer"
        />
      </div>
    </div>
  );
}

export default URLViewer;
