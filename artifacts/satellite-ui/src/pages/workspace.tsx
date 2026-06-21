import React, { useEffect, useState, useRef } from 'react';
import { useLocation } from 'wouter';
import { useMissionStore } from '@/store/useMissionStore';
import { useGetJobStatus } from '@workspace/api-client-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, Server, Terminal, Settings, ChevronRight, Activity, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function Workspace() {
  const [location, setLocation] = useLocation();
  const searchParams = new URLSearchParams(window.location.search);
  const isDemo = searchParams.get('demo') === 'true';
  
  const { file, selectedVariable, currentJobId, setCurrentJobId, setJobResult, setMissionState, missionState } = useMissionStore();
  const { toast } = useToast();

  const [logs, setLogs] = useState<{time: string, msg: string, type: 'info'|'warn'|'error'}[]>([]);
  const logsEndRef = useRef<HTMLDivElement>(null);

  const addLog = (msg: string, type: 'info'|'warn'|'error' = 'info') => {
    setLogs(prev => [...prev, { time: new Date().toISOString().substring(11, 19), msg, type }]);
  };

  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  // Status Polling
  const { data: jobStatus, error: statusError } = useGetJobStatus(currentJobId || '', {
    query: {
      queryKey: ['jobStatus', currentJobId],
      enabled: !!currentJobId && missionState === 'processing',
      refetchInterval: 1500,
    }
  });

  // Start job on mount if ready
  useEffect(() => {
    if (missionState !== 'inspecting' && missionState !== 'idle') return;
    if (!isDemo && !file) {
      setLocation('/');
      return;
    }

    const startJob = async () => {
      setMissionState('processing');
      addLog('Initializing interpolation pipeline...', 'info');
      
      try {
        const formData = new FormData();
        if (isDemo) {
          formData.append('demoMode', 'true');
          formData.append('selectedVariable', 'demo');
          addLog('DEMO MODE ENABLED: Proceeding without file.', 'warn');
        } else {
          formData.append('file', file as Blob);
          formData.append('selectedVariable', selectedVariable || '');
          addLog(`Target variable locked: ${selectedVariable}`, 'info');
        }

        const res = await fetch('http://127.0.0.1:8000/api/interpolate', {
        method: 'POST',
        body: formData,
        });

        if (!res.ok) {
          throw new Error(await res.text() || 'Failed to start interpolation');
        }

        const data = await res.json();
        
        if (data.jobId) {
           addLog(`Job created: ${data.jobId}. Switching to async processing...`, 'info');
           setCurrentJobId(data.jobId);
           // If we get an immediate result (mock/fast path)
           if (data.status === 'completed') {
             setJobResult(data);
             setMissionState('success');
             setLocation('/results');
           }
        } else {
          // Synchronous fallback (if API doesn't use queue)
          setJobResult(data);
          setMissionState('success');
          setLocation('/results');
        }

      } catch (err: any) {
        console.error(err);
        addLog(`CRITICAL ERROR: ${err.message}`, 'error');
        setMissionState('error');
        toast({
          title: "Interpolation Failed",
          description: err.message,
          variant: "destructive"
        });
      }
    };

    startJob();
  }, [file, isDemo, selectedVariable, setLocation, setMissionState, setCurrentJobId, setJobResult, toast]);

  // Handle polling updates
  useEffect(() => {
    if (jobStatus) {
       // Log new messages
       if (jobStatus.messages && jobStatus.messages.length > 0) {
         const latestMsg = jobStatus.messages[jobStatus.messages.length - 1];
         // Basic deduplication
         if (logs.length === 0 || logs[logs.length - 1].msg !== latestMsg) {
            addLog(`[${jobStatus.stage.toUpperCase()}] ${latestMsg}`);
         }
       }

       if (jobStatus.status === 'completed') {
         addLog('Job completed successfully. Fetching results...', 'info');
         // We need to fetch the actual result now
         fetch(`http://127.0.0.1:8000/api/jobs/${currentJobId}/result`)
           .then(res => res.json())
           .then(data => {
             setJobResult(data);
             setMissionState('success');
             setLocation('/results');
           })
           .catch(err => {
             addLog(`Result fetch failed: ${err.message}`, 'error');
             setMissionState('error');
           });
       } else if (jobStatus.status === 'failed' || jobStatus.status === 'error') {
         addLog(`Job failed: ${jobStatus.error || 'Unknown error'}`, 'error');
         setMissionState('error');
       }
    }
  }, [jobStatus, currentJobId, setLocation, setJobResult, setMissionState]);

  const stages = ['uploading', 'preprocessing', 'model_inference', 'postprocessing', 'completed'];
  const currentStageIndex = jobStatus ? stages.indexOf(jobStatus.stage) : 0;
  const progressPercent = jobStatus ? jobStatus.progress * 100 : 0;

  return (
    <div className="max-w-6xl mx-auto h-[calc(100vh-12rem)] flex flex-col gap-6">
       <div className="flex items-center justify-between border-b border-white/10 pb-4 shrink-0">
          <div>
            <h1 className="text-3xl font-display font-bold text-white flex items-center gap-3">
              <Settings className="text-secondary h-8 w-8 animate-spin-slow" />
              Active Interpolation
            </h1>
          </div>
          {isDemo && (
             <div className="px-3 py-1 bg-yellow-500/20 text-yellow-400 border border-yellow-500/50 rounded text-xs font-mono font-bold tracking-widest">
               DEMO MODE
             </div>
          )}
       </div>

       <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-0">
         {/* Status Panel */}
         <div className="lg:col-span-2 bg-card border border-white/10 rounded-xl flex flex-col overflow-hidden shadow-xl">
           <div className="p-6 border-b border-white/10 bg-white/5 flex items-center justify-between">
             <div className="flex items-center gap-3">
               <Activity className="text-primary h-5 w-5 animate-pulse" />
               <h2 className="text-lg font-mono text-white">PIPELINE_STATUS</h2>
             </div>
             <div className="text-xl font-mono text-primary">{progressPercent.toFixed(0)}%</div>
           </div>
           
           <div className="p-8 flex-1 flex flex-col justify-center space-y-12">
             {/* Progress Bar */}
             <div className="relative h-2 bg-black/50 rounded-full overflow-hidden border border-white/5">
                <motion.div 
                  className="absolute inset-y-0 left-0 bg-gradient-to-r from-primary to-secondary"
                  initial={{ width: "0%" }}
                  animate={{ width: `${progressPercent}%` }}
                  transition={{ duration: 0.5 }}
                />
                <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0IiBoZWlnaHQ9IjQiPjxyZWN0IHdpZHRoPSI0IiBoZWlnaHQ9IjQiIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSIvPjwvc3ZnPg==')] opacity-50 mix-blend-overlay" />
             </div>

             {/* Stages */}
             <div className="flex justify-between relative">
               <div className="absolute top-1/2 left-0 right-0 h-[1px] bg-white/10 -translate-y-1/2 z-0" />
               {stages.map((stage, idx) => {
                 const isCompleted = idx < currentStageIndex || jobStatus?.status === 'completed';
                 const isActive = idx === currentStageIndex && jobStatus?.status !== 'completed';
                 
                 return (
                   <div key={stage} className="relative z-10 flex flex-col items-center gap-3">
                     <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-colors duration-300 bg-card
                       ${isCompleted ? 'border-green-500 text-green-500 shadow-[0_0_15px_rgba(16,185,129,0.3)]' : 
                         isActive ? 'border-primary text-primary shadow-[0_0_15px_rgba(6,182,212,0.5)]' : 
                         'border-white/20 text-muted-foreground'}`}
                     >
                       {isCompleted ? <CheckCircle className="h-4 w-4" /> : isActive ? <Loader2 className="h-4 w-4 animate-spin" /> : <span className="w-2 h-2 rounded-full bg-white/20" />}
                     </div>
                     <span className={`text-[10px] font-mono uppercase tracking-wider ${isActive ? 'text-primary' : isCompleted ? 'text-white' : 'text-muted-foreground'}`}>
                       {stage.replace('_', ' ')}
                     </span>
                   </div>
                 );
               })}
             </div>
           </div>
         </div>

         {/* Terminal Log */}
         <div className="bg-[#0a0a0a] border border-white/10 rounded-xl flex flex-col overflow-hidden shadow-xl font-mono text-sm">
           <div className="p-3 border-b border-white/10 bg-white/5 flex items-center gap-2 text-muted-foreground">
             <Terminal className="h-4 w-4" />
             <span>MISSION_LOG</span>
           </div>
           <div className="p-4 flex-1 overflow-y-auto space-y-2">
             {logs.map((log, i) => (
               <div key={i} className="flex gap-3 leading-tight break-all">
                 <span className="text-white/30 shrink-0">[{log.time}]</span>
                 <span className={`${
                   log.type === 'error' ? 'text-red-400' : 
                   log.type === 'warn' ? 'text-yellow-400' : 'text-primary'
                 }`}>
                   {log.msg}
                 </span>
               </div>
             ))}
             {missionState === 'processing' && (
               <div className="flex gap-3 text-white/50 animate-pulse">
                 <span>[{new Date().toISOString().substring(11, 19)}]</span>
                 <span>_</span>
               </div>
             )}
             <div ref={logsEndRef} />
           </div>
         </div>
       </div>
    </div>
  );
}
