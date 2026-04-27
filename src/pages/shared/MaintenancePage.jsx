// src/pages/shared/MaintenancePage.jsx

import React from 'react';
import { motion } from 'framer-motion';
import { Settings, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const MaintenancePage = () => {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-950 relative overflow-hidden p-6 transition-colors duration-300">
            
            {/* Cinematic Mesh Gradient Background */}
            <div className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-orange-600/20 rounded-full blur-[120px] mix-blend-screen animate-pulse"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-rose-600/20 rounded-full blur-[120px] mix-blend-screen animate-pulse delay-700"></div>
                <div className="absolute top-[30%] left-[30%] w-[40%] h-[40%] bg-yellow-600/10 rounded-full blur-[100px] mix-blend-screen animate-pulse delay-1000"></div>
            </div>

            <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: "easeOut" }}
                className="relative z-10 glass rounded-[3rem] p-10 md:p-14 shadow-[0_8px_32px_0_rgba(0,0,0,0.5)] border border-white/10 max-w-lg text-center"
            >
                <motion.div 
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 15, ease: "linear" }}
                    className="w-24 h-24 bg-gradient-to-br from-orange-400 to-rose-600 rounded-3xl mx-auto flex items-center justify-center shadow-[0_0_30px_rgba(249,115,22,0.5)] mb-8 border border-white/20"
                >
                    <Settings className="text-white w-12 h-12" />
                </motion.div>

                <h1 className="text-4xl font-black text-white mb-4 tracking-tight">
                    System Upgrade
                </h1>
                
                <p className="text-gray-300 text-base mb-8 leading-relaxed font-medium">
                    We are currently upgrading the HRMS infrastructure to deliver a better experience. Access is temporarily restricted.
                </p>

                <div className="bg-black/20 rounded-2xl p-4 mb-10 border border-white/5 backdrop-blur-md">
                    <p className="text-xs text-gray-400 font-bold uppercase tracking-widest flex items-center justify-center gap-2">
                        Status: <span className="text-orange-400 flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-orange-400 animate-pulse"></span> DEVELOPMENT MODE</span>
                    </p>
                </div>

                <button 
                    onClick={() => navigate('/login')}
                    className="flex items-center justify-center gap-3 w-full py-4 bg-white/10 hover:bg-white/20 text-white font-bold rounded-2xl transition-all active:scale-[0.98] border border-white/10 hover:border-white/20 shadow-lg"
                >
                    <ArrowLeft size={20} /> Back to Safety
                </button>

            </motion.div>
        </div>
    );
};

export default MaintenancePage;