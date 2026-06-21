import React, { useState, useMemo } from 'react';
import {
  Card,
  Button,
  Space,
  Table,
  Tag,
  Modal,
  Form,
  Input,
  Row,
  Col,
  Statistic,
  List,
  Collapse,
  Divider,
  message,
  Tooltip,
  Descriptions,
  Timeline,
  Radio,
  Drawer,
  Select,
  Alert,
  Tabs,
} from 'antd';
import {
  InboxOutlined,
  FileTextOutlined,
  ExportOutlined,
  HistoryOutlined,
  SaveOutlined,
  FileProtectOutlined,
  FileSearchOutlined,
  SafetyOutlined,
  WarningOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  ClockCircleOutlined,
  MedicineBoxOutlined,
  BankOutlined,
  CalendarOutlined,
  ReloadOutlined,
  DownloadOutlined,
  PlusOutlined,
  MinusOutlined,
  EditOutlined,
  DiffOutlined,
  BulbOutlined,
} from '@ant-design/icons';
import { useApp } from '../context/AppContext';
import {
  Material,
  MaterialCategory,
  MaterialCategoryLabels,
  LicenseTypeLabels,
  AuditRecord,
  LicenseFile,
  ProblemType,
  ProblemTypeLabels,
  CompareResult,
  DiffType,
  DiffTypeLabels,
  FileFieldLabels,
  MaterialFieldLabels,
} from '../types';
import * as XLSX from 'xlsx';
import dayjs from 'dayjs';

const { TextArea } = Input;
const { Option } = Select;
const { TabPane } = Tabs;

const ArchiveExport: React.FC = () => {
  const { state, saveAuditRecord, getFileById, getMaterialById, compareWithBaseline, setBaselineRecord, getAuditRecordById, getIncrementalReportContent } = useApp();
  const [recordModalVisible, setRecordModalVisible] = useState(false);
  const [recordForm] = Form.useForm();
  const [selectedRecord, setSelectedRecord] = useState<AuditRecord | null>(null);
  const [recordDetailVisible, setRecordDetailVisible] = useState(false);
  const [exportFormat, setExportFormat] = useState<'excel' | 'txt'>('excel');
  const [selectedBaselineId, setSelectedBaselineId] = useState<string | undefined>(state.baselineRecordId);
  const [compareResult, setCompareResult] = useState<CompareResult | null>(null);
  const [compareTab, setCompareTab] = useState<'files' | 'materials' | 'problems'>('files');

  const sortedRecords = useMemo(() => {
    return [...state.auditRecords].sort((a, b) => 
      dayjs(b.date).valueOf() - dayjs(a.date).valueOf()
    );
  }, [state.auditRecords]);

  const materialsByCategory = useMemo(() => {
    const grouped: Record<string, Material[]> = {};
    state.materials.forEach(m => {
      if (!grouped[m.category]) grouped[m.category] = [];
      grouped[m.category].push(m);
    });
    return grouped;
  }, [state.materials]);

  const resolvedProblems = state.problems.filter(p => p.status === 'resolved');
  const unresolvedProblems = state.problems.filter(p => p.status !== 'resolved');

  const handleSaveRecord = () => {
    setRecordModalVisible(true);
  };

  const handleRecordSubmit = async () => {
    try {
      const values = await recordForm.validateFields();
      const record = saveAuditRecord(values.reviewer, values.remark);
      setRecordModalVisible(false);
      recordForm.resetFields();
      message.success('审查记录已保存');
    } catch (e) {
      console.error(e);
    }
  };

  const handleViewRecord = (record: AuditRecord) => {
    setSelectedRecord(record);
    setRecordDetailVisible(true);
  };

  const generateReportContent = () => {
    const lines = [];
    lines.push('='.repeat(60));
    lines.push('            医美机构证照审查报告');
    lines.push('='.repeat(60));
    lines.push('');
    lines.push(`审查机构：${state.institutionName}`);
    lines.push(`审查日期：${state.currentAuditDate}`);
    lines.push(`审查人员：合规专员`);
    lines.push('');
    lines.push('-'.repeat(60));
    lines.push('一、审查概况');
    lines.push('-'.repeat(60));
    lines.push(`证照文件总数：${state.files.length} 份`);
    lines.push(`材料总数：${state.materials.length} 种`);
    lines.push(`发现问题总数：${state.problems.length} 个`);
    lines.push(`已解决问题：${resolvedProblems.length} 个`);
    lines.push(`未解决问题：${unresolvedProblems.length} 个`);
    lines.push('');

    lines.push('-'.repeat(60));
    lines.push('二、材料证照包目录');
    lines.push('-'.repeat(60));
    
    Object.entries(materialsByCategory).forEach(([category, materials]) => {
      lines.push('');
      lines.push(`【${MaterialCategoryLabels[category as MaterialCategory]}】`);
      materials.forEach((material, idx) => {
        lines.push(`  ${idx + 1}. ${material.name}`);
        lines.push(`     规格：${material.specification || '-'}`);
        lines.push(`     生产厂家：${material.manufacturer || '-'}`);
        lines.push(`     供应商：${material.supplier || '-'}`);
        lines.push(`     关联证照（${material.licenseFiles.length}份）：`);
        material.licenseFiles.forEach(fileId => {
          const file = getFileById(fileId);
          if (file) {
            lines.push(`       - ${LicenseTypeLabels[file.type]}：${file.name}`);
            lines.push(`         编号：${file.licenseNumber || '未填写'}`);
            lines.push(`         有效期：${file.expiryDate || '未填写'}`);
          }
        });
      });
    });

    lines.push('');
    lines.push('-'.repeat(60));
    lines.push('三、问题清单');
    lines.push('-'.repeat(60));
    
    if (state.problems.length > 0) {
      state.problems.forEach((problem, idx) => {
        const file = getFileById(problem.fileId);
        lines.push('');
        lines.push(`${idx + 1}. [${problem.severity === 'high' ? '高风险' : problem.severity === 'medium' ? '中风险' : '低风险'}] ${ProblemTypeLabels[problem.type]}`);
        lines.push(`   状态：${problem.status === 'resolved' ? '已解决' : problem.status === 'processing' ? '处理中' : '待处理'}`);
        lines.push(`   描述：${problem.description}`);
        if (file) {
          lines.push(`   关联证照：${file.name}`);
        }
        if (problem.handlerOpinion) {
          lines.push(`   处理意见：${problem.handlerOpinion}`);
        }
      });
    } else {
      lines.push('');
      lines.push('  本次审查未发现问题。');
    }

    lines.push('');
    lines.push('-'.repeat(60));
    lines.push('四、审查结论');
    lines.push('-'.repeat(60));
    lines.push('');
    
    if (unresolvedProblems.length === 0) {
      lines.push('  本次审查通过，所有证照齐全且在有效期内。');
    } else {
      const highCount = unresolvedProblems.filter(p => p.severity === 'high').length;
      lines.push(`  本次审查发现 ${unresolvedProblems.length} 个待处理问题，其中高风险 ${highCount} 个。`);
      lines.push('  建议相关部门及时整改，整改完成后重新审查。');
    }
    
    lines.push('');
    lines.push('='.repeat(60));
    lines.push(`                  报告生成时间：${dayjs().format('YYYY-MM-DD HH:mm:ss')}`);
    lines.push('='.repeat(60));

    return lines.join('\n');
  };

  const handleExportReport = () => {
    const content = generateReportContent();
    
    if (exportFormat === 'txt') {
      const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `证照审查报告_${state.currentAuditDate}.txt`;
      a.click();
      URL.revokeObjectURL(url);
      message.success('报告已导出');
    } else {
      const wb = XLSX.utils.book_new();
      
      const summaryData = [
        ['证照审查报告'],
        [`审查机构：${state.institutionName}`],
        [`审查日期：${state.currentAuditDate}`],
        [],
        ['项目', '数量'],
        ['证照文件总数', state.files.length],
        ['材料总数', state.materials.length],
        ['问题总数', state.problems.length],
        ['已解决', resolvedProblems.length],
        ['未解决', unresolvedProblems.length],
      ];
      const ws1 = XLSX.utils.aoa_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(wb, ws1, '审查概况');

      const materialData = [
        ['材料名称', '分类', '规格', '生产厂家', '供应商', '关联证照数'],
        ...state.materials.map(m => [
          m.name,
          MaterialCategoryLabels[m.category],
          m.specification || '',
          m.manufacturer || '',
          m.supplier || '',
          m.licenseFiles.length,
        ]),
      ];
      const ws2 = XLSX.utils.aoa_to_sheet(materialData);
      XLSX.utils.book_append_sheet(wb, ws2, '材料清单');

      const problemData = [
        ['问题类型', '风险等级', '状态', '描述', '关联证照', '发现日期', '处理意见'],
        ...state.problems.map(p => [
          ProblemTypeLabels[p.type],
          p.severity === 'high' ? '高风险' : p.severity === 'medium' ? '中风险' : '低风险',
          p.status === 'resolved' ? '已解决' : p.status === 'processing' ? '处理中' : '待处理',
          p.description,
          getFileById(p.fileId)?.name || '',
          p.createdAt,
          p.handlerOpinion || '',
        ]),
      ];
      const ws3 = XLSX.utils.aoa_to_sheet(problemData);
      XLSX.utils.book_append_sheet(wb, ws3, '问题清单');

      const fileData = [
        ['证照名称', '类型', '编号', '有效期至', '签发机关', '授权机构', '状态'],
        ...state.files.map(f => [
          f.name,
          LicenseTypeLabels[f.type],
          f.licenseNumber || '',
          f.expiryDate || '',
          f.issuer || '',
          f.authorizedInstitution || '',
          f.status === 'reviewed' ? '已审核' : f.status === 'matched' ? '已匹配' : '待处理',
        ]),
      ];
      const ws4 = XLSX.utils.aoa_to_sheet(fileData);
      XLSX.utils.book_append_sheet(wb, ws4, '证照文件');

      XLSX.writeFile(wb, `证照审查报告_${state.currentAuditDate}.xlsx`);
      message.success('Excel报告已导出');
    }
  };

  const handleExportCatalog = () => {
    const wb = XLSX.utils.book_new();

    Object.entries(materialsByCategory).forEach(([category, materials]) => {
      const sheetName = MaterialCategoryLabels[category as MaterialCategory];
      const data: any[][] = [
        ['序号', '材料名称', '规格', '生产厂家', '供应商', '证照类型', '证照名称', '证照编号', '有效期至'],
      ];
      
      materials.forEach((material, mIdx) => {
        if (material.licenseFiles.length === 0) {
          data.push([mIdx + 1, material.name, material.specification || '', material.manufacturer || '', material.supplier || '', '', '', '', '']);
        } else {
          material.licenseFiles.forEach((fileId, fIdx) => {
            const file = getFileById(fileId);
            data.push([
              fIdx === 0 ? mIdx + 1 : '',
              fIdx === 0 ? material.name : '',
              fIdx === 0 ? material.specification || '' : '',
              fIdx === 0 ? material.manufacturer || '' : '',
              fIdx === 0 ? material.supplier || '' : '',
              file ? LicenseTypeLabels[file.type] : '',
              file ? file.name : '',
              file ? file.licenseNumber || '' : '',
              file ? file.expiryDate || '' : '',
            ]);
          });
        }
      });

      const ws = XLSX.utils.aoa_to_sheet(data);
      XLSX.utils.book_append_sheet(wb, ws, sheetName);
    });

    XLSX.writeFile(wb, `材料证照包目录_${state.currentAuditDate}.xlsx`);
    message.success('证照包目录已导出');
  };

  const handleBaselineChange = (recordId: string | undefined) => {
    setSelectedBaselineId(recordId);
    if (recordId) {
      setBaselineRecord(recordId);
    }
  };

  const handleCompare = () => {
    if (!selectedBaselineId) {
      message.warning('请先选择对比基准');
      return;
    }
    const result = compareWithBaseline(selectedBaselineId);
    setCompareResult(result);
    message.success('对比完成');
  };

  const handleExportIncrementalReport = () => {
    if (!compareResult) {
      message.warning('请先执行对比');
      return;
    }

    const baselineRecord = getAuditRecordById(selectedBaselineId!);
    if (!baselineRecord) {
      message.error('找不到对比基准记录');
      return;
    }

    if (exportFormat === 'txt') {
      const content = getIncrementalReportContent(compareResult, baselineRecord);
      const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `增量复核报告_${state.currentAuditDate}.txt`;
      a.click();
      URL.revokeObjectURL(url);
      message.success('增量复核报告已导出');
    } else {
      const wb = XLSX.utils.book_new();

      const summaryData: any[][] = [
        ['增量复核报告'],
        [`对比基准：${baselineRecord.date}（${baselineRecord.reviewer}）`],
        [`当前审查：${state.currentAuditDate}`],
        [],
        ['项目', '新增', '删除', '修改', '总计变化'],
        ['证照文件', compareResult.summary.files.added, compareResult.summary.files.deleted, compareResult.summary.files.modified, compareResult.summary.files.total],
        ['材料', compareResult.summary.materials.added, compareResult.summary.materials.deleted, compareResult.summary.materials.modified, compareResult.summary.materials.total],
        ['问题风险', compareResult.summary.problems.added, compareResult.summary.problems.deleted, compareResult.summary.problems.modified, compareResult.summary.problems.total],
      ];
      const ws1 = XLSX.utils.aoa_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(wb, ws1, '复核摘要');

      if (compareResult.files.length > 0) {
        const fileData: any[][] = [
          ['变化类型', '证照名称', '变化字段', '原值', '新值'],
          ...compareResult.files.map(d => [
            DiffTypeLabels[d.diffType],
            d.fileName,
            d.changedField ? FileFieldLabels[d.changedField] || d.changedField : '-',
            d.oldValue || '-',
            d.newValue || '-',
          ]),
        ];
        const ws2 = XLSX.utils.aoa_to_sheet(fileData);
        XLSX.utils.book_append_sheet(wb, ws2, '证照变化');
      }

      if (compareResult.materials.length > 0) {
        const materialData: any[][] = [
          ['变化类型', '材料名称', '变化字段', '原值', '新值'],
          ...compareResult.materials.map(d => [
            DiffTypeLabels[d.diffType],
            d.materialName,
            d.changedField ? MaterialFieldLabels[d.changedField] || d.changedField : '-',
            d.oldValue || '-',
            d.newValue || '-',
          ]),
        ];
        const ws3 = XLSX.utils.aoa_to_sheet(materialData);
        XLSX.utils.book_append_sheet(wb, ws3, '材料变化');
      }

      if (compareResult.problems.length > 0) {
        const problemData: any[][] = [
          ['变化类型', '问题类型', '风险等级', '描述'],
          ...compareResult.problems.map(d => [
            DiffTypeLabels[d.diffType],
            ProblemTypeLabels[d.problemType],
            d.severity === 'high' ? '高风险' : d.severity === 'medium' ? '中风险' : '低风险',
            d.description,
          ]),
        ];
        const ws4 = XLSX.utils.aoa_to_sheet(problemData);
        XLSX.utils.book_append_sheet(wb, ws4, '风险变化');
      }

      XLSX.writeFile(wb, `增量复核报告_${state.currentAuditDate}.xlsx`);
      message.success('增量复核报告已导出');
    }
  };

  const getDiffIcon = (diffType: DiffType) => {
    switch (diffType) {
      case 'added':
        return <PlusOutlined style={{ color: '#52c41a' }} />;
      case 'deleted':
        return <MinusOutlined style={{ color: '#ff4d4f' }} />;
      case 'modified':
        return <EditOutlined style={{ color: '#faad14' }} />;
      default:
        return null;
    }
  };

  const getDiffColor = (diffType: DiffType) => {
    switch (diffType) {
      case 'added':
        return 'green';
      case 'deleted':
        return 'red';
      case 'modified':
        return 'orange';
      default:
        return 'default';
    }
  };

  const recordColumns = [
    {
      title: '审查日期',
      dataIndex: 'date',
      key: 'date',
      width: 130,
    },
    {
      title: '审查人员',
      dataIndex: 'reviewer',
      key: 'reviewer',
      width: 120,
    },
    {
      title: '文件数',
      dataIndex: 'totalFiles',
      key: 'totalFiles',
      width: 80,
      render: (v: number) => <Tag color="blue">{v}</Tag>,
    },
    {
      title: '材料数',
      dataIndex: 'totalMaterials',
      key: 'totalMaterials',
      width: 80,
      render: (v: number) => <Tag color="purple">{v}</Tag>,
    },
    {
      title: '问题数',
      dataIndex: 'problemsCount',
      key: 'problemsCount',
      width: 80,
      render: (v: number) => v > 0 ? <Tag color="red">{v}</Tag> : <Tag color="green">{v}</Tag>,
    },
    {
      title: '已解决',
      dataIndex: 'resolvedCount',
      key: 'resolvedCount',
      width: 80,
      render: (v: number) => <Tag color="green">{v}</Tag>,
    },
    {
      title: '备注',
      dataIndex: 'remark',
      key: 'remark',
      ellipsis: true,
      render: (v?: string) => v || '-',
    },
    {
      title: '操作',
      key: 'action',
      width: 150,
      render: (_: any, record: AuditRecord) => (
        <Space size={4}>
          <Button type="link" size="small" onClick={() => handleViewRecord(record)}>
            查看
          </Button>
          <Button
            size="small"
            onClick={() => {
              handleBaselineChange(record.id);
              message.success('已设为对比基准');
            }}
            style={{ 
              color: selectedBaselineId === record.id ? '#1890ff' : undefined,
              fontWeight: selectedBaselineId === record.id ? 600 : undefined
            }}
          >
            {selectedBaselineId === record.id ? '✓ 基准' : '设为基准'}
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: '16px 0' }}>
      <Row gutter={16}>
        <Col span={16}>
          <Card
            style={{ background: '#1e293b', border: '1px solid #334155', marginBottom: 16 }}
            title={
              <Space>
                <FileProtectOutlined style={{ color: '#60a5fa' }} />
                <span>材料证照包目录</span>
              </Space>
            }
            extra={
              <Button
                type="primary"
                icon={<ExportOutlined />}
                onClick={handleExportCatalog}
                size="small"
              >
                导出目录
              </Button>
            }
          >
            <Collapse
              items={Object.entries(materialsByCategory).map(([category, materials]) => ({
                key: category,
                label: (
                  <Space>
                    {category === 'water_light_needle' && <MedicineBoxOutlined style={{ color: '#06b6d4' }} />}
                    {category === 'filler' && <MedicineBoxOutlined style={{ color: '#a855f7' }} />}
                    {category === 'repair_dressing' && <MedicineBoxOutlined style={{ color: '#22c55e' }} />}
                    {category === 'disinfection_supply' && <MedicineBoxOutlined style={{ color: '#f97316' }} />}
                    <span>{MaterialCategoryLabels[category as MaterialCategory]}</span>
                    <Tag color="blue">{materials.length} 种</Tag>
                  </Space>
                ),
                children: (
                  <Table
                    size="small"
                    dataSource={materials}
                    rowKey="id"
                    pagination={false}
                    columns={[
                      { title: '材料名称', dataIndex: 'name', key: 'name', width: 220 },
                      { title: '规格', dataIndex: 'specification', key: 'specification', width: 120 },
                      { title: '生产厂家', dataIndex: 'manufacturer', key: 'manufacturer', width: 200 },
                      { title: '供应商', dataIndex: 'supplier', key: 'supplier', width: 160 },
                      {
                        title: '证照文件',
                        dataIndex: 'licenseFiles',
                        key: 'licenseFiles',
                        render: (files: string[]) => (
                          <Tag color={files.length > 0 ? 'green' : 'orange'}>
                            {files.length} 份
                          </Tag>
                        ),
                      },
                    ]}
                  />
                ),
              }))}
              defaultActiveKey={Object.keys(materialsByCategory)}
            />
          </Card>

          <Card
            style={{ background: '#1e293b', border: '1px solid #334155' }}
            title={
              <Space>
                <FileSearchOutlined style={{ color: '#faad14' }} />
                <span>质控检查报告</span>
              </Space>
            }
            extra={
              <Space>
                <Radio.Group
                  size="small"
                  value={exportFormat}
                  onChange={e => setExportFormat(e.target.value)}
                  optionType="button"
                  buttonStyle="solid"
                >
                  <Radio.Button value="excel">Excel</Radio.Button>
                  <Radio.Button value="txt">TXT</Radio.Button>
                </Radio.Group>
                <Button
                  type="primary"
                  icon={<DownloadOutlined />}
                  onClick={handleExportReport}
                  size="small"
                >
                  导出报告
                </Button>
              </Space>
            }
          >
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={8}>
                <Card size="small" style={{ background: '#0f172a', textAlign: 'center' }}>
                  <SafetyOutlined style={{ fontSize: 28, color: '#52c41a' }} />
                  <div style={{ marginTop: 8, fontSize: 20, fontWeight: 600, color: '#52c41a' }}>
                    {state.files.length}
                  </div>
                  <div style={{ color: '#64748b', fontSize: 12 }}>证照文件</div>
                </Card>
              </Col>
              <Col span={8}>
                <Card size="small" style={{ background: '#0f172a', textAlign: 'center' }}>
                  <MedicineBoxOutlined style={{ fontSize: 28, color: '#60a5fa' }} />
                  <div style={{ marginTop: 8, fontSize: 20, fontWeight: 600, color: '#60a5fa' }}>
                    {state.materials.length}
                  </div>
                  <div style={{ color: '#64748b', fontSize: 12 }}>材料种类</div>
                </Card>
              </Col>
              <Col span={8}>
                <Card size="small" style={{ background: '#0f172a', textAlign: 'center' }}>
                  <WarningOutlined style={{ fontSize: 28, color: '#faad14' }} />
                  <div style={{ marginTop: 8, fontSize: 20, fontWeight: 600, color: '#faad14' }}>
                    {state.problems.length}
                  </div>
                  <div style={{ color: '#64748b', fontSize: 12 }}>发现问题</div>
                </Card>
              </Col>
            </Row>

            <Divider style={{ borderColor: '#334155', margin: '12px 0' }} />

            <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 8 }}>
              审查机构：{state.institutionName}
            </div>
            <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 12 }}>
              审查日期：{state.currentAuditDate}
            </div>

            <div style={{ padding: 12, background: '#0f172a', borderRadius: 4, border: '1px solid #334155' }}>
              <div style={{ color: '#e2e8f0', fontSize: 13, lineHeight: 1.8 }}>
                {unresolvedProblems.length === 0 ? (
                  <div>
                    <CheckCircleOutlined style={{ color: '#52c41a' }} /> 本次审查通过，所有证照齐全且在有效期内。
                  </div>
                ) : (
                  <div>
                    <ExclamationCircleOutlined style={{ color: '#faad14' }} /> 本次审查发现{' '}
                    <span style={{ color: '#faad14', fontWeight: 600 }}>{unresolvedProblems.length}</span>{' '}
                    个待处理问题，其中高风险{' '}
                    <span style={{ color: '#ff4d4f', fontWeight: 600 }}>
                      {unresolvedProblems.filter(p => p.severity === 'high').length}
                    </span>{' '}
                    个。建议相关部门及时整改。
                  </div>
                )}
              </div>
            </div>
          </Card>
        </Col>

        <Col span={8}>
          <Card
            style={{ background: '#1e293b', border: '1px solid #334155', marginBottom: 16 }}
            title={
              <Space>
                <DiffOutlined style={{ color: '#f97316' }} />
                <span>增量复核</span>
              </Space>
            }
            extra={
              <Space>
                <Radio.Group
                  size="small"
                  value={exportFormat}
                  onChange={e => setExportFormat(e.target.value)}
                  optionType="button"
                  buttonStyle="solid"
                >
                  <Radio.Button value="excel">Excel</Radio.Button>
                  <Radio.Button value="txt">TXT</Radio.Button>
                </Radio.Group>
              </Space>
            }
          >
            <div style={{ fontSize: 12, color: '#64748b', marginBottom: 12 }}>
              选择历史审查记录作为对比基准，自动识别新增、删除和变化的内容
            </div>

            <Space style={{ width: '100%', marginBottom: 12 }} direction="vertical">
              <Select
                placeholder="选择对比基准（历史审查记录）"
                style={{ width: '100%' }}
                value={selectedBaselineId}
                onChange={handleBaselineChange}
                allowClear
                size="small"
              >
                {sortedRecords.map(record => (
                  <Option key={record.id} value={record.id}>
                    {record.date} - {record.reviewer}
                    {record.id === state.baselineRecordId && ' (当前基准)'}
                  </Option>
                ))}
              </Select>

              <Space>
                <Button
                  type="primary"
                  size="small"
                  icon={<DiffOutlined />}
                  onClick={handleCompare}
                  disabled={!selectedBaselineId}
                >
                  执行对比
                </Button>
                <Button
                  size="small"
                  icon={<ExportOutlined />}
                  onClick={handleExportIncrementalReport}
                  disabled={!compareResult}
                >
                  导出增量报告
                </Button>
              </Space>
            </Space>

            {compareResult && (
              <>
                <Divider style={{ borderColor: '#334155', margin: '12px 0' }} />

                <Alert
                  message={
                    <Space>
                      <BulbOutlined />
                      <span>
                        对比完成！共发现 {compareResult.summary.files.total + compareResult.summary.materials.total + compareResult.summary.problems.total} 处变化
                      </span>
                    </Space>
                  }
                  type="info"
                  showIcon
                  style={{ marginBottom: 12, background: '#0c4a6e30', border: '1px solid #0369a150' }}
                />

                <Row gutter={8} style={{ marginBottom: 12 }}>
                  <Col span={8}>
                    <Card size="small" style={{ background: '#0f172a', textAlign: 'center' }}>
                      <div style={{ fontSize: 18, fontWeight: 600, color: '#60a5fa' }}>
                        {compareResult.summary.files.total}
                      </div>
                      <div style={{ color: '#64748b', fontSize: 11 }}>证照变化</div>
                      <div style={{ fontSize: 10, marginTop: 2 }}>
                        <span style={{ color: '#52c41a' }}>+{compareResult.summary.files.added}</span>
                        {' / '}
                        <span style={{ color: '#ff4d4f' }}>-{compareResult.summary.files.deleted}</span>
                        {' / '}
                        <span style={{ color: '#faad14' }}>~{compareResult.summary.files.modified}</span>
                      </div>
                    </Card>
                  </Col>
                  <Col span={8}>
                    <Card size="small" style={{ background: '#0f172a', textAlign: 'center' }}>
                      <div style={{ fontSize: 18, fontWeight: 600, color: '#a855f7' }}>
                        {compareResult.summary.materials.total}
                      </div>
                      <div style={{ color: '#64748b', fontSize: 11 }}>材料变化</div>
                      <div style={{ fontSize: 10, marginTop: 2 }}>
                        <span style={{ color: '#52c41a' }}>+{compareResult.summary.materials.added}</span>
                        {' / '}
                        <span style={{ color: '#ff4d4f' }}>-{compareResult.summary.materials.deleted}</span>
                        {' / '}
                        <span style={{ color: '#faad14' }}>~{compareResult.summary.materials.modified}</span>
                      </div>
                    </Card>
                  </Col>
                  <Col span={8}>
                    <Card size="small" style={{ background: '#0f172a', textAlign: 'center' }}>
                      <div style={{ fontSize: 18, fontWeight: 600, color: '#f97316' }}>
                        {compareResult.summary.problems.total}
                      </div>
                      <div style={{ color: '#64748b', fontSize: 11 }}>风险变化</div>
                      <div style={{ fontSize: 10, marginTop: 2 }}>
                        <span style={{ color: '#52c41a' }}>+{compareResult.summary.problems.added}</span>
                        {' / '}
                        <span style={{ color: '#ff4d4f' }}>-{compareResult.summary.problems.deleted}</span>
                        {' / '}
                        <span style={{ color: '#faad14' }}>~{compareResult.summary.problems.modified}</span>
                      </div>
                    </Card>
                  </Col>
                </Row>

                <Tabs
                  activeKey={compareTab}
                  onChange={(key) => setCompareTab(key as any)}
                  size="small"
                  style={{ marginTop: 8 }}
                >
                  <TabPane
                    tab={
                      <Space size={4}>
                        <span>证照变化</span>
                        <Tag color="blue" style={{ fontSize: 10, padding: '0 4px' }}>
                          {compareResult.files.length}
                        </Tag>
                      </Space>
                    }
                    key="files"
                  >
                    {compareResult.files.length > 0 ? (
                      <List
                        size="small"
                        dataSource={compareResult.files}
                        renderItem={(item) => (
                          <List.Item
                            style={{
                              padding: '8px 12px',
                              marginBottom: 4,
                              background: item.diffType === 'added' ? '#064e3b30' : item.diffType === 'deleted' ? '#450a0a30' : '#78350f30',
                              borderRadius: 4,
                              border: `1px solid ${item.diffType === 'added' ? '#065f4650' : item.diffType === 'deleted' ? '#7f1d1d50' : '#92400e50'}`,
                            }}
                          >
                            <div style={{ width: '100%' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                                <Space>
                                  {getDiffIcon(item.diffType)}
                                  <Tag color={getDiffColor(item.diffType)} style={{ fontSize: 10 }}>
                                    {DiffTypeLabels[item.diffType]}
                                  </Tag>
                                  <span style={{ fontWeight: 500, fontSize: 12 }}>{item.fileName}</span>
                                </Space>
                              </div>
                              {item.changedField && (
                                <div style={{ fontSize: 11, color: '#94a3b8' }}>
                                  <span style={{ color: '#64748b' }}>
                                    {FileFieldLabels[item.changedField] || item.changedField}：
                                  </span>
                                  {item.oldValue && (
                                    <span style={{ textDecoration: 'line-through', color: '#f87171', marginRight: 8 }}>
                                      {item.oldValue}
                                    </span>
                                  )}
                                  {item.newValue && (
                                    <span style={{ color: '#4ade80' }}>
                                      → {item.newValue}
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          </List.Item>
                        )}
                      />
                    ) : (
                      <div style={{ textAlign: 'center', color: '#64748b', padding: '20px 0', fontSize: 12 }}>
                        证照文件无变化
                      </div>
                    )}
                  </TabPane>

                  <TabPane
                    tab={
                      <Space size={4}>
                        <span>材料变化</span>
                        <Tag color="purple" style={{ fontSize: 10, padding: '0 4px' }}>
                          {compareResult.materials.length}
                        </Tag>
                      </Space>
                    }
                    key="materials"
                  >
                    {compareResult.materials.length > 0 ? (
                      <List
                        size="small"
                        dataSource={compareResult.materials}
                        renderItem={(item) => (
                          <List.Item
                            style={{
                              padding: '8px 12px',
                              marginBottom: 4,
                              background: item.diffType === 'added' ? '#064e3b30' : item.diffType === 'deleted' ? '#450a0a30' : '#78350f30',
                              borderRadius: 4,
                              border: `1px solid ${item.diffType === 'added' ? '#065f4650' : item.diffType === 'deleted' ? '#7f1d1d50' : '#92400e50'}`,
                            }}
                          >
                            <div style={{ width: '100%' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                                <Space>
                                  {getDiffIcon(item.diffType)}
                                  <Tag color={getDiffColor(item.diffType)} style={{ fontSize: 10 }}>
                                    {DiffTypeLabels[item.diffType]}
                                  </Tag>
                                  <span style={{ fontWeight: 500, fontSize: 12 }}>{item.materialName}</span>
                                </Space>
                              </div>
                              {item.changedField && (
                                <div style={{ fontSize: 11, color: '#94a3b8' }}>
                                  <span style={{ color: '#64748b' }}>
                                    {MaterialFieldLabels[item.changedField] || item.changedField}：
                                  </span>
                                  {item.oldValue && (
                                    <span style={{ textDecoration: 'line-through', color: '#f87171', marginRight: 8 }}>
                                      {item.oldValue}
                                    </span>
                                  )}
                                  {item.newValue && (
                                    <span style={{ color: '#4ade80' }}>
                                      → {item.newValue}
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          </List.Item>
                        )}
                      />
                    ) : (
                      <div style={{ textAlign: 'center', color: '#64748b', padding: '20px 0', fontSize: 12 }}>
                        材料无变化
                      </div>
                    )}
                  </TabPane>

                  <TabPane
                    tab={
                      <Space size={4}>
                        <span>风险变化</span>
                        <Tag color="orange" style={{ fontSize: 10, padding: '0 4px' }}>
                          {compareResult.problems.length}
                        </Tag>
                      </Space>
                    }
                    key="problems"
                  >
                    {compareResult.problems.length > 0 ? (
                      <List
                        size="small"
                        dataSource={compareResult.problems}
                        renderItem={(item) => (
                          <List.Item
                            style={{
                              padding: '8px 12px',
                              marginBottom: 4,
                              background: item.diffType === 'added' ? '#064e3b30' : item.diffType === 'deleted' ? '#450a0a30' : '#78350f30',
                              borderRadius: 4,
                              border: `1px solid ${item.diffType === 'added' ? '#065f4650' : item.diffType === 'deleted' ? '#7f1d1d50' : '#92400e50'}`,
                            }}
                          >
                            <div style={{ width: '100%' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                                <Space>
                                  {getDiffIcon(item.diffType)}
                                  <Tag color={getDiffColor(item.diffType)} style={{ fontSize: 10 }}>
                                    {DiffTypeLabels[item.diffType]}
                                  </Tag>
                                  <Tag
                                    color={item.severity === 'high' ? 'red' : item.severity === 'medium' ? 'orange' : 'blue'}
                                    style={{ fontSize: 10 }}
                                  >
                                    {item.severity === 'high' ? '高风险' : item.severity === 'medium' ? '中风险' : '低风险'}
                                  </Tag>
                                  <span style={{ fontWeight: 500, fontSize: 12 }}>
                                    {ProblemTypeLabels[item.problemType]}
                                  </span>
                                </Space>
                              </div>
                              <div style={{ fontSize: 11, color: '#94a3b8' }}>
                                {item.description}
                              </div>
                            </div>
                          </List.Item>
                        )}
                      />
                    ) : (
                      <div style={{ textAlign: 'center', color: '#64748b', padding: '20px 0', fontSize: 12 }}>
                        问题风险无变化
                      </div>
                    )}
                  </TabPane>
                </Tabs>
              </>
            )}

            {!compareResult && sortedRecords.length === 0 && (
              <div style={{ textAlign: 'center', color: '#64748b', padding: '20px 0', fontSize: 12 }}>
                <HistoryOutlined style={{ fontSize: 24, marginBottom: 8 }} />
                <div>暂无历史记录可对比</div>
                <div style={{ marginTop: 4 }}>请先保存一条审查记录</div>
              </div>
            )}

            {!compareResult && sortedRecords.length > 0 && (
              <div style={{ textAlign: 'center', color: '#64748b', padding: '20px 0', fontSize: 12 }}>
                <DiffOutlined style={{ fontSize: 24, marginBottom: 8 }} />
                <div>选择基准并点击"执行对比"查看差异</div>
              </div>
            )}
          </Card>

          <Card
            style={{ background: '#1e293b', border: '1px solid #334155', marginBottom: 16 }}
            title={
              <Space>
                <SaveOutlined style={{ color: '#52c41a' }} />
                <span>保存审查记录</span>
              </Space>
            }
            extra={
              <Button type="primary" size="small" icon={<SaveOutlined />} onClick={handleSaveRecord}>
                保存记录
              </Button>
            }
          >
            <div style={{ fontSize: 12, color: '#64748b', marginBottom: 12 }}>
              将当前审查状态保存为历史记录，方便下次核对新增和变化部分
            </div>
            <Descriptions size="small" column={2} labelStyle={{ color: '#64748b' }}>
              <Descriptions.Item label="文件数">{state.files.length}</Descriptions.Item>
              <Descriptions.Item label="材料数">{state.materials.length}</Descriptions.Item>
              <Descriptions.Item label="问题数">{state.problems.length}</Descriptions.Item>
              <Descriptions.Item label="已解决">{resolvedProblems.length}</Descriptions.Item>
            </Descriptions>
          </Card>

          <Card
            style={{ background: '#1e293b', border: '1px solid #334155' }}
            title={
              <Space>
                <HistoryOutlined style={{ color: '#909399' }} />
                <span>历史审查记录</span>
              </Space>
            }
            extra={<Tag color="blue">{state.auditRecords.length} 条</Tag>}
          >
            {sortedRecords.length > 0 ? (
              <Timeline
                items={sortedRecords.slice(0, 6).map(record => ({
                  color: record.problemsCount > record.resolvedCount ? 'orange' : 'green',
                  children: (
                    <div style={{ paddingBottom: 8 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontWeight: 500 }}>{record.date}</span>
                        <Button type="link" size="small" onClick={() => handleViewRecord(record)}>
                          查看
                        </Button>
                      </div>
                      <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>
                        审查人：{record.reviewer}
                      </div>
                      <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                        <Space size={8}>
                          <span>📄 {record.totalFiles} 文件</span>
                          <span>🧪 {record.totalMaterials} 材料</span>
                          <span>
                            ⚠️ {record.problemsCount} 问题
                            ({record.resolvedCount} 已解决)
                          </span>
                        </Space>
                      </div>
                      {record.remark && (
                        <div style={{ fontSize: 12, color: '#64748b', marginTop: 4, fontStyle: 'italic' }}>
                          备注：{record.remark}
                        </div>
                      )}
                    </div>
                  ),
                }))}
              />
            ) : (
              <div style={{ textAlign: 'center', color: '#64748b', padding: '30px 0' }}>
                <HistoryOutlined style={{ fontSize: 32, marginBottom: 8 }} />
                <div>暂无历史记录</div>
                <div style={{ fontSize: 12, marginTop: 4 }}>保存当前审查以创建第一条记录</div>
              </div>
            )}
          </Card>
        </Col>
      </Row>

      <Modal
        title="保存审查记录"
        open={recordModalVisible}
        onOk={handleRecordSubmit}
        onCancel={() => {
          setRecordModalVisible(false);
          recordForm.resetFields();
        }}
        okText="保存"
        cancelText="取消"
        width={420}
      >
        <Form form={recordForm} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item
            label="审查人员"
            name="reviewer"
            rules={[{ required: true, message: '请输入审查人员姓名' }]}
          >
            <Input placeholder="请输入审查人员姓名" />
          </Form.Item>
          <Form.Item label="备注" name="remark">
            <TextArea rows={3} placeholder="备注信息（可选）" />
          </Form.Item>
        </Form>
      </Modal>

      <Drawer
        title="审查记录详情"
        width={560}
        open={recordDetailVisible}
        onClose={() => setRecordDetailVisible(false)}
      >
        {selectedRecord && (
          <>
            <Card size="small" style={{ marginBottom: 16 }}>
              <Descriptions size="small" column={2} labelStyle={{ color: '#64748b' }}>
                <Descriptions.Item label="审查日期">{selectedRecord.date}</Descriptions.Item>
                <Descriptions.Item label="审查人员">{selectedRecord.reviewer}</Descriptions.Item>
                <Descriptions.Item label="证照文件">{selectedRecord.totalFiles} 份</Descriptions.Item>
                <Descriptions.Item label="材料种类">{selectedRecord.totalMaterials} 种</Descriptions.Item>
                <Descriptions.Item label="问题总数">{selectedRecord.problemsCount} 个</Descriptions.Item>
                <Descriptions.Item label="已解决">{selectedRecord.resolvedCount} 个</Descriptions.Item>
              </Descriptions>
            </Card>
            {selectedRecord.remark && (
              <Card size="small" title="备注">
                {selectedRecord.remark}
              </Card>
            )}
          </>
        )}
      </Drawer>
    </div>
  );
};

export default ArchiveExport;
