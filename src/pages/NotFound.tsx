import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";
const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    // <div className="min-h-screen flex items-center justify-center bg-gray-100">
    <div className="text-center">
      <div className="min-h-screen flex flex-col items-center justify-center bg-black-100 text-white-600 text-lg font-medium space-y-4">
        <div className="text-5xl">😕</div>
        <p>Oops! Room not found. Please check the room name and try again.</p>
      </div>
    </div>

    // </div>
  );
};

export default NotFound;
