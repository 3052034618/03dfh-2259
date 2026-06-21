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

export type ProblemSeverity = 'high' | 'medium' | 'low';

export type FileStatus = 'pending' | 'matched' | 'reviewed';

export type ProblemGroupType = 'new' | 'still_exists' | 'resolved' | 'still_abnormal_after_handle';

export const ProblemGroupTypeLabels: Record<ProblemGroupType, string> = {
  new: '新增问题',
  still_exists: '仍存在问题',
  resolved: '已消除问题',
  still_abnormal_after_handle: '已处理后仍异常',
};

export interface OpinionHistoryItem {
  id: string;
  status: ProblemStatus;
  opinion?: string;
  handledBy?: string;
  handledAt: string;
}

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
  batchId?: string;
  duplicateConfirmed?: boolean;
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
  severity: ProblemSeverity;
  fileId: string;
  materialId?: string;
  description: string;
  suggestion?: string;
  status: ProblemStatus;
  handlerOpinion?: string;
  createdAt: string;
  updatedAt: string;
  previousStatus?: ProblemStatus;
  previousOpinion?: string;
  lastHandledAt?: string;
  lastHandledBy?: string;
  isNewProblem?: boolean;
  handledBy?: string;
  opinionHistory?: OpinionHistoryItem[];
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
  snapshot: AuditSnapshot;
}

export interface AuditSnapshot {
  files: LicenseFile[];
  materials: Material[];
  problems: AuditProblem[];
  auditDate: string;
  institutionName: string;
  warningDays: number;
}

export type DiffType = 'added' | 'deleted' | 'modified' | 'unchanged';

export interface FileDiff {
  id: string;
  diffType: DiffType;
  fileName: string;
  changedField?: keyof LicenseFile;
  oldValue?: string;
  newValue?: string;
}

export interface MaterialDiff {
  id: string;
  diffType: DiffType;
  materialName: string;
  changedField?: keyof Material;
  oldValue?: string;
  newValue?: string;
}

export interface ProblemDiff {
  id: string;
  diffType: DiffType;
  problemType: ProblemType;
  severity: ProblemSeverity;
  description: string;
}

export interface CompareResult {
  files: FileDiff[];
  materials: MaterialDiff[];
  problems: ProblemDiff[];
  summary: {
    files: {
      added: number;
      deleted: number;
      modified: number;
      total: number;
    };
    materials: {
      added: number;
      deleted: number;
      modified: number;
      total: number;
    };
    problems: {
      added: number;
      deleted: number;
      modified: number;
      total: number;
    };
  };
}

export interface DuplicateFileInfo {
  file: LicenseFile;
  duplicateWith: string[];
  reason: 'name' | 'licenseNumber' | 'supplier';
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
  baselineRecordId?: string;
  currentBatchId?: string;
  handlerName?: string;
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

export const FileFieldLabels: Record<keyof LicenseFile, string> = {
  id: 'ID',
  name: '证照名称',
  type: '证照类型',
  fileSize: '文件大小',
  uploadTime: '上传时间',
  status: '状态',
  licenseNumber: '证照编号',
  issueDate: '签发日期',
  expiryDate: '有效期至',
  authorizedRegion: '授权区域',
  authorizedInstitution: '授权机构',
  issuer: '签发机关',
  remark: '备注',
  batchId: '导入批次',
  duplicateConfirmed: '重复确认',
};

export const MaterialFieldLabels: Record<keyof Material, string> = {
  id: 'ID',
  name: '材料名称',
  category: '分类',
  specification: '规格',
  manufacturer: '生产厂家',
  supplier: '供应商',
  licenseFiles: '关联证照',
};

export const DiffTypeLabels: Record<DiffType, string> = {
  added: '新增',
  deleted: '删除',
  modified: '变更',
  unchanged: '未变',
};
