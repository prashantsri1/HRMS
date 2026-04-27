// src/pages/common/ForceStopPage.jsx

import React from 'react';
import { Ban, ShieldAlert, Lock, AlertTriangle } from 'lucide-react';
import { motion } from 'framer-motion';

const ForceStopPage = () => {
  return (
    <div className="h-screen w-full bg-gray-900 flex items-center justify-center relative overflow-hidden font-sans">
      
      {/* 🌟 1. BACKGROUND ANIMATION (Hilta Hua Maal) */}
      <div className="absolute inset-0 w-full h-full">
        {/* Floating Blob 1 */}
        <motion.div 
          animate={{ x: [0, 100, 0], y: [0, -50, 0], scale: [1, 1.2, 1] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-10 left-10 w-72 h-72 bg-purple-600 rounded-full mix-blend-multiply filter blur-3xl opacity-30"
        />
        {/* Floating Blob 2 */}
        <motion.div 
          animate={{ x: [0, -80, 0], y: [0, 100, 0], scale: [1, 1.5, 1] }}
          transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
          className="absolute bottom-10 right-10 w-96 h-96 bg-red-600 rounded-full mix-blend-multiply filter blur-3xl opacity-30"
        />
        {/* Floating Blob 3 */}
        <motion.div 
          animate={{ x: [0, 50, -50, 0], y: [0, 50, -50, 0] }}
          transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-indigo-900 rounded-full mix-blend-multiply filter blur-[100px] opacity-20"
        />
      </div>

      {/* 🌟 2. MAIN CARD (Glassmorphism) */}
      <motion.div 
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 120, damping: 20 }}
        className="relative z-10 bg-white/10 backdrop-blur-xl border border-white/20 p-10 rounded-3xl shadow-2xl text-center max-w-md w-[90%]"
      >
        
        {/* 🛑 Animated Icon Section */}
        <div className="relative flex justify-center mb-6">
          {/* Pulsing Red Circle behind */}
          <motion.div 
            animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="absolute inset-0 bg-red-500 rounded-full blur-xl opacity-40"
          ></motion.div>
          
          {/* Shaking Icon */}
          <motion.div
            animate={{ rotate: [0, -10, 10, -10, 10, 0] }}
            transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 2 }}
            className="bg-red-100/20 p-5 rounded-full border-2 border-red-500/50 shadow-lg relative z-10"
          >
            <ShieldAlert size={64} className="text-red-500 drop-shadow-lg" />
          </motion.div>
        </div>

        {/* 📝 Text Content */}
        <motion.h1 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-4xl font-black text-white tracking-tight mb-2"
        >
          ACCESS <span className="text-red-500">REVOKED</span>
        </motion.h1>

        <motion.p 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-gray-300 text-sm mb-8 font-medium leading-relaxed"
        >
          Your account has been temporarily force-stopped by the Administrator. 
          <br/> Don't panic, just chill and contact support.
        </motion.p>

        {/* 📞 Contact Button */}
        <motion.div 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="bg-gray-900/50 rounded-xl p-4 border border-gray-700/50"
        >
          <div className="flex items-center justify-center gap-2 text-gray-400 text-xs uppercase font-bold tracking-widest mb-2">
            <Lock size={12} /> Administrator Action
          </div>
          <p className="text-white font-mono text-sm">Please contact HR or IT Dept.</p>
        </motion.div>

      </motion.div>

      {/* Footer Text */}
      <div className="absolute bottom-6 text-gray-600 text-xs font-mono">
        SYSTEM LOCKED • SECURITY PROTOCOL 403
      </div>

    </div>
  );
};

export default ForceStopPage;