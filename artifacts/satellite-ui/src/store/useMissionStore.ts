import { create } from 'zustand';
import type { DatasetMetadata, JobResult } from '@workspace/api-client-react';

export type MissionState = 'idle' | 'uploading' | 'inspecting' | 'ready' | 'processing' | 'success' | 'error';

interface Store {
  missionState: MissionState;
  currentJobId: string | null;
  datasetMetadata: DatasetMetadata | null;
  selectedVariable: string | null;
  jobResult: JobResult | null;    
  file: File | null;
  setMissionState: (state: MissionState) => void;
  setCurrentJobId: (id: string | null) => void;
  setDatasetMetadata: (meta: DatasetMetadata | null) => void;
  setSelectedVariable: (vars: string | null) => void;
  setJobResult: (result: JobResult | null) => void;
  setFile: (file: File | null) => void;
  reset: () => void;
}

export const useMissionStore = create<Store>((set) => ({
  missionState: 'idle',
  currentJobId: null,
  datasetMetadata: null,
  selectedVariable: null,
  jobResult: null,
  file: null,
  setMissionState: (state) => set({ missionState: state }),
  setCurrentJobId: (id) => set({ currentJobId: id }),
  setDatasetMetadata: (meta) => set({ datasetMetadata: meta }),
  setSelectedVariable: (vars) => set({ selectedVariable: vars }),
  setJobResult: (result) => set({ jobResult: result }),
  setFile: (file) => set({ file }),
  reset: () => set({
    missionState: 'idle',
    currentJobId: null,
    datasetMetadata: null,
    selectedVariable: null,
    jobResult: null,
    file: null,
  }),
}));
