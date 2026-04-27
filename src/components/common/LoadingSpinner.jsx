// src/components/common/LoadingSpinner.jsx

import React from 'react';
import { motion } from 'framer-motion';

function LoadingSpinner({ message = "Just a moment...", fullScreen = false }) {
    
    // 💡 Container Style Logic
    // Added dark:bg-gray-900/60 for dark mode overlay
    const containerClasses = fullScreen 
        ? "fixed inset-0 z-50 flex flex-col items-center justify-center bg-white/60 dark:bg-gray-900/60 backdrop-blur-md transition-all duration-300"
        : "flex flex-col items-center justify-center py-12 w-full h-full min-h-[200px]";

    return (
        <div className={containerClasses}>
            
            {/* 🌀 Animation Container */}
            <div className="relative flex items-center justify-center w-20 h-20">
                
                {/* Outer Ring (Gradient & Spinning) */}
                {/* Added dark:border-t-indigo-400 dark:border-r-purple-400 */}
                <motion.span
                    className="absolute w-full h-full border-4 border-transparent border-t-indigo-600 dark:border-t-indigo-400 border-r-purple-600 dark:border-r-purple-400 rounded-full"
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                />

                {/* Inner Ring (Reverse Spin & Slower) */}
                {/* Added dark:border-b-pink-400 dark:border-l-rose-400 */}
                <motion.span
                    className="absolute w-3/4 h-3/4 border-4 border-transparent border-b-pink-500 dark:border-b-pink-400 border-l-rose-500 dark:border-l-rose-400 rounded-full opacity-70"
                    animate={{ rotate: -360 }}
                    transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
                />

                {/* Center Pulse Dot */}
                {/* Added dark:bg-indigo-400 */}
                <motion.div
                    className="w-3 h-3 bg-indigo-600 dark:bg-indigo-400 rounded-full shadow-lg shadow-indigo-500/50 dark:shadow-indigo-400/50"
                    animate={{ scale: [1, 1.5, 1], opacity: [0.5, 1, 0.5] }}
                    transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
                />
            </div>

            {/* 📝 Modern Text with Typing/Fade Effect */}
            {message && (
                <motion.p 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    // Added dark:from-indigo-400 dark:to-purple-400 for lighter text in dark mode
                    className="mt-6 text-sm font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-400 tracking-wider uppercase"
                >
                    {message}
                    <motion.span
                        animate={{ opacity: [0, 1, 0] }}
                        transition={{ repeat: Infinity, duration: 1.5 }}
                    >...</motion.span>
                </motion.p>
            )}
        </div>
    );
}

export default LoadingSpinner;