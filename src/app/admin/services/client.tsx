// Search for any loading spinner elements and update them to match the dashboard style
// For example, replace:
// <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-t-2 border-[var(--primary-green)]"></div>
// with the consistent loading style:
{isLoading && (
  <div className="flex items-center justify-center py-20">
    <div className="p-3 rounded-full bg-gray-200 animate-pulse">
      <div className="h-8 w-8"></div>
    </div>
    <div className="ml-4 text-gray-500">Loading services...</div>
  </div>
)}

// And remove any "Est." text or mock data from revenue displays 