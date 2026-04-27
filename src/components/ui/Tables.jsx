// src/components/ui/Table.jsx

import React from 'react';

// NOTE: Logic same hai, bas Tailwind CSS se sundar banaya hai aur Dark Mode add kiya hai.
// Data aur Columns props wahi rahenge.

function Tables({ data, columns, caption = "" }) {
    
    // --- 1. EMPTY STATE (No Data) ---
    if (!data || data.length === 0) {
        return (
            <div className="w-full p-8 text-center bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 transition-colors duration-300">
                <div className="inline-flex items-center justify-center w-12 h-12 mb-4 rounded-full bg-gray-50 dark:bg-gray-700/50">
                    <svg className="w-6 h-6 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">No records found</h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">There is no data to display at the moment.</p>
            </div>
        );
    }

    return (
        <div className="w-full bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden transition-colors duration-300">
            {/* --- 2. RESPONSIVE WRAPPER ---
               Mobile pe horizontal scroll automatic aa jayega 'overflow-x-auto' se.
            */}
            <div className="overflow-x-auto custom-scrollbar">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    
                    {/* Caption / Title */}
                    {caption && (
                        <caption className="px-6 py-4 text-left text-lg font-bold text-gray-800 dark:text-gray-100 bg-gray-50/50 dark:bg-gray-700/30 border-b border-gray-100 dark:border-gray-700">
                            {caption}
                        </caption>
                    )}

                    {/* Table Head */}
                    <thead className="bg-gray-50 dark:bg-gray-700/50">
                        <tr>
                            {columns.map((col, index) => (
                                <th 
                                    key={index} 
                                    scope="col"
                                    className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap"
                                >
                                    {col.header}
                                </th>
                            ))}
                        </tr>
                    </thead>

                    {/* Table Body */}
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                        {data.map((row, rowIndex) => (
                            <tr 
                                key={rowIndex} 
                                className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors duration-150 ease-in-out"
                            >
                                {columns.map((col, colIndex) => (
                                    <td 
                                        key={colIndex} 
                                        className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300"
                                    >
                                        {/* Logic same as before: Render function or direct Accessor */}
                                        {col.render ? col.render(row) : row[col.accessor]}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

export default Tables;