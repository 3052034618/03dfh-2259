import dayjs from 'dayjs';
import {
  LicenseType,
  MaterialCategory,
  ProblemType,
  ProblemStatus,
  FileStatus,
  LicenseFile,
  Material,
  AuditProblem,
  AuditRecord,
  AppState,
  AuditSnapshot,
  FileDiff,
  MaterialDiff,
  ProblemDiff,
  CompareResult,
  DuplicateFileInfo,
  FileFieldLabels,
  MaterialFieldLabels,
  ProblemTypeLabels,
} from '../types';

const STORAGE_KEY = 'license_audit_assistant_state';

export const defaultState: AppState = {
  files: [],
  materials: [],
  problems: [],
  auditRecords: [],
  currentAuditDate: dayjs().format('YYYY-MM-DD'),
  institutionName: 'XX医疗美容医院',
  warningDays: 90,
};

export function loadState(): AppState {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      return { ...defaultState, ...parsed };
    }
  } catch (e) {
    console.error('加载状态失败:', e);
  }
  return defaultState;
}

export function saveState(state: AppState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.error('保存状态失败:', e);
  }
}

export function generateId(): string {
  return 'id_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 9);
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
}

export function detectLicenseType(fileName: string): LicenseType {
  const name = fileName.toLowerCase();
  
  if (name.includes('营业执照') || name.includes('工商') || name.includes('执照') || name.includes('yyzz')) {
    return 'business_license';
  }
  
  if (name.includes('经营许可证') || 
      (name.includes('医疗器械') && name.includes('经营')) ||
      name.includes('经营备案') ||
      name.includes('jyxk')) {
    return 'medical_device_license';
  }
  
  if (name.includes('授权') || name.includes('授权链') || name.includes('授权书') ||
      name.includes('委托书') || name.includes('分销') || name.includes('代理')) {
    return 'authorization_chain';
  }
  
  if (name.includes('注册证') || name.includes('注册') || 
      name.includes('备案证') || name.includes('备案') ||
      name.includes('械注') || name.includes('zcz')) {
    return 'registration_certificate';
  }
  
  if (name.includes('许可') || name.includes('证')) {
    return 'registration_certificate';
  }
  
  return 'registration_certificate';
}

export function detectMaterialCategory(fileName: string): MaterialCategory | null {
  const name = fileName.toLowerCase();
  if (name.includes('水光')) return 'water_light_needle';
  if (name.includes('填充') || name.includes('玻尿酸') || name.includes('乔雅登') || name.includes('润百颜')) return 'filler';
  if (name.includes('敷料') || name.includes('修复') || name.includes('敷尔佳')) return 'repair_dressing';
  if (name.includes('消毒') || name.includes('耗材') || name.includes('酒精') || name.includes('棉片')) return 'disinfection_supply';
  return null;
}

export function checkExpiry(expiryDate: string | undefined, auditDate: string, warningDays: number): {
  status: 'normal' | 'warning' | 'expired';
  daysLeft?: number;
} {
  if (!expiryDate || expiryDate === '长期有效') return { status: 'normal' };
  
  const expiry = dayjs(expiryDate);
  const audit = dayjs(auditDate);
  const daysLeft = expiry.diff(audit, 'day');
  
  if (daysLeft < 0) return { status: 'expired', daysLeft };
  if (daysLeft <= warningDays) return { status: 'warning', daysLeft };
  return { status: 'normal', daysLeft };
}

export function checkInstitutionName(authorizedInstitution: string | undefined, institutionName: string): boolean {
  if (!authorizedInstitution) return true;
  return authorizedInstitution.includes(institutionName) || institutionName.includes(authorizedInstitution);
}

function getProblemKey(fileId: string, type: ProblemType, materialId?: string): string {
  return `${fileId}_${type}_${materialId || 'nomaterial'}`;
}

export function generateProblems(
  files: LicenseFile[],
  materials: Material[],
  institutionName: string,
  auditDate: string,
  warningDays: number,
  existingProblems: AuditProblem[] = []
): AuditProblem[] {
  const problems: AuditProblem[] = [];
  const existingProblemMap = new Map<string, AuditProblem>();
  
  existingProblems.forEach(p => {
    const key = getProblemKey(p.fileId, p.type, p.materialId);
    existingProblemMap.set(key, p);
  });
  
  files.forEach(file => {
    const expiryCheck = checkExpiry(file.expiryDate, auditDate, warningDays);
    
    if (expiryCheck.status === 'expired') {
      const key = getProblemKey(file.id, 'expired');
      const existing = existingProblemMap.get(key);
      const newDescription = `${file.name} 已过期 ${Math.abs(expiryCheck.daysLeft!)} 天`;
      
      if (existing) {
        problems.push({
          ...existing,
          description: newDescription,
          severity: 'high',
          updatedAt: auditDate,
          previousStatus: existing.previousStatus || existing.status,
          previousOpinion: existing.previousOpinion || existing.handlerOpinion,
          lastHandledAt: existing.lastHandledAt || (existing.status !== 'pending' ? existing.updatedAt : undefined),
          isNewProblem: false,
        });
        existingProblemMap.delete(key);
      } else {
        problems.push({
          id: generateId(),
          type: 'expired',
          severity: 'high',
          fileId: file.id,
          description: newDescription,
          status: 'pending',
          createdAt: auditDate,
          updatedAt: auditDate,
          isNewProblem: true,
        });
      }
    } else if (expiryCheck.status === 'warning') {
      const key = getProblemKey(file.id, 'expiring_soon');
      const existing = existingProblemMap.get(key);
      const newDescription = `${file.name} 将在 ${expiryCheck.daysLeft} 天后到期`;
      
      if (existing) {
        problems.push({
          ...existing,
          description: newDescription,
          severity: 'medium',
          updatedAt: auditDate,
          previousStatus: existing.previousStatus || existing.status,
          previousOpinion: existing.previousOpinion || existing.handlerOpinion,
          lastHandledAt: existing.lastHandledAt || (existing.status !== 'pending' ? existing.updatedAt : undefined),
          isNewProblem: false,
        });
        existingProblemMap.delete(key);
      } else {
        problems.push({
          id: generateId(),
          type: 'expiring_soon',
          severity: 'medium',
          fileId: file.id,
          description: newDescription,
          status: 'pending',
          createdAt: auditDate,
          updatedAt: auditDate,
          isNewProblem: true,
        });
      }
    }
    
    if (file.authorizedInstitution && !checkInstitutionName(file.authorizedInstitution, institutionName)) {
      const key = getProblemKey(file.id, 'name_mismatch');
      const existing = existingProblemMap.get(key);
      const newDescription = `授权机构名称不匹配：证照载明"${file.authorizedInstitution}"，本机构为"${institutionName}"`;
      
      if (existing) {
        problems.push({
          ...existing,
          description: newDescription,
          severity: 'high',
          updatedAt: auditDate,
          previousStatus: existing.previousStatus || existing.status,
          previousOpinion: existing.previousOpinion || existing.handlerOpinion,
          lastHandledAt: existing.lastHandledAt || (existing.status !== 'pending' ? existing.updatedAt : undefined),
          isNewProblem: false,
        });
        existingProblemMap.delete(key);
      } else {
        problems.push({
          id: generateId(),
          type: 'name_mismatch',
          severity: 'high',
          fileId: file.id,
          description: newDescription,
          status: 'pending',
          createdAt: auditDate,
          updatedAt: auditDate,
          isNewProblem: true,
        });
      }
    }
  });
  
  materials.forEach(material => {
    const hasAuthorizationChain = material.licenseFiles.some(fileId => {
      const file = files.find(f => f.id === fileId);
      return file?.type === 'authorization_chain';
    });
    
    if (material.licenseFiles.length > 0 && !hasAuthorizationChain) {
      const key = getProblemKey(material.licenseFiles[0], 'chain_missing', material.id);
      const existing = existingProblemMap.get(key);
      const newDescription = `材料"${material.name}"授权链文件缺失`;
      
      if (existing) {
        problems.push({
          ...existing,
          description: newDescription,
          severity: 'high',
          updatedAt: auditDate,
          previousStatus: existing.previousStatus || existing.status,
          previousOpinion: existing.previousOpinion || existing.handlerOpinion,
          lastHandledAt: existing.lastHandledAt || (existing.status !== 'pending' ? existing.updatedAt : undefined),
          isNewProblem: false,
        });
        existingProblemMap.delete(key);
      } else {
        problems.push({
          id: generateId(),
          type: 'chain_missing',
          severity: 'high',
          fileId: material.licenseFiles[0],
          materialId: material.id,
          description: newDescription,
          status: 'pending',
          createdAt: auditDate,
          updatedAt: auditDate,
          isNewProblem: true,
        });
      }
    }
  });
  
  existingProblemMap.forEach(problem => {
    if (problem.status !== 'resolved') {
      problems.push({
        ...problem,
        status: 'resolved',
        updatedAt: auditDate,
        handlerOpinion: problem.handlerOpinion ? `${problem.handlerOpinion}（问题已消除）` : '问题已消除',
        isNewProblem: false,
      });
    }
  });
  
  return problems;
}

export function createAuditRecord(
  state: AppState,
  reviewer: string,
  remark?: string
): AuditRecord {
  const snapshot: AuditSnapshot = {
    files: JSON.parse(JSON.stringify(state.files)),
    materials: JSON.parse(JSON.stringify(state.materials)),
    problems: JSON.parse(JSON.stringify(state.problems)),
    auditDate: state.currentAuditDate,
    institutionName: state.institutionName,
    warningDays: state.warningDays,
  };
  
  return {
    id: generateId(),
    date: state.currentAuditDate,
    reviewer,
    totalFiles: state.files.length,
    totalMaterials: state.materials.length,
    problemsCount: state.problems.length,
    resolvedCount: state.problems.filter(p => p.status === 'resolved').length,
    remark,
    snapshot,
  };
}

const COMPARABLE_FIELDS: (keyof LicenseFile)[] = [
  'name', 'type', 'licenseNumber', 'issueDate', 'expiryDate',
  'authorizedRegion', 'authorizedInstitution', 'issuer', 'remark'
];

const COMPARABLE_MATERIAL_FIELDS: (keyof Material)[] = [
  'name', 'category', 'specification', 'manufacturer', 'supplier'
];

function compareFiles(currentFiles: LicenseFile[], previousFiles: LicenseFile[]): FileDiff[] {
  const diffs: FileDiff[] = [];
  const previousMap = new Map(previousFiles.map(f => [f.id, f]));
  const currentMap = new Map(currentFiles.map(f => [f.id, f]));
  
  currentFiles.forEach(current => {
    const previous = previousMap.get(current.id);
    
    if (!previous) {
      diffs.push({
        id: current.id + '_added',
        diffType: 'added',
        fileName: current.name,
      });
    } else {
      COMPARABLE_FIELDS.forEach(field => {
        const oldVal = String(previous[field] || '');
        const newVal = String(current[field] || '');
        if (oldVal !== newVal) {
          diffs.push({
            id: `${current.id}_${field}`,
            diffType: 'modified',
            fileName: current.name,
            changedField: field,
            oldValue: oldVal,
            newValue: newVal,
          });
        }
      });
    }
    
    previousMap.delete(current.id);
  });
  
  previousMap.forEach(previous => {
    diffs.push({
      id: previous.id + '_deleted',
      diffType: 'deleted',
      fileName: previous.name,
    });
  });
  
  return diffs;
}

function compareMaterials(
  currentMaterials: Material[],
  previousMaterials: Material[],
  currentFiles: LicenseFile[],
  previousFiles: LicenseFile[]
): MaterialDiff[] {
  const diffs: MaterialDiff[] = [];
  const previousMap = new Map(previousMaterials.map(m => [m.id, m]));
  const currentMap = new Map(currentMaterials.map(m => [m.id, m]));
  
  currentMaterials.forEach(current => {
    const previous = previousMap.get(current.id);
    
    if (!previous) {
      diffs.push({
        id: current.id + '_added',
        diffType: 'added',
        materialName: current.name,
      });
    } else {
      COMPARABLE_MATERIAL_FIELDS.forEach(field => {
        const oldVal = String(previous[field] || '');
        const newVal = String(current[field] || '');
        if (oldVal !== newVal) {
          diffs.push({
            id: `${current.id}_${field}`,
            diffType: 'modified',
            materialName: current.name,
            changedField: field,
            oldValue: oldVal,
            newValue: newVal,
          });
        }
      });
      
      const addedFiles = current.licenseFiles.filter(id => !previous!.licenseFiles.includes(id));
      const removedFiles = previous.licenseFiles.filter(id => !current.licenseFiles.includes(id));
      
      addedFiles.forEach(fileId => {
        const file = currentFiles.find(f => f.id === fileId);
        diffs.push({
          id: `${current.id}_file_added_${fileId}`,
          diffType: 'modified',
          materialName: current.name,
          changedField: 'licenseFiles',
          oldValue: '',
          newValue: file ? `新增关联：${file.name}` : '新增关联证照',
        });
      });
      
      removedFiles.forEach(fileId => {
        const file = previousFiles.find(f => f.id === fileId);
        diffs.push({
          id: `${current.id}_file_removed_${fileId}`,
          diffType: 'modified',
          materialName: current.name,
          changedField: 'licenseFiles',
          oldValue: file ? `移除关联：${file.name}` : '移除关联证照',
          newValue: '',
        });
      });
    }
    
    previousMap.delete(current.id);
  });
  
  previousMap.forEach(previous => {
    diffs.push({
      id: previous.id + '_deleted',
      diffType: 'deleted',
      materialName: previous.name,
    });
  });
  
  return diffs;
}

function compareProblems(currentProblems: AuditProblem[], previousProblems: AuditProblem[]): ProblemDiff[] {
  const diffs: ProblemDiff[] = [];
  const previousMap = new Map(previousProblems.map(p => [p.id, p]));
  const currentIds = new Set(currentProblems.map(p => p.id));
  
  currentProblems.forEach(current => {
    const previous = previousMap.get(current.id);
    
    if (!previous) {
      diffs.push({
        id: current.id + '_added',
        diffType: 'added',
        problemType: current.type,
        severity: current.severity,
        description: current.description,
      });
    } else {
      const hasSignificantChange = 
        current.status !== previous.status ||
        current.severity !== previous.severity ||
        current.description !== previous.description;
      
      if (hasSignificantChange) {
        diffs.push({
          id: current.id + '_modified',
          diffType: 'modified',
          problemType: current.type,
          severity: current.severity,
          description: `${previous.status !== current.status ? `状态变化：${previous.status} → ${current.status}` : ''}${current.description}`,
        });
      }
    }
    
    previousMap.delete(current.id);
  });
  
  previousMap.forEach(previous => {
    if (previous.status !== 'resolved') {
      diffs.push({
        id: previous.id + '_deleted',
        diffType: 'deleted',
        problemType: previous.type,
        severity: previous.severity,
        description: `风险已消除：${previous.description}`,
      });
    }
  });
  
  return diffs;
}

export function compareWithBaseline(
  currentState: { files: LicenseFile[]; materials: Material[]; problems: AuditProblem[] },
  baselineSnapshot: AuditSnapshot
): CompareResult {
  const fileDiffs = compareFiles(currentState.files, baselineSnapshot.files);
  const materialDiffs = compareMaterials(
    currentState.materials,
    baselineSnapshot.materials,
    currentState.files,
    baselineSnapshot.files
  );
  const problemDiffs = compareProblems(currentState.problems, baselineSnapshot.problems);
  
  const addedFiles = fileDiffs.filter(d => d.diffType === 'added').length;
  const deletedFiles = fileDiffs.filter(d => d.diffType === 'deleted').length;
  const modifiedFiles = fileDiffs.filter(d => d.diffType === 'modified').length;
  
  const addedMaterials = materialDiffs.filter(d => d.diffType === 'added').length;
  const deletedMaterials = materialDiffs.filter(d => d.diffType === 'deleted').length;
  const modifiedMaterials = materialDiffs.filter(d => d.diffType === 'modified').length;
  
  const addedProblems = problemDiffs.filter(d => d.diffType === 'added').length;
  const deletedProblems = problemDiffs.filter(d => d.diffType === 'deleted').length;
  const modifiedProblems = problemDiffs.filter(d => d.diffType === 'modified').length;
  
  const summary = {
    files: {
      added: addedFiles,
      deleted: deletedFiles,
      modified: modifiedFiles,
      total: addedFiles + deletedFiles + modifiedFiles,
    },
    materials: {
      added: addedMaterials,
      deleted: deletedMaterials,
      modified: modifiedMaterials,
      total: addedMaterials + deletedMaterials + modifiedMaterials,
    },
    problems: {
      added: addedProblems,
      deleted: deletedProblems,
      modified: modifiedProblems,
      total: addedProblems + deletedProblems + modifiedProblems,
    },
  };
  
  return { files: fileDiffs, materials: materialDiffs, problems: problemDiffs, summary };
}

export function detectDuplicates(files: LicenseFile[]): DuplicateFileInfo[] {
  const duplicates: DuplicateFileInfo[] = [];
  const nameMap = new Map<string, string[]>();
  const numberMap = new Map<string, string[]>();
  const supplierMap = new Map<string, string[]>();
  
  const pendingFiles = files.filter(f => f.duplicateConfirmed !== true);
  
  pendingFiles.forEach(file => {
    if (file.name) {
      const normalizedName = file.name.toLowerCase().trim();
      if (!nameMap.has(normalizedName)) {
        nameMap.set(normalizedName, []);
      }
      nameMap.get(normalizedName)!.push(file.id);
    }
    
    if (file.licenseNumber) {
      const normalizedNumber = file.licenseNumber.trim().toUpperCase();
      if (!numberMap.has(normalizedNumber)) {
        numberMap.set(normalizedNumber, []);
      }
      numberMap.get(normalizedNumber)!.push(file.id);
    }

    if (file.authorizedInstitution) {
      const normalizedSupplier = file.authorizedInstitution.trim().toLowerCase();
      if (!supplierMap.has(normalizedSupplier)) {
        supplierMap.set(normalizedSupplier, []);
      }
      supplierMap.get(normalizedSupplier)!.push(file.id);
    }
  });
  
  const processed = new Set<string>();
  
  nameMap.forEach((ids, name) => {
    if (ids.length > 1) {
      const sortedIds = [...ids].sort();
      const key = 'name_' + sortedIds.join('_');
      if (!processed.has(key)) {
        processed.add(key);
        sortedIds.forEach((id, idx) => {
          const file = files.find(f => f.id === id);
          if (file) {
            duplicates.push({
              file,
              duplicateWith: sortedIds.filter((_, i) => i !== idx),
              reason: 'name',
            });
          }
        });
      }
    }
  });
  
  numberMap.forEach((ids, number) => {
    if (ids.length > 1) {
      const sortedIds = [...ids].sort();
      const key = 'number_' + sortedIds.join('_');
      if (!processed.has(key)) {
        processed.add(key);
        sortedIds.forEach((id, idx) => {
          const file = files.find(f => f.id === id);
          if (file) {
            duplicates.push({
              file,
              duplicateWith: sortedIds.filter((_, i) => i !== idx),
              reason: 'licenseNumber',
            });
          }
        });
      }
    }
  });

  supplierMap.forEach((ids, supplier) => {
    if (ids.length > 1) {
      const groupedFiles = ids.map(id => files.find(f => f.id === id)).filter(Boolean) as LicenseFile[];
      const types = new Set(groupedFiles.map(f => f.type));
      if (types.size <= 1) return;
      const sortedIds = [...ids].sort();
      const key = 'supplier_' + sortedIds.join('_');
      if (!processed.has(key)) {
        processed.add(key);
        sortedIds.forEach((id, idx) => {
          const file = files.find(f => f.id === id);
          if (file) {
            duplicates.push({
              file,
              duplicateWith: sortedIds.filter((_, i) => i !== idx),
              reason: 'supplier',
            });
          }
        });
      }
    }
  });
  
  return duplicates;
}

export function getIncrementalReportContent(
  compareResult: CompareResult,
  baselineRecord: AuditRecord,
  currentAuditDate?: string
): string {
  const { files, materials, problems, summary } = compareResult;
  const lines = [];
  const auditDate = currentAuditDate || dayjs().format('YYYY-MM-DD');
  
  lines.push('='.repeat(70));
  lines.push('                    增量复核报告');
  lines.push('='.repeat(70));
  lines.push('');
  lines.push(`对比基准：${baselineRecord.date}（${baselineRecord.reviewer}）`);
  lines.push(`当前审查：${auditDate}`);
  lines.push(`生成时间：${dayjs().format('YYYY-MM-DD HH:mm:ss')}`);
  lines.push('');
  lines.push('-'.repeat(70));
  lines.push('一、变化摘要');
  lines.push('-'.repeat(70));
  lines.push('');
  lines.push('【证照文件变化】');
  lines.push(`  新增：${summary.files.added} 个`);
  lines.push(`  删除：${summary.files.deleted} 个`);
  lines.push(`  变更：${summary.files.modified} 个`);
  lines.push(`  合计：${summary.files.total} 处`);
  lines.push('');
  lines.push('【材料信息变化】');
  lines.push(`  新增：${summary.materials.added} 种`);
  lines.push(`  删除：${summary.materials.deleted} 种`);
  lines.push(`  变更：${summary.materials.modified} 种`);
  lines.push(`  合计：${summary.materials.total} 处`);
  lines.push('');
  lines.push('【问题风险变化】');
  lines.push(`  新增问题：${summary.problems.added} 个`);
  lines.push(`  已解决：${summary.problems.deleted} 个`);
  lines.push(`  状态变更：${summary.problems.modified} 个`);
  lines.push(`  合计：${summary.problems.total} 处`);
  lines.push('');
  
  if (files.length > 0) {
    lines.push('-'.repeat(70));
    lines.push('二、证照文件变化详情');
    lines.push('-'.repeat(70));
    lines.push('');
    
    files.forEach((diff, idx) => {
      const typeLabel = diff.diffType === 'added' ? '【新增】' : diff.diffType === 'deleted' ? '【删除】' : '【变更】';
      
      lines.push(`${idx + 1}. ${typeLabel} ${diff.fileName}`);
      
      if (diff.diffType === 'modified' && diff.changedField) {
        const fieldLabel = FileFieldLabels[diff.changedField] || diff.changedField;
        lines.push(`    ${fieldLabel}：`);
        lines.push(`      旧：${diff.oldValue || '(空)'}`);
        lines.push(`      新：${diff.newValue || '(空)'}`);
      }
      
      lines.push('');
    });
  }
  
  if (materials.length > 0) {
    lines.push('-'.repeat(70));
    lines.push('三、材料信息变化详情');
    lines.push('-'.repeat(70));
    lines.push('');
    
    materials.forEach((diff, idx) => {
      const typeLabel = diff.diffType === 'added' ? '【新增】' : diff.diffType === 'deleted' ? '【删除】' : '【变更】';
      
      lines.push(`${idx + 1}. ${typeLabel} ${diff.materialName}`);
      
      if (diff.diffType === 'modified' && diff.changedField) {
        const fieldLabel = MaterialFieldLabels[diff.changedField] || diff.changedField;
        lines.push(`    ${fieldLabel}：`);
        if (diff.oldValue) lines.push(`      旧：${diff.oldValue}`);
        if (diff.newValue) lines.push(`      新：${diff.newValue}`);
      }
      
      lines.push('');
    });
  }
  
  if (problems.length > 0) {
    lines.push('-'.repeat(70));
    lines.push('四、风险问题变化详情');
    lines.push('-'.repeat(70));
    lines.push('');
    
    const newProblems = problems.filter(d => d.diffType === 'added');
    const resolvedProblems = problems.filter(d => d.diffType === 'deleted');
    const modifiedProblems = problems.filter(d => d.diffType === 'modified');
    
    if (newProblems.length > 0) {
      lines.push(`【新增风险问题】(${newProblems.length} 个)`);
      newProblems.forEach((p, idx) => {
        const severityLabel = p.severity === 'high' ? '高' : p.severity === 'medium' ? '中' : '低';
        lines.push(`  ${idx + 1}. [${severityLabel}风险] ${ProblemTypeLabels[p.problemType]}`);
        lines.push(`     ${p.description}`);
      });
      lines.push('');
    }
    
    if (resolvedProblems.length > 0) {
      lines.push(`【已消除问题】(${resolvedProblems.length} 个)`);
      resolvedProblems.forEach((p, idx) => {
        lines.push(`  ${idx + 1}. ${p.description}`);
      });
      lines.push('');
    }
    
    if (modifiedProblems.length > 0) {
      lines.push(`【状态变更问题】(${modifiedProblems.length} 个)`);
      modifiedProblems.forEach((p, idx) => {
        lines.push(`  ${idx + 1}. ${p.description}`);
      });
      lines.push('');
    }
  }
  
  lines.push('='.repeat(70));
  lines.push('                        报告结束');
  lines.push('='.repeat(70));
  
  return lines.join('\n');
}
