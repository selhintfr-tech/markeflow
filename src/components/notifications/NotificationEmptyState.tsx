import { Bell } from 'lucide-react';

export const NotificationEmptyState = () => {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4">
      <div className="p-4 bg-gray-100 rounded-full mb-4">
        <Bell size={32} className="text-gray-400" />
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">
        You're all caught up
      </h3>
      <p className="text-sm text-gray-600 text-center">
        There are no notifications to display.
      </p>
    </div>
  );
};
