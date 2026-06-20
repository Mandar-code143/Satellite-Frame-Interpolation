import React, { useState } from 'react';
import { useLocation } from 'wouter';
import { useMissionStore } from '@/store/useMissionStore';
import { ArrowLeft, Download, Eye, Layers, BarChart, CheckCircle2, GitCommitHorizontal, AlertCircle } from 'lucide-react';

export default function Results() {
  const [, setLocation] = useLocation();
  const { jobResult, reset } = useMissionStore();
  const [activeTab, setActiveTab] = useState<'visual'|'metrics'|'trace'>('visual');
  const [sliderPos, setSliderPos] = useState(50);

  if (!jobResult) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-center">
        <AlertCircle className="h-16 w-16 text-yellow-500 mb-4" />
        <h2 className="text-2xl font-display text-white mb-2">No Results Available</h2>
        <p className="text-muted-foreground mb-6">The workspace session has expired or no job was run.</p>
        <button onClick={() => setLocation('/')} className="px-6 py-2 bg-primary/20 text-primary border border-primary/30 rounded">
          Return to Command Center
        </button>
      </div>
    );
  }

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSliderPos(Number(e.target.value));
  };

  const { metrics, explanation, frameAUrl, frameBUrl, interpolatedUrl, fallbackMode } = jobResult;

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
             <h1 className="text-3xl font-display font-bold text-white">Reconstruction Complete</h1>
             {fallbackMode && (
               <span className="px-2 py-0.5 bg-yellow-500/20 text-yellow-500 border border-yellow-500/50 rounded text-xs font-mono font-bold">FALLBACK MODE</span>
             )}
          </div>
          <p className="text-muted-foreground">Neural interpolation pipeline finished successfully.</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => { reset(); setLocation('/'); }} className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded text-sm text-white transition-colors">
            New Task
          </button>
          <button className="px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded text-sm transition-colors shadow-[0_0_15px_rgba(6,182,212,0.3)] flex items-center gap-2">
            <Download className="h-4 w-4" /> Export Data
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2 border-b border-white/10">
        <button onClick={() => setActiveTab('visual')} className={`px-4 py-3 font-mono text-sm border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'visual' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-white'}`}>
          <Eye className="h-4 w-4" /> VISUAL INSPECTION
        </button>
        <button onClick={() => setActiveTab('metrics')} className={`px-4 py-3 font-mono text-sm border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'metrics' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-white'}`}>
          <BarChart className="h-4 w-4" /> METRICS
        </button>
        <button onClick={() => setActiveTab('trace')} className={`px-4 py-3 font-mono text-sm border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'trace' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-white'}`}>
          <GitCommitHorizontal className="h-4 w-4" /> ENGINEERING TRACE
        </button>
      </div>

      {activeTab === 'visual' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-card border border-white/10 rounded-xl overflow-hidden flex flex-col h-[600px]">
            <div className="p-3 border-b border-white/10 bg-black/40 flex justify-between items-center text-xs font-mono text-muted-foreground">
              <span>FRAME T-1</span>
              <span className="text-primary font-bold">RECONSTRUCTED (T)</span>
              <span>FRAME T+1</span>
            </div>
            
            <div className="flex-1 relative bg-black flex items-center justify-center p-4">
               {/* Split Comparison View */}
               {interpolatedUrl ? (
                 <div className="relative w-full h-full max-w-3xl mx-auto overflow-hidden rounded border border-white/10">
                    <img src={interpolatedUrl} alt="Interpolated" className="absolute inset-0 w-full h-full object-contain" />
                    
                    <div 
                      className="absolute inset-0 overflow-hidden border-r-2 border-primary shadow-[2px_0_10px_rgba(6,182,212,0.5)]"
                      style={{ width: `${sliderPos}%` }}
                    >
                      {frameAUrl && <img src={frameAUrl} alt="Frame A" className="absolute inset-0 w-full h-full object-contain object-left max-w-none" style={{ width: `${100 / (sliderPos/100)}%` }} />}
                    </div>
                    
                    <input 
                      type="range" min="0" max="100" value={sliderPos} onChange={handleSliderChange}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-ew-resize z-10"
                    />
                    
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/80 px-3 py-1.5 rounded-full border border-white/10 text-xs font-mono text-white backdrop-blur flex items-center gap-2 pointer-events-none">
                      <ArrowLeft className="h-3 w-3" /> SLIDE TO COMPARE <ArrowLeft className="h-3 w-3 rotate-180" />
                    </div>
                 </div>
               ) : (
                 <div className="text-muted-foreground font-mono">Visual reconstruction unavailable</div>
               )}
            </div>
            
            <div className="p-4 bg-black/40 border-t border-white/10 grid grid-cols-3 gap-4 h-32">
               <div className="relative border border-white/10 rounded overflow-hidden">
                 {frameAUrl && <img src={frameAUrl} className="w-full h-full object-cover opacity-50 hover:opacity-100 transition-opacity" alt="A" />}
                 <div className="absolute top-1 left-1 bg-black/80 px-1.5 py-0.5 text-[10px] font-mono text-white rounded">T-1</div>
               </div>
               <div className="relative border border-primary/50 rounded overflow-hidden">
                 {interpolatedUrl && <img src={interpolatedUrl} className="w-full h-full object-cover" alt="Interp" />}
                 <div className="absolute top-1 left-1 bg-primary/80 px-1.5 py-0.5 text-[10px] font-mono text-white rounded">GENERATED</div>
               </div>
               <div className="relative border border-white/10 rounded overflow-hidden">
                 {frameBUrl && <img src={frameBUrl} className="w-full h-full object-cover opacity-50 hover:opacity-100 transition-opacity" alt="B" />}
                 <div className="absolute top-1 left-1 bg-black/80 px-1.5 py-0.5 text-[10px] font-mono text-white rounded">T+1</div>
               </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-card border border-white/10 rounded-xl p-6 shadow-xl">
              <h3 className="font-display font-semibold text-white mb-4 flex items-center gap-2">
                <Layers className="h-4 w-4 text-secondary" /> Scene Details
              </h3>
              <div className="space-y-4">
                <div>
                  <div className="text-xs text-muted-foreground font-mono mb-1">VARIABLE</div>
                  <div className="font-mono text-primary bg-primary/10 px-2 py-1 rounded inline-block border border-primary/20">
                    {explanation.selectedVariable || 'N/A'}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground font-mono mb-1">COMPUTE TIME</div>
                  <div className="font-mono text-white">
                    {jobResult.processingTimeMs ? `${(jobResult.processingTimeMs / 1000).toFixed(2)}s` : 'Unknown'}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground font-mono mb-1">INTERPOLATION MODE</div>
                  <div className="font-mono text-white uppercase">{explanation.interpolationMode}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'metrics' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {!metrics?.groundTruthAvailable ? (
            <div className="col-span-full bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-8 text-center flex flex-col items-center">
               <AlertCircle className="h-10 w-10 text-yellow-500 mb-3" />
               <h3 className="text-lg font-display text-white mb-1">Ground Truth Not Available</h3>
               <p className="text-muted-foreground">Validation metrics cannot be computed without a ground truth frame for reference.</p>
            </div>
          ) : (
            <>
              <div className="bg-card border border-white/10 rounded-xl p-6 shadow-xl relative overflow-hidden group hover:border-primary/50 transition-colors">
                <div className="absolute -inset-0.5 bg-gradient-to-br from-primary/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity blur"></div>
                <div className="relative">
                  <div className="text-sm font-mono text-muted-foreground mb-2">SSIM</div>
                  <div className="text-4xl font-display font-bold text-white tracking-tight">{metrics.ssim?.toFixed(4) || 'N/A'}</div>
                  <div className="text-xs text-muted-foreground mt-2">Structural Similarity Index</div>
                </div>
              </div>
              <div className="bg-card border border-white/10 rounded-xl p-6 shadow-xl relative overflow-hidden group hover:border-secondary/50 transition-colors">
                <div className="absolute -inset-0.5 bg-gradient-to-br from-secondary/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity blur"></div>
                <div className="relative">
                  <div className="text-sm font-mono text-muted-foreground mb-2">PSNR</div>
                  <div className="text-4xl font-display font-bold text-white tracking-tight">{metrics.psnr?.toFixed(2) || 'N/A'} <span className="text-lg text-muted-foreground font-sans font-normal">dB</span></div>
                  <div className="text-xs text-muted-foreground mt-2">Peak Signal-to-Noise Ratio</div>
                </div>
              </div>
              <div className="bg-card border border-white/10 rounded-xl p-6 shadow-xl relative overflow-hidden group hover:border-white/50 transition-colors">
                <div className="relative">
                  <div className="text-sm font-mono text-muted-foreground mb-2">MAE</div>
                  <div className="text-4xl font-display font-bold text-white tracking-tight">{metrics.mae?.toFixed(4) || 'N/A'}</div>
                  <div className="text-xs text-muted-foreground mt-2">Mean Absolute Error</div>
                </div>
              </div>
              <div className="bg-card border border-white/10 rounded-xl p-6 shadow-xl relative overflow-hidden group hover:border-white/50 transition-colors">
                <div className="relative">
                  <div className="text-sm font-mono text-muted-foreground mb-2">RMSE</div>
                  <div className="text-4xl font-display font-bold text-white tracking-tight">{metrics.rmse?.toFixed(4) || 'N/A'}</div>
                  <div className="text-xs text-muted-foreground mt-2">Root Mean Square Error</div>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {activeTab === 'trace' && (
        <div className="bg-card border border-white/10 rounded-xl p-6 shadow-xl">
          <div className="mb-6 border-b border-white/10 pb-4">
             <h3 className="font-display text-xl text-white mb-2">Algorithm Explainability</h3>
             <p className="text-muted-foreground text-sm">Step-by-step trace of the interpolation pipeline decisions.</p>
          </div>
          
          <div className="space-y-8 relative before:absolute before:inset-0 before:ml-[1.4rem] before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-white/10 before:to-transparent">
             {explanation.steps.map((step, idx) => (
               <div key={idx} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                 <div className="flex items-center justify-center w-12 h-12 rounded-full border-4 border-card bg-black shadow-[0_0_0_2px_rgba(255,255,255,0.1)] shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10 text-primary">
                    <CheckCircle2 className="h-5 w-5" />
                 </div>
                 <div className="w-[calc(100%-4rem)] md:w-[calc(50%-3rem)] p-4 rounded-xl border border-white/10 bg-white/5 shadow-md">
                   <div className="flex items-center justify-between mb-1">
                     <h4 className="font-bold text-white font-display">{step.label}</h4>
                     <span className="text-[10px] font-mono uppercase bg-white/10 px-2 py-0.5 rounded text-muted-foreground">Step {step.step}</span>
                   </div>
                   <p className="text-sm text-muted-foreground">{step.description}</p>
                 </div>
               </div>
             ))}
          </div>

          {(explanation.datasetNotes?.length || 0) > 0 && (
             <div className="mt-12 p-4 bg-primary/5 border border-primary/20 rounded-lg">
                <h4 className="text-primary font-mono text-sm mb-2 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" /> PIPELINE NOTES
                </h4>
                <ul className="list-disc list-inside text-sm text-muted-foreground ml-4 space-y-1">
                  {explanation.datasetNotes?.map((note, i) => <li key={i}>{note}</li>)}
                </ul>
             </div>
          )}
        </div>
      )}
    </div>
  );
}
