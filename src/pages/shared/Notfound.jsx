// src/pages/shared/NotFound.jsx

import React from 'react';
import { Link } from 'react-router-dom';

function NotFound() {
    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col justify-center items-center px-6 relative overflow-hidden transition-colors duration-300">
            
            {/* Background Decoration */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                <div className="absolute top-10 left-10 w-32 h-32 bg-blue-200 dark:bg-blue-600/20 rounded-full mix-blend-multiply dark:mix-blend-normal filter blur-xl opacity-30 animate-blob"></div>
                <div className="absolute top-10 right-10 w-32 h-32 bg-purple-200 dark:bg-purple-600/20 rounded-full mix-blend-multiply dark:mix-blend-normal filter blur-xl opacity-30 animate-blob animation-delay-2000"></div>
                <div className="absolute -bottom-8 left-20 w-32 h-32 bg-pink-200 dark:bg-pink-600/20 rounded-full mix-blend-multiply dark:mix-blend-normal filter blur-xl opacity-30 animate-blob animation-delay-4000"></div>
            </div>

            <div className="relative z-10 text-center max-w-lg">
                
                {/* 404 Big Text */}
                <h1 className="text-[150px] font-black text-gray-200 dark:text-gray-800 leading-none select-none transition-colors duration-300">
                    404
                </h1>

                {/* Main Message */}
                <div className="-mt-10">
                    <h2 className="text-3xl font-bold text-gray-800 dark:text-white mb-2 transition-colors duration-300">
                        Page Not Found, Mere Dost! 🧐
                    </h2>
                    <p className="text-gray-500 dark:text-gray-400 text-lg mb-8 transition-colors duration-300">
                        Lagta hai tum galat raaste pe aa gaye ho.<br/>
                        Wapas chalo, yahan kuch nahi hai.
                    </p>

                    {/* Action Button */}
                    <Link to="/login" className="inline-block group">
                        <button className="relative px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-full shadow-lg transition-transform transform group-hover:-translate-y-1 group-active:translate-y-0 overflow-hidden">
                            <span className="relative z-10 flex items-center gap-2">
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                                </svg>
                                Go to Login / Home
                            </span>
                            <div className="absolute inset-0 h-full w-full bg-blue-700 scale-0 group-hover:scale-100 transition-transform duration-300 rounded-full origin-center"></div>
                        </button>
                    </Link>
                </div>
            </div>

            {/* Footer Text */}
            <div className="absolute bottom-6 text-gray-400 dark:text-gray-600 text-xs transition-colors duration-300">
                Error Code: 404_LOST_IN_SPACE
            </div>
        </div>
    );
}

export default NotFound;