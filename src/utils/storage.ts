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
  if (name.includes('注册证') || name.includes('注册')) return 'registration_certificate';
  if (name.includes('营业执照')) return 'business_license';
  if (name.includes('医疗器械') && name.includes('经营')) return 'medical_device_license';
  if (name.includes('授权') || name.includes('授权链') || name.includes('授权书')) return 'authorization_chain';
  return 'registration_certificate';
}

export function detectMaterialCategory(fileName: string): MaterialCategory | null {
  const name = fileName.toLowerCase();
  if (name.includes('水光')) return 'water_light_needle';
  if (name.includes('填充') || name.includes('玻尿酸')) return 'filler';
  if (name.includes('敷料') || name.includes('修复')) return 'repair_dressing';
  if (name.includes('消毒') || name.includes('耗材')) return 'disinfection_supply';
  return null;
}

export function checkExpiry(expiryDate: string | undefined, auditDate: string, warningDays: number): {
  status: 'normal' | 'warning' | 'expired';
  daysLeft?: number;
} {
  if (!expiryDate) return { status: 'normal' };
  
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

export function generateProblems(
  files: LicenseFile[],
  materials: Material[],
  institutionName: string,
  auditDate: string,
  warningDays: number
): AuditProblem[] {
  const problems: AuditProblem[] = [];
  
  files.forEach(file => {
    const expiryCheck = checkExpiry(file.expiryDate, auditDate, warningDays);
    
    if (expiryCheck.status === 'expired') {
      problems.push({
        id: generateId(),
        type: 'expired',
        severity: 'high',
        fileId: file.id,
        description: `${file.name} 已过期 ${Math.abs(expiryCheck.daysLeft!)} 天`,
        status: 'pending',
        createdAt: auditDate,
        updatedAt: auditDate,
      });
    } else if (expiryCheck.status === 'warning') {
      problems.push({
        id: generateId(),
        type: 'expiring_soon',
        severity: 'medium',
        fileId: file.id,
        description: `${file.name} 将在 ${expiryCheck.daysLeft} 天后到期`,
        status: 'pending',
        createdAt: auditDate,
        updatedAt: auditDate,
      });
    }
    
    if (file.authorizedInstitution && !checkInstitutionName(file.authorizedInstitution, institutionName)) {
      problems.push({
        id: generateId(),
        type: 'name_mismatch',
        severity: 'high',
        fileId: file.id,
        description: `授权机构名称不匹配：证照载明"${file.authorizedInstitution}"，本机构为"${institutionName}"`,
        status: 'pending',
        createdAt: auditDate,
        updatedAt: auditDate,
      });
    }
  });
  
  materials.forEach(material => {
    const hasAuthorizationChain = material.licenseFiles.some(fileId => {
      const file = files.find(f => f.id === fileId);
      return file?.type === 'authorization_chain';
    });
    
    if (material.licenseFiles.length > 0 && !hasAuthorizationChain) {
      problems.push({
        id: generateId(),
        type: 'chain_missing',
        severity: 'high',
        fileId: material.licenseFiles[0],
        materialId: material.id,
        description: `材料"${material.name}"授权链文件缺失`,
        status: 'pending',
        createdAt: auditDate,
        updatedAt: auditDate,
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
  return {
    id: generateId(),
    date: state.currentAuditDate,
    reviewer,
    totalFiles: state.files.length,
    totalMaterials: state.materials.length,
    problemsCount: state.problems.length,
    resolvedCount: state.problems.filter(p => p.status === 'resolved').length,
    remark,
  };
}
