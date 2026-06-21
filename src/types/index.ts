export type LicenseType = 
  | 'registration_certificate' // 注册证
  | 'business_license'        // 营业执照
  | 'medical_device_license'  // 医疗器械经营许可证
  | 'authorization_chain';    // 授权链文件

export type MaterialCategory = 
  | 'water_light_needle'   // 水光针
  | 'filler'               // 填充剂
  | 'repair_dressing'      // 修复敷料
  | 'disinfection_supply'; // 消毒耗材

export type ProblemType = 
  | 'expired'           // 已过期
  | 'expiring_soon'     // 即将到期
  | 'name_mismatch'     // 机构名称不一致
  | 'chain_missing'     // 授权链缺失
  | 'license_invalid';  // 证照无效

export type ProblemStatus = 
  | 'pending'     // 待处理
  | 'processing'  // 处理中
  | 'resolved';   // 已解决

export type FileStatus = 'pending' | 'matched' | 'reviewed';

export interface LicenseFile {
  id: string;
  name: string;
  type: LicenseType;
  fileSize: number;
  uploadTime: string;
  status: FileStatus;
  licenseNumber?: string;
  issueDate?: string;
  expiryDate?: string;
  authorizedRegion?: string;
  authorizedInstitution?: string;
  issuer?: string;
  remark?: string;
}

export interface Material {
  id: string;
  name: string;
  category: MaterialCategory;
  specification?: string;
  manufacturer?: string;
  supplier?: string;
  licenseFiles: string[];
}

export interface AuditProblem {
  id: string;
  type: ProblemType;
  severity: 'high' | 'medium' | 'low';
  fileId: string;
  materialId?: string;
  description: string;
  suggestion?: string;
  status: ProblemStatus;
  handlerOpinion?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuditRecord {
  id: string;
  date: string;
  reviewer: string;
  totalFiles: number;
  totalMaterials: number;
  problemsCount: number;
  resolvedCount: number;
  remark?: string;
}

export interface AppState {
  files: LicenseFile[];
  materials: Material[];
  problems: AuditProblem[];
  auditRecords: AuditRecord[];
  currentAuditDate: string;
  institutionName: string;
  warningDays: number;
  lastAuditRecordId?: string;
}

export const LicenseTypeLabels: Record<LicenseType, string> = {
  registration_certificate: '医疗器械注册证',
  business_license: '营业执照',
  medical_device_license: '医疗器械经营许可证',
  authorization_chain: '授权链文件',
};

export const MaterialCategoryLabels: Record<MaterialCategory, string> = {
  water_light_needle: '水光针',
  filler: '填充剂',
  repair_dressing: '修复敷料',
  disinfection_supply: '消毒耗材',
};

export const ProblemTypeLabels: Record<ProblemType, string> = {
  expired: '已过期',
  expiring_soon: '即将到期',
  name_mismatch: '机构名称不一致',
  chain_missing: '授权链缺失',
  license_invalid: '证照无效',
};

export const ProblemStatusLabels: Record<ProblemStatus, string> = {
  pending: '待处理',
  processing: '处理中',
  resolved: '已解决',
};
