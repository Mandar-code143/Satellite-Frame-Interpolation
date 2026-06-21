import React, { useState } from 'react';
import { useLocation } from 'wouter';
import { Upload, Play, Database, Activity, Cpu } from 'lucide-react';
import { motion } from 'framer-motion';
import GlobeScene from '@/components/3d/Globe';
import { useMissionStore } from '@/store/useMissionStore';
import { useGetModelStatus } from '@workspace/api-client-react';

export default function Home() {
  const [, setLocation] = useLocation();
  const { setFile, setMissionState, reset } = useMissionStore();
  const { data: modelStatus } = useGetModelStatus();
  
  const [isHoveringUpload, setIsHoveringUpload] = useState(false);

  const handleDemoMode = () => {
    reset();
    setMissionState('inspecting');
    setLocation('/workspace?demo=true');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      reset();
      setFile(file);
      setMissionState('inspecting');
      setLocation('/inspect');
    }
  };

  return (
    <div className="h-full flex flex-col lg:flex-row items-center justify-between gap-12 max-w-7xl mx-auto">
      <div className="flex-1 space-y-8 z-10">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-mono mb-6">
            <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
            MISSION CONTROL ACTIVE
          </div>
          
          <h1 className="text-5xl md:text-7xl font-display font-bold text-white leading-[1.1] tracking-tight">
            Satellite Data <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary filter drop-shadow-[0_0_10px_rgba(6,182,212,0.5)]">
              Interpolation
            </span>
          </h1>
          
          <p className="mt-6 text-lg text-muted-foreground max-w-xl leading-relaxed">
            Advanced neural reconstruction for incomplete geospatial telemetry. Upload incomplete NetCDF datasets to interpolate missing frames using state-of-the-art vision models.
          </p>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="flex flex-col sm:flex-row gap-4"
        >
          <div 
            className="relative group"
            onMouseEnter={() => setIsHoveringUpload(true)}
            onMouseLeave={() => setIsHoveringUpload(false)}
          >
            <div className={`absolute -inset-0.5 bg-gradient-to-r from-primary to-secondary rounded-lg blur opacity-30 group-hover:opacity-70 transition duration-500 ${isHoveringUpload ? 'animate-pulse' : ''}`}></div>
            <label className="relative flex items-center justify-center gap-3 bg-card px-8 py-4 rounded-lg border border-white/10 hover:border-primary/50 text-white font-display font-semibold tracking-wide uppercase cursor-pointer transition-all">
              <Upload className="h-5 w-5 text-primary" />
              Upload NetCDF
              <input type="file" className="hidden" accept=".nc" onChange={handleFileUpload} />
            </label>
          </div>

          <button 
            onClick={handleDemoMode}
            className="flex items-center justify-center gap-3 px-8 py-4 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 text-white font-display font-semibold tracking-wide uppercase transition-all"
          >
            <Play className="h-5 w-5 text-secondary" />
            Demo Sequence
          </button>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 0.5 }}
          className="grid grid-cols-2 md:grid-cols-3 gap-4 pt-8 border-t border-white/10"
        >
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono">
              <Cpu className="h-3 w-3" /> MODEL STATUS
            </div>
            <div className={`text-sm font-semibold ${modelStatus?.modelExists ? 'text-green-400' : 'text-yellow-400'}`}>
              {modelStatus?.modelExists ? 'ONLINE (READY)' : 'FALLBACK MODE'}
            </div>
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono">
              <Activity className="h-3 w-3" /> COMPUTE NODE
            </div>
            <div className="text-sm font-semibold text-white">
              {modelStatus?.device?.toUpperCase() || 'UNKNOWN'}
            </div>
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono">
              <Database className="h-3 w-3" /> PIPELINE
            </div>
            <div className="text-sm font-semibold text-primary">
              v1.2.0 NOMINAL
            </div>
          </div>
        </motion.div>
      </div>

      <div className="flex-1 w-full h-[400px] lg:h-[600px] relative pointer-events-none md:pointer-events-auto">
        <GlobeScene />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-background pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-r from-background via-transparent to-background pointer-events-none" />
      </div>
    </div>
  );
}
