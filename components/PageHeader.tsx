
import React from 'react';

interface PageHeaderProps {
  title: string;
  description?: string;
  actionButton?: React.ReactNode;
}

const PageHeader: React.FC<PageHeaderProps> = ({ title, description, actionButton }) => {
  return (
    <div className="mb-6 flex justify-between items-center">
      <div>
        <h2 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">{title}</h2>
        {description && <p className="text-gray-500 dark:text-gray-400 mt-1">{description}</p>}
      </div>
      {actionButton && <div>{actionButton}</div>}
    </div>
  );
};

export default PageHeader;
