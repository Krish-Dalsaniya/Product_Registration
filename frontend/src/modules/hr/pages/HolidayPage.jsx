import React from 'react';
import HolidaysList from '../components/HolidaysList';

const HolidayPage = () => {
  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-[1600px] mx-auto pb-12 pt-4">
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-black text-[var(--text-main)] tracking-tight leading-none">
          Company Holidays
        </h1>
        <p className="text-[13px] text-[var(--text-muted)] font-medium mt-2">
          Manage the company's official holiday roaster
        </p>
      </div>
      <HolidaysList />
    </div>
  );
};

export default HolidayPage;
