import React, { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { motion } from 'framer-motion';
import { FileSearch, CheckCircle2, AlertTriangle, ArrowRight, Layers, BoxSelect, Variable } from 'lucide-react';
import { useMissionStore } from '@/store/useMissionStore';
import { useToast } from '@/hooks/use-toast';
import type { DatasetMetadata } from '@workspace/api-client-react';

export default function Inspect() {
  const [, setLocation] = useLocation();
  const { file, setDatasetMetadata, datasetMetadata, setSelectedVariable, selectedVariable } = useMissionStore();
  const { toast } = useToast();
  
  const [isInspecting, setIsInspecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!file && !datasetMetadata) {
      setLocation('/');
      return;
    }

    if (file && !datasetMetadata && !isInspecting && !error) {
      inspectFile();
    }
  }, [file, datasetMetadata, isInspecting, error, setLocation]);

  const inspectFile = async () => {
    setIsInspecting(true);
    setError(null);
    try {
      const formData = new FormData();
      if (file) formData.append('file', file);

      const res = await fetch('http://127.0.0.1:8000/api/inspect', {
      method: 'POST',
      body: formData,
      });

      if (!res.ok) {
        throw new Error(await res.text() || 'Failed to inspect dataset');
      }

      const data: DatasetMetadata = await res.json();
      setDatasetMetadata(data);
      
      // Auto-select best candidate
      if (data.candidateVariables && data.candidateVariables.length > 0) {
        setSelectedVariable(data.candidateVariables[0].name);
      } else if (data.variables && data.variables.length > 0) {
        setSelectedVariable(data.variables[0].name);
      }
      
    } catch (err: any) {
      console.error(err);
      setError(err.message);
      toast({
        title: "Inspection Failed",
        description: err.message,
        variant: "destructive"
      });
    } finally {
      setIsInspecting(false);
    }
  };

  const handleContinue = () => {
    if (selectedVariable) {
      setLocation('/workspace');
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-12">
      <div className="flex items-center justify-between border-b border-white/10 pb-6">
        <div>
          <h1 className="text-3xl font-display font-bold text-white">Dataset Inspection</h1>
          <p className="text-muted-foreground mt-2">Parsing NetCDF structures and isolating spatial variables.</p>
        </div>
        <div className="text-right">
          <div className="text-xs text-muted-foreground font-mono">TARGET FILE</div>
          <div className="text-primary font-mono bg-primary/10 px-3 py-1 rounded-sm border border-primary/20 mt-1">
            {file?.name || datasetMetadata?.filename || 'UNKNOWN'}
          </div>
        </div>
      </div>

      {isInspecting ? (
        <div className="flex flex-col items-center justify-center py-24 space-y-6">
          <div className="relative">
            <div className="absolute inset-0 bg-primary blur-xl opacity-20 rounded-full animate-pulse"></div>
            <FileSearch className="h-16 w-16 text-primary animate-bounce relative z-10" />
          </div>
          <div className="text-center space-y-2">
            <h3 className="text-xl font-display text-white">Analyzing Geometry</h3>
            <p className="text-muted-foreground font-mono text-sm animate-pulse">Extracting coordinates, variables, and attributes...</p>
          </div>
        </div>
      ) : error ? (
        <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-8 flex flex-col items-center justify-center text-center space-y-4">
          <AlertTriangle className="h-12 w-12 text-destructive" />
          <div>
            <h3 className="text-xl font-bold text-white mb-2">Analysis Failed</h3>
            <p className="text-muted-foreground max-w-md">{error}</p>
          </div>
          <button onClick={() => setLocation('/')} className="px-6 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-md transition-colors text-white mt-4">
            Return to Command Center
          </button>
        </div>
      ) : datasetMetadata ? (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-1 lg:grid-cols-3 gap-8"
        >
          {/* Main Info */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-card border border-white/10 rounded-xl p-6 shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                <Layers className="w-48 h-48" />
              </div>
              
              <h2 className="text-xl font-display font-semibold text-white mb-6 flex items-center gap-2">
                <CheckCircle2 className="text-green-500 h-5 w-5" />
                Geometry Overview
              </h2>
              
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
                <div className="bg-white/5 border border-white/5 p-4 rounded-lg">
                  <div className="text-xs text-muted-foreground font-mono mb-1">FILE SIZE</div>
                  <div className="text-lg text-white font-semibold">
                    {datasetMetadata.fileSizeBytes ? (datasetMetadata.fileSizeBytes / (1024 * 1024)).toFixed(2) + ' MB' : 'N/A'}
                  </div>
                </div>
                <div className="bg-white/5 border border-white/5 p-4 rounded-lg">
                  <div className="text-xs text-muted-foreground font-mono mb-1">TIMESTEPS</div>
                  <div className="text-lg text-white font-semibold text-secondary">
                    {datasetMetadata.timeSteps}
                  </div>
                </div>
                <div className="bg-white/5 border border-white/5 p-4 rounded-lg">
                  <div className="text-xs text-muted-foreground font-mono mb-1">VARIABLES</div>
                  <div className="text-lg text-white font-semibold">
                    {datasetMetadata.variables.length}
                  </div>
                </div>
                <div className="bg-white/5 border border-white/5 p-4 rounded-lg">
                  <div className="text-xs text-muted-foreground font-mono mb-1">TIME AXIS</div>
                  <div className="text-lg text-white font-semibold">
                    {datasetMetadata.hasTimeAxis ? 'DETECTED' : 'NONE'}
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-sm font-mono text-muted-foreground uppercase">Dimensions</h3>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(datasetMetadata.dimensions).map(([key, val]) => (
                    <div key={key} className="flex items-center text-sm bg-black/40 border border-white/10 rounded overflow-hidden">
                      <span className="px-3 py-1.5 text-muted-foreground font-mono bg-white/5">{key}</span>
                      <span className="px-3 py-1.5 text-primary font-mono">{val}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="bg-card border border-white/10 rounded-xl overflow-hidden shadow-xl">
               <div className="p-6 border-b border-white/10 bg-white/5">
                 <h2 className="text-lg font-display font-semibold text-white flex items-center gap-2">
                    <Variable className="h-5 w-5 text-secondary" />
                    Target Variable Selection
                 </h2>
                 <p className="text-sm text-muted-foreground mt-1">Select the spatial variable you wish to interpolate.</p>
               </div>
               
               <div className="divide-y divide-white/5">
                 {datasetMetadata.candidateVariables.map((cand, idx) => {
                   const isSelected = selectedVariable === cand.name;
                   return (
                     <div 
                        key={cand.name}
                        onClick={() => setSelectedVariable(cand.name)}
                        className={`p-4 cursor-pointer transition-colors flex items-start gap-4 ${isSelected ? 'bg-primary/10 border-l-2 border-primary' : 'hover:bg-white/5 border-l-2 border-transparent'}`}
                     >
                       <div className="mt-1">
                         <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${isSelected ? 'border-primary' : 'border-muted-foreground'}`}>
                           {isSelected && <div className="w-2 h-2 rounded-full bg-primary" />}
                         </div>
                       </div>
                       <div className="flex-1">
                         <div className="flex items-center gap-3">
                           <span className={`font-mono font-bold ${isSelected ? 'text-primary' : 'text-white'}`}>{cand.name}</span>
                           {idx === 0 && <span className="text-[10px] bg-green-500/20 text-green-400 px-2 py-0.5 rounded uppercase font-bold tracking-wider border border-green-500/30">Recommended</span>}
                         </div>
                         <p className="text-sm text-muted-foreground mt-1">{cand.reason}</p>
                       </div>
                       <div className="text-right">
                         <div className="text-xs text-muted-foreground font-mono">SCORE</div>
                         <div className={`font-mono ${isSelected ? 'text-white' : 'text-muted-foreground'}`}>{cand.score.toFixed(2)}</div>
                       </div>
                     </div>
                   );
                 })}
               </div>
            </div>
          </div>

          {/* Sidebar Info */}
          <div className="space-y-6">
            <div className="bg-card border border-white/10 rounded-xl p-6 shadow-xl sticky top-24">
              <h3 className="font-display font-semibold text-white mb-4">Scientific Summary</h3>
              <p className="text-sm text-muted-foreground leading-relaxed mb-6">
                {datasetMetadata.explanation}
              </p>
              
              <button 
                onClick={handleContinue}
                disabled={!selectedVariable}
                className={`w-full flex items-center justify-center gap-2 py-3 rounded-lg font-display font-bold uppercase tracking-wider transition-all ${selectedVariable ? 'bg-primary hover:bg-primary/90 text-primary-foreground shadow-[0_0_20px_rgba(6,182,212,0.3)]' : 'bg-white/5 text-muted-foreground cursor-not-allowed'}`}
              >
                Initialize Workspace
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </motion.div>
      ) : null}
    </div>
  );
}
