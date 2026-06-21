import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import {
  AppState,
  LicenseFile,
  Material,
  AuditProblem,
  AuditRecord,
  ProblemStatus,
  CompareResult,
  DuplicateFileInfo,
} from '../types';
import {
  loadState,
  saveState,
  generateId,
  generateProblems,
  createAuditRecord,
  defaultState,
  detectLicenseType,
  compareWithBaseline as compareSnapshots,
  detectDuplicates,
  getIncrementalReportContent,
} from '../utils/storage';
import { mockFiles, mockMaterials, mockAuditRecords } from '../data/mockData';

type Action =
  | { type: 'INIT_STATE' }
  | { type: 'ADD_FILES'; files: LicenseFile[] }
  | { type: 'UPDATE_FILE'; file: LicenseFile }
  | { type: 'DELETE_FILE'; fileId: string }
  | { type: 'ADD_MATERIAL'; material: Material }
  | { type: 'UPDATE_MATERIAL'; material: Material }
  | { type: 'DELETE_MATERIAL'; materialId: string }
  | { type: 'UPDATE_PROBLEM'; problem: AuditProblem }
  | { type: 'UPDATE_PROBLEM_STATUS'; problemId: string; status: ProblemStatus; opinion?: string }
  | { type: 'RUN_AUDIT' }
  | { type: 'SET_AUDIT_DATE'; date: string }
  | { type: 'SET_INSTITUTION_NAME'; name: string }
  | { type: 'SET_WARNING_DAYS'; days: number }
  | { type: 'ADD_AUDIT_RECORD'; record: AuditRecord; reviewer: string; remark?: string }
  | { type: 'SET_BASELINE_RECORD'; recordId: string | undefined }
  | { type: 'LOAD_LAST_AUDIT'; recordId: string }
  | { type: 'RESET_STATE' };

function initState(): AppState {
  const saved = loadState();
  if (saved && saved.files.length > 0) {
    return saved;
  }
  return {
    ...defaultState,
    files: mockFiles,
    materials: mockMaterials,
    auditRecords: mockAuditRecords,
    problems: [],
  };
}

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'INIT_STATE': {
      const newState = initState();
      const problems = generateProblems(
        newState.files,
        newState.materials,
        newState.institutionName,
        newState.currentAuditDate,
        newState.warningDays,
        []
      );
      return { ...newState, problems };
    }

    case 'ADD_FILES': {
      const newFiles = [...state.files, ...action.files];
      return { ...state, files: newFiles };
    }

    case 'UPDATE_FILE': {
      const files = state.files.map(f =>
        f.id === action.file.id ? action.file : f
      );
      return { ...state, files };
    }

    case 'DELETE_FILE': {
      const files = state.files.filter(f => f.id !== action.fileId);
      const materials = state.materials.map(m => ({
        ...m,
        licenseFiles: m.licenseFiles.filter(id => id !== action.fileId),
      }));
      return { ...state, files, materials };
    }

    case 'ADD_MATERIAL': {
      return { ...state, materials: [...state.materials, action.material] };
    }

    case 'UPDATE_MATERIAL': {
      const materials = state.materials.map(m =>
        m.id === action.material.id ? action.material : m
      );
      return { ...state, materials };
    }

    case 'DELETE_MATERIAL': {
      const materials = state.materials.filter(m => m.id !== action.materialId);
      return { ...state, materials };
    }

    case 'UPDATE_PROBLEM': {
      const problems = state.problems.map(p =>
        p.id === action.problem.id ? { ...action.problem, updatedAt: new Date().toISOString().split('T')[0] } : p
      );
      return { ...state, problems };
    }

    case 'UPDATE_PROBLEM_STATUS': {
      const problems = state.problems.map(p =>
        p.id === action.problemId
          ? { ...p, status: action.status, handlerOpinion: action.opinion, updatedAt: new Date().toISOString().split('T')[0], lastHandledAt: new Date().toISOString().split('T')[0], isNewProblem: false }
          : p
      );
      return { ...state, problems };
    }

    case 'RUN_AUDIT': {
      const problems = generateProblems(
        state.files,
        state.materials,
        state.institutionName,
        state.currentAuditDate,
        state.warningDays,
        state.problems
      );
      return { ...state, problems };
    }

    case 'SET_AUDIT_DATE': {
      return { ...state, currentAuditDate: action.date };
    }

    case 'SET_INSTITUTION_NAME': {
      return { ...state, institutionName: action.name };
    }

    case 'SET_WARNING_DAYS': {
      return { ...state, warningDays: action.days };
    }

    case 'SET_BASELINE_RECORD': {
      return { ...state, baselineRecordId: action.recordId };
    }

    case 'ADD_AUDIT_RECORD': {
      return {
        ...state,
        auditRecords: [...state.auditRecords, action.record],
        lastAuditRecordId: action.record.id,
        baselineRecordId: action.record.id,
      };
    }

    case 'LOAD_LAST_AUDIT': {
      const record = state.auditRecords.find(r => r.id === action.recordId);
      if (!record) return state;
      return state;
    }

    case 'RESET_STATE': {
      return { ...defaultState, problems: [] };
    }

    default:
      return state;
  }
}

interface AppContextType {
  state: AppState;
  dispatch: React.Dispatch<Action>;
  addFiles: (files: File[]) => { duplicates: DuplicateFileInfo[]; addedCount: number };
  updateFile: (file: LicenseFile) => void;
  deleteFile: (fileId: string) => void;
  addMaterial: (material: Omit<Material, 'id' | 'licenseFiles'>) => void;
  updateMaterial: (material: Material) => void;
  deleteMaterial: (materialId: string) => void;
  updateProblemStatus: (problemId: string, status: ProblemStatus, opinion?: string) => void;
  runAudit: () => void;
  setAuditDate: (date: string) => void;
  setInstitutionName: (name: string) => void;
  setWarningDays: (days: number) => void;
  saveAuditRecord: (reviewer: string, remark?: string) => AuditRecord;
  setBaselineRecord: (recordId: string | undefined) => void;
  compareWithBaseline: (baselineId?: string) => CompareResult | null;
  getDuplicates: () => DuplicateFileInfo[];
  getFileById: (id: string) => LicenseFile | undefined;
  getMaterialById: (id: string) => Material | undefined;
  getAuditRecordById: (id: string) => AuditRecord | undefined;
  getIncrementalReportContent: (compareResult: CompareResult, baselineRecord: AuditRecord) => string;
}

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, defaultState);

  useEffect(() => {
    dispatch({ type: 'INIT_STATE' });
  }, []);

  useEffect(() => {
    if (state.files.length > 0 || state.materials.length > 0) {
      saveState(state);
    }
  }, [state]);

  const addFiles = (fileList: File[]): { duplicates: DuplicateFileInfo[]; addedCount: number } => {
    const newFiles: LicenseFile[] = fileList.map(file => ({
      id: generateId(),
      name: file.name,
      type: detectLicenseType(file.name),
      fileSize: file.size,
      uploadTime: new Date().toISOString().split('T')[0],
      status: 'pending',
    }));
    
    const allFiles = [...state.files, ...newFiles];
    const allDuplicates = detectDuplicates(allFiles);
    const newDuplicates = allDuplicates.filter(d => 
      newFiles.some(nf => nf.id === d.file.id)
    );
    
    dispatch({ type: 'ADD_FILES', files: newFiles });
    setTimeout(() => dispatch({ type: 'RUN_AUDIT' }), 100);
    
    return {
      duplicates: newDuplicates,
      addedCount: newFiles.length,
    };
  };

  const updateFile = (file: LicenseFile) => {
    dispatch({ type: 'UPDATE_FILE', file });
    setTimeout(() => dispatch({ type: 'RUN_AUDIT' }), 100);
  };

  const deleteFile = (fileId: string) => {
    dispatch({ type: 'DELETE_FILE', fileId });
    setTimeout(() => dispatch({ type: 'RUN_AUDIT' }), 100);
  };

  const addMaterial = (material: Omit<Material, 'id' | 'licenseFiles'>) => {
    const newMaterial: Material = {
      ...material,
      id: generateId(),
      licenseFiles: [],
    };
    dispatch({ type: 'ADD_MATERIAL', material: newMaterial });
  };

  const updateMaterial = (material: Material) => {
    dispatch({ type: 'UPDATE_MATERIAL', material });
    setTimeout(() => dispatch({ type: 'RUN_AUDIT' }), 100);
  };

  const deleteMaterial = (materialId: string) => {
    dispatch({ type: 'DELETE_MATERIAL', materialId });
  };

  const updateProblemStatus = (problemId: string, status: ProblemStatus, opinion?: string) => {
    dispatch({ type: 'UPDATE_PROBLEM_STATUS', problemId, status, opinion });
  };

  const runAudit = () => {
    dispatch({ type: 'RUN_AUDIT' });
  };

  const setAuditDate = (date: string) => {
    dispatch({ type: 'SET_AUDIT_DATE', date });
    setTimeout(() => dispatch({ type: 'RUN_AUDIT' }), 100);
  };

  const setInstitutionName = (name: string) => {
    dispatch({ type: 'SET_INSTITUTION_NAME', name });
    setTimeout(() => dispatch({ type: 'RUN_AUDIT' }), 100);
  };

  const setWarningDays = (days: number) => {
    dispatch({ type: 'SET_WARNING_DAYS', days });
    setTimeout(() => dispatch({ type: 'RUN_AUDIT' }), 100);
  };

  const saveAuditRecord = (reviewer: string, remark?: string): AuditRecord => {
    const record = createAuditRecord(state, reviewer, remark);
    dispatch({ type: 'ADD_AUDIT_RECORD', record, reviewer, remark });
    return record;
  };

  const setBaselineRecord = (recordId: string | undefined) => {
    dispatch({ type: 'SET_BASELINE_RECORD', recordId });
  };

  const compareWithBaseline = (baselineId?: string): CompareResult | null => {
    const baselineRecordId = baselineId || state.baselineRecordId;
    if (!baselineRecordId) return null;
    
    const baselineRecord = state.auditRecords.find(r => r.id === baselineRecordId);
    if (!baselineRecord || !baselineRecord.snapshot) return null;
    
    return compareSnapshots(
      { files: state.files, materials: state.materials, problems: state.problems },
      baselineRecord.snapshot
    );
  };

  const getDuplicates = (): DuplicateFileInfo[] => {
    return detectDuplicates(state.files);
  };

  const getFileById = (id: string) => state.files.find(f => f.id === id);

  const getMaterialById = (id: string) => state.materials.find(m => m.id === id);

  const getAuditRecordById = (id: string) => state.auditRecords.find(r => r.id === id);

  return (
    <AppContext.Provider
      value={{
        state,
        dispatch,
        addFiles,
        updateFile,
        deleteFile,
        addMaterial,
        updateMaterial,
        deleteMaterial,
        updateProblemStatus,
        runAudit,
        setAuditDate,
        setInstitutionName,
        setWarningDays,
        saveAuditRecord,
        setBaselineRecord,
        compareWithBaseline,
        getDuplicates,
        getFileById,
        getMaterialById,
        getAuditRecordById,
        getIncrementalReportContent,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within AppProvider');
  }
  return context;
}
