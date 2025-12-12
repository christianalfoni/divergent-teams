export default function TopBar() {
  return (
    <nav className="border-b bg-gray-50 border-gray-200">
      <div className="px-4">
        <div className="relative flex h-16 justify-between items-center">
          {/* Left side - Logo placeholder */}
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <div className="w-32 h-8 bg-gray-300 rounded"></div>
            </div>
          </div>

          {/* Right side - User menu placeholder */}
          <div className="flex items-center gap-3">
            <div className="w-24 h-8 bg-gray-300 rounded"></div>
            <div className="h-8 w-px bg-gray-200"></div>
            <div className="w-8 h-8 bg-gray-300 rounded-full"></div>
          </div>
        </div>
      </div>
    </nav>
  );
}
