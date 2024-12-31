export const Button = ({ children, className = "", ...props }) => (
  <button
    className={`inline-flex items-center justify-center rounded-md text-sm font-medium 
    bg-blue-600 text-white 
    hover:bg-blue-700 
    disabled:opacity-50 
    disabled:cursor-not-allowed 
    disabled:bg-gray-400
    h-10 px-4 py-2 
    ${className}`}
    {...props}
  >
    {children}
  </button>
);