// src/pages/shared/MaintenancePage.jsx

import React from 'react';
import { motion } from 'framer-motion';
import { Settings, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const MaintenancePage = () => {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 relative overflow-hidden p-6 transition-colors duration-300">
            
            {/* Animated Background Elements */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
                <div className="absolute top-10 left-10 w-72 h-72 bg-purple-400 dark:bg-purple-600 rounded-full mix-blend-multiply filter blur-3xl opacity-30 dark:opacity-20 animate-blob"></div>
                <div className="absolute bottom-10 right-10 w-72 h-72 bg-blue-400 dark:bg-blue-600 rounded-full mix-blend-multiply filter blur-3xl opacity-30 dark:opacity-20 animate-blob animation-delay-2000"></div>
            </div>

            <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="relative z-10 bg-white/80 dark:bg-gray-800/50 backdrop-blur-xl border border-gray-200 dark:border-gray-700 p-10 rounded-3xl shadow-2xl max-w-lg text-center transition-colors duration-300"
            >
                <motion.div 
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 10, ease: "linear" }}
                    className="w-20 h-20 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-2xl mx-auto flex items-center justify-center shadow-lg mb-6"
                >
                    <Settings className="text-white w-10 h-10" />
                </motion.div>

                <h1 className="text-4xl font-extrabold text-gray-900 dark:text-white mb-4 tracking-tight">
                    Under Maintenance
                </h1>
                
                <p className="text-gray-600 dark:text-gray-300 text-lg mb-8 leading-relaxed">
                    We are currently upgrading the system to make it even better. Access is restricted for employees at the moment.
                </p>

                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 mb-8 border border-gray-200 dark:border-gray-600 transition-colors">
                    <p className="text-sm text-gray-500 dark:text-gray-400 font-mono">
                        Status: <span className="text-orange-500 dark:text-yellow-400 font-bold">DEVELOPMENT MODE ON</span>
                    </p>
                </div>

                <button 
                    onClick={() => navigate('/login')}
                    className="flex items-center justify-center gap-2 w-full py-3.5 bg-gray-900 dark:bg-white hover:bg-black dark:hover:bg-gray-200 text-white dark:text-gray-900 font-bold rounded-xl transition-all active:scale-95 shadow-lg"
                >
                    <ArrowLeft size={18} /> Back to Login
                </button>

            </motion.div>
        </div>
    );
};

export default MaintenancePage;