// src/pages/shared/NotFound.jsx

import React from 'react';
import { Link } from 'react-router-dom';

function NotFound() {
    return (
        <div className="min-h-screen bg-gray-950 flex flex-col justify-center items-center px-6 relative overflow-hidden transition-colors duration-300">
            
            {/* Cinematic Mesh Gradient Background */}
            <div className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-violet-600/20 rounded-full blur-[120px] mix-blend-screen animate-pulse"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-rose-600/20 rounded-full blur-[120px] mix-blend-screen animate-pulse delay-700"></div>
                <div className="absolute top-[30%] left-[30%] w-[40%] h-[40%] bg-purple-600/10 rounded-full blur-[100px] mix-blend-screen animate-pulse delay-1000"></div>
            </div>

            <div className="relative z-10 text-center max-w-2xl w-full">
                
                {/* Floating Glass Container */}
                <div className="glass rounded-[3rem] p-12 shadow-[0_8px_32px_0_rgba(0,0,0,0.5)] border border-white/10 backdrop-blur-2xl">
                    
                    {/* 404 Big Text */}
                    <div className="relative mb-6">
                        <h1 className="text-[120px] md:text-[180px] font-black leading-none select-none text-transparent bg-clip-text bg-gradient-to-b from-white to-white/10 filter drop-shadow-[0_0_20px_rgba(255,255,255,0.2)]">
                            404
                        </h1>
                        <div className="absolute inset-0 bg-gradient-to-t from-gray-950 to-transparent opacity-40"></div>
                    </div>

                    {/* Main Message */}
                    <div className="-mt-10 relative z-20">
                        <h2 className="text-3xl md:text-4xl font-black text-white mb-4 tracking-tight">
                            Lost in the Void
                        </h2>
                        <p className="text-gray-400 text-lg md:text-xl mb-10 font-medium max-w-md mx-auto leading-relaxed">
                            The page you are looking for has vanished into thin air or never existed at all.
                        </p>

                        {/* Action Button */}
                        <Link to="/login" className="inline-block group">
                            <button className="relative px-10 py-4 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white font-black rounded-2xl shadow-[0_0_20px_rgba(124,58,237,0.4)] hover:shadow-[0_0_30px_rgba(124,58,237,0.6)] transition-all transform hover:-translate-y-1 active:scale-[0.98] flex items-center gap-3 tracking-wide">
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                                </svg>
                                Return to Safety
                            </button>
                        </Link>
                    </div>
                </div>
            </div>

            {/* Footer Text */}
            <div className="absolute bottom-8 text-gray-600 text-[10px] font-bold uppercase tracking-widest transition-colors duration-300">
                Error Code: 404_LOST_IN_SPACE
            </div>
        </div>
    );
}

export default NotFound;