import { Link } from 'react-router-dom';

interface MenuProps {
  darkMode: boolean;
  onToggleDarkMode: () => void;
}

function Menu({ darkMode, onToggleDarkMode }: MenuProps) {
  return (
    <nav className="bg-bg-secondary text-text-primary p-4 flex justify-between items-center">
      <div className="flex gap-4">
        <Link to="/" className="hover:underline">Home</Link>
        <Link to="/feedback" className="hover:underline">Feedback</Link>
      </div>
      <button
        onClick={onToggleDarkMode}
        className="px-3 py-1 rounded bg-gray-300 dark:bg-gray-700 hover:bg-gray-400 dark:hover:bg-gray-600"
      >
        {darkMode ? '🌙' : '☀️'}
      </button>
    </nav>
  );
}

export default Menu;
