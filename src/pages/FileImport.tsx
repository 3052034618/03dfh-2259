import React, { useState, useRef, useMemo } from 'react';
import {
  Upload,
  Table,
  Button,
  Space,
  Tag,
  Modal,
  Form,
  Select,
  Input,
  DatePicker,
  message,
  Popconfirm,
  Tooltip,
  Card,
  Statistic,
  Row,
  Col,
  Divider,
  Alert,
  List,
  Collapse,
} from 'antd';
import {
  InboxOutlined,
  FileTextOutlined,
  DeleteOutlined,
  EditOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  FileProtectOutlined,
  PaperClipOutlined,
  SearchOutlined,
  WarningOutlined,
  ExclamationCircleOutlined,
  CloseOutlined,
  BulbOutlined,
  SafetyCertificateOutlined,
  BankOutlined,
  SolutionOutlined,
  ApartmentOutlined,
} from '@ant-design/icons';
import type { UploadProps } from 'antd';
import { useApp } from '../context/AppContext';
import {
  LicenseType,
  LicenseTypeLabels,
  FileStatus,
  LicenseFile,
  DuplicateFileInfo,
} from '../types';
import { formatFileSize, detectLicenseType } from '../utils/storage';
import dayjs from 'dayjs';

const { Dragger } = Upload;
const { Option } = Select;
const { TextArea } = Input;

const FileImport: React.FC = () => {
  const { state, addFiles, updateFile, deleteFile, getDuplicates, getFileById, setCurrentBatchId } = useApp();
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingFile, setEditingFile] = useState<LicenseFile | null>(null);
  const [form] = Form.useForm();
  const [searchText, setSearchText] = useState('');
  const [duplicateModalVisible, setDuplicateModalVisible] = useState(false);
  const [newDuplicates, setNewDuplicates] = useState<DuplicateFileInfo[]>([]);
  const [lastImportResult, setLastImportResult] = useState<{ count: number; autoDetected: number } | null>(null);
  const [selectedBatchId, setSelectedBatchIdState] = useState<string | 'all'>('all');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload: UploadProps['customRequest'] = (options: any) => {
    const { file, fileList } = options;
    const files = fileList?.map((f: any) => f.originFileObj as File) || [file as File];
    const validFiles = files.filter(Boolean);
    
    const result = addFiles(validFiles);
    
    let autoDetected = 0;
    setTimeout(() => {
      validFiles.forEach((f: File) => {
        const detected = detectLicenseType(f.name);
        if (detected !== 'registration_certificate') {
          autoDetected++;
        }
      });
      
      if (result.duplicates.length > 0) {
        setNewDuplicates(result.duplicates);
        setDuplicateModalVisible(true);
      }
      
      setLastImportResult({ count: result.addedCount, autoDetected });
      message.success(`成功导入 ${result.addedCount} 个文件${autoDetected > 0 ? `，已智能识别 ${autoDetected} 个证照类型` : ''}`);
      
      setTimeout(() => setLastImportResult(null), 5000);
    }, 200);
  };

  const handleEdit = (file: LicenseFile) => {
    setEditingFile(file);
    form.setFieldsValue({
      ...file,
      type: file.type,
      issueDate: file.issueDate ? dayjs(file.issueDate) : null,
      expiryDate: file.expiryDate && file.expiryDate !== '长期有效' ? dayjs(file.expiryDate) : null,
      isPermanent: file.expiryDate === '长期有效',
    });
    setEditModalVisible(true);
  };

  const handleEditSubmit = async () => {
    try {
      const values = await form.validateFields();
      if (!editingFile) return;

      const updatedFile: LicenseFile = {
        ...editingFile,
        ...values,
        type: values.type as LicenseType,
        issueDate: values.issueDate ? values.issueDate.format('YYYY-MM-DD') : undefined,
        expiryDate: values.isPermanent ? '长期有效' : (values.expiryDate ? values.expiryDate.format('YYYY-MM-DD') : undefined),
        status: 'reviewed',
      };

      updateFile(updatedFile);
      setEditModalVisible(false);
      setEditingFile(null);
      form.resetFields();
      message.success('证照信息已更新');
    } catch (e) {
      console.error(e);
    }
  };

  const handleDelete = (fileId: string) => {
    deleteFile(fileId);
    message.success('已删除');
  };

  const handleBatchDetect = () => {
    let count = 0;
    state.files.forEach(file => {
      if (file.status === 'pending') {
        const detectedType = detectLicenseType(file.name);
        if (detectedType !== file.type) {
          updateFile({ ...file, type: detectedType });
          count++;
        }
      }
    });
    message.success(`已智能识别 ${count} 个文件类型`);
  };

  const filteredFiles = state.files.filter(file =>
    file.name.toLowerCase().includes(searchText.toLowerCase()) ||
    file.licenseNumber?.includes(searchText)
  );

  const allBatchIds = useMemo(() => {
    const ids = Array.from(new Set(state.files.map(f => f.batchId).filter(Boolean))) as string[];
    return ids.sort();
  }, [state.files]);

  const batchFileCountMap = useMemo(() => {
    const map: Record<string, number> = {};
    state.files.forEach(f => {
      if (f.batchId) {
        map[f.batchId] = (map[f.batchId] || 0) + 1;
      }
    });
    return map;
  }, [state.files]);

  const batchFilteredFiles = useMemo(() => {
    if (selectedBatchId === 'all') return state.files;
    return state.files.filter(f => f.batchId === selectedBatchId);
  }, [selectedBatchId, state.files]);

  const duplicates = useMemo(() => getDuplicates(), [state.files]);
  const batchFilteredDuplicates = useMemo(() => 
    duplicates.filter(d => 
      selectedBatchId === 'all' ? true : d.file.batchId === selectedBatchId
    ), 
    [duplicates, selectedBatchId]
  );
  const duplicateFileIds = useMemo(() => new Set(duplicates.map(d => d.file.id)), [duplicates]);

  const batchStats = useMemo(() => {
    const total = batchFilteredFiles.length;
    const confirmed = batchFilteredFiles.filter(f => f.duplicateConfirmed === true).length;
    const pendingDupFileIds = new Set(batchFilteredDuplicates.map(d => d.file.id));
    const pendingDup = pendingDupFileIds.size;
    return { total, confirmed, pendingDup };
  }, [batchFilteredFiles, batchFilteredDuplicates]);

  const typeOrder: LicenseType[] = ['registration_certificate', 'business_license', 'medical_device_license', 'authorization_chain'];
  const typeIcons: Record<LicenseType, React.ReactNode> = {
    registration_certificate: <SafetyCertificateOutlined style={{ color: '#60a5fa' }} />,
    business_license: <BankOutlined style={{ color: '#52c41a' }} />,
    medical_device_license: <SolutionOutlined style={{ color: '#faad14' }} />,
    authorization_chain: <ApartmentOutlined style={{ color: '#722ed1' }} />,
  };
  const typeTagColors: Record<LicenseType, string> = {
    registration_certificate: 'blue',
    business_license: 'green',
    medical_device_license: 'orange',
    authorization_chain: 'purple',
  };

  const groupedFiles = useMemo(() => {
    const groups: Record<LicenseType, LicenseFile[]> = {
      registration_certificate: [],
      business_license: [],
      medical_device_license: [],
      authorization_chain: [],
    };
    batchFilteredFiles.forEach(f => {
      groups[f.type].push(f);
    });
    typeOrder.forEach(type => {
      groups[type].sort((a, b) => {
        const order: Record<FileStatus, number> = { pending: 0, matched: 1, reviewed: 2 };
        return (order[a.status] ?? 3) - (order[b.status] ?? 3);
      });
    });
    return groups;
  }, [batchFilteredFiles]);

  const batchColumns = [
    {
      title: '证照名称',
      dataIndex: 'name',
      key: 'name',
      ellipsis: true,
      render: (text: string, record: LicenseFile) => (
        <Space>
          <FileTextOutlined style={{ color: '#60a5fa' }} />
          <span style={{ cursor: 'pointer' }} onClick={() => handleEdit(record)}>{text}</span>
        </Space>
      ),
    },
    {
      title: '编号',
      dataIndex: 'licenseNumber',
      key: 'licenseNumber',
      width: 180,
      render: (text?: string) => text || <span style={{ color: '#64748b' }}>未填写</span>,
    },
    {
      title: '有效期',
      dataIndex: 'expiryDate',
      key: 'expiryDate',
      width: 120,
      render: (text?: string) => {
        if (!text) return <span style={{ color: '#64748b' }}>未填写</span>;
        return <span>{text}</span>;
      },
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 80,
      render: (status: FileStatus) => <Tag color={statusColors[status]}>{statusLabels[status]}</Tag>,
    },
  ];

  const reasonLabels: Record<string, { label: string; color: string }> = {
    name: { label: '同名重复', color: 'orange' },
    licenseNumber: { label: '同编号重复', color: 'red' },
    supplier: { label: '同供应商重复', color: 'purple' },
  };

  const duplicateColumns = [
    {
      title: '文件名',
      dataIndex: ['file', 'name'],
      key: 'fileName',
      width: 200,
      ellipsis: true,
    },
    {
      title: '重复原因',
      dataIndex: 'reason',
      key: 'reason',
      width: 120,
      render: (reason: string) => {
        const info = reasonLabels[reason] || { label: reason, color: 'default' };
        return <Tag color={info.color}>{info.label}</Tag>;
      },
    },
    {
      title: '重复对象',
      dataIndex: 'duplicateWith',
      key: 'duplicateWith',
      render: (ids: string[]) => (
        <Space wrap>
          {ids.map(id => {
            const f = getFileById(id);
            return f ? <Tag key={id} color="red">{f.name}</Tag> : null;
          })}
        </Space>
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 160,
      render: (_: any, record: DuplicateFileInfo) => (
        <Space size="small">
          <Button type="link" size="small" icon={<CheckCircleOutlined />} onClick={() => {
            updateFile(record.file.id, { duplicateConfirmed: true });
            message.success('已确认保留');
          }}>
            确认保留
          </Button>
          <Popconfirm title="确认删除此文件？" onConfirm={() => handleDelete(record.file.id)} okText="确认" cancelText="取消">
            <Button type="link" size="small" danger icon={<DeleteOutlined />}>
              删除此文件
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const handleRetainAll = () => {
    const uniqueIds = [...new Set(batchFilteredDuplicates.map(d => d.file.id))];
    uniqueIds.forEach(id => updateFile(id, { duplicateConfirmed: true }));
    message.success(`已确认保留 ${uniqueIds.length} 个重复项`);
  };

  const handleDeleteAllDuplicates = () => {
    const groupsMap = new Map<string, LicenseFile[]>();
    batchFilteredDuplicates.forEach(d => {
      const key = `${d.reason}_${d.file.name}_${d.file.licenseNumber || ''}_${d.file.authorizedInstitution || ''}`;
      if (!groupsMap.has(key)) {
        groupsMap.set(key, []);
      }
      const arr = groupsMap.get(key)!;
      if (!arr.some(f => f.id === d.file.id)) {
        arr.push(d.file);
      }
    });
    
    const idsToDelete: string[] = [];
    groupsMap.forEach(files => {
      if (files.length > 1) {
        const sorted = [...files].sort((a, b) => 
          new Date(a.uploadTime).getTime() - new Date(b.uploadTime).getTime()
        );
        sorted.slice(1).forEach(f => idsToDelete.push(f.id));
      }
    });
    
    const uniqueIds = [...new Set(idsToDelete)];
    uniqueIds.forEach(id => deleteFile(id));
    message.success(`已删除 ${uniqueIds.length} 个重复项（保留每组中上传时间最早的文件）`);
  };

  const statusColors: Record<FileStatus, string> = {
    pending: 'orange',
    matched: 'blue',
    reviewed: 'green',
  };

  const statusLabels: Record<FileStatus, string> = {
    pending: '待处理',
    matched: '已匹配',
    reviewed: '已审核',
  };

  const getFileDuplicateInfo = (fileId: string) => {
    return duplicates.filter(d => d.file.id === fileId);
  };

  const columns = [
    {
      title: '证照名称',
      dataIndex: 'name',
      key: 'name',
      width: 280,
      render: (text: string, record: LicenseFile) => (
        <Space>
          <FileTextOutlined style={{ color: '#60a5fa' }} />
          <span style={{ cursor: 'pointer' }} onClick={() => handleEdit(record)}>
            {text}
          </span>
          {duplicateFileIds.has(record.id) && (
            <Tooltip title="检测到重复证照，点击查看">
              <ExclamationCircleOutlined
                style={{ color: '#faad14', cursor: 'pointer' }}
                onClick={() => {
                  setNewDuplicates(getFileDuplicateInfo(record.id));
                  setDuplicateModalVisible(true);
                }}
              />
            </Tooltip>
          )}
        </Space>
      ),
    },
    {
      title: '证照类型',
      dataIndex: 'type',
      key: 'type',
      width: 160,
      render: (type: LicenseType) => <Tag color="blue">{LicenseTypeLabels[type]}</Tag>,
    },
    {
      title: '证照编号',
      dataIndex: 'licenseNumber',
      key: 'licenseNumber',
      width: 200,
      render: (text?: string) => text || <span style={{ color: '#64748b' }}>未填写</span>,
    },
    {
      title: '有效期至',
      dataIndex: 'expiryDate',
      key: 'expiryDate',
      width: 130,
      render: (text?: string) => {
        if (!text) return <span style={{ color: '#64748b' }}>未填写</span>;
        const isExpired = text !== '长期有效' && dayjs(text).isBefore(dayjs());
        const isWarning = text !== '长期有效' && dayjs(text).diff(dayjs(), 'day') <= 90 && dayjs(text).diff(dayjs(), 'day') >= 0;
        return (
          <span style={{ color: isExpired ? '#ff4d4f' : isWarning ? '#faad14' : '#52c41a' }}>
            {text}
          </span>
        );
      },
    },
    {
      title: '文件大小',
      dataIndex: 'fileSize',
      key: 'fileSize',
      width: 100,
      render: (size: number) => formatFileSize(size),
    },
    {
      title: '导入时间',
      dataIndex: 'uploadTime',
      key: 'uploadTime',
      width: 120,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: FileStatus) => (
        <Tag color={statusColors[status]}>{statusLabels[status]}</Tag>
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 140,
      fixed: 'right' as const,
      render: (_: any, record: LicenseFile) => (
        <Space size="small">
          <Tooltip title="编辑">
            <Button
              type="link"
              size="small"
              icon={<EditOutlined />}
              onClick={() => handleEdit(record)}
            >
              编辑
            </Button>
          </Tooltip>
          <Popconfirm
            title="确认删除该文件？"
            onConfirm={() => handleDelete(record.id)}
            okText="确认"
            cancelText="取消"
          >
            <Button type="link" size="small" danger icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const pendingCount = state.files.filter(f => f.status === 'pending').length;
  const reviewedCount = state.files.filter(f => f.status === 'reviewed').length;
  const matchedCount = state.files.filter(f => f.status === 'matched').length;
  const duplicateCount = new Set(duplicates.map(d => d.file.id)).size;

  return (
    <div style={{ padding: '16px 0' }}>
      {lastImportResult && (
        <Alert
          message={
            <Space>
              <BulbOutlined />
              <span>
                成功导入 {lastImportResult.count} 个文件
                {lastImportResult.autoDetected > 0 && `，已智能识别 ${lastImportResult.autoDetected} 个证照类型`}
              </span>
            </Space>
          }
          type="success"
          showIcon
          closable
          onClose={() => setLastImportResult(null)}
          style={{ marginBottom: 16 }}
        />
      )}

      <Row gutter={16} style={{ marginBottom: 20 }}>
        <Col span={5}>
          <Card style={{ background: '#0f172a', border: '1px solid #334155' }}>
            <Statistic
              title="文件总数"
              value={state.files.length}
              prefix={<FileProtectOutlined style={{ color: '#60a5fa' }} />}
              valueStyle={{ color: '#e2e8f0' }}
            />
          </Card>
        </Col>
        <Col span={5}>
          <Card style={{ background: '#0f172a', border: '1px solid #334155' }}>
            <Statistic
              title="待处理"
              value={pendingCount}
              prefix={<ClockCircleOutlined style={{ color: '#faad14' }} />}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
        <Col span={5}>
          <Card style={{ background: '#0f172a', border: '1px solid #334155' }}>
            <Statistic
              title="已匹配"
              value={matchedCount}
              prefix={<PaperClipOutlined style={{ color: '#1890ff' }} />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col span={5}>
          <Card style={{ background: '#0f172a', border: '1px solid #334155' }}>
            <Statistic
              title="已审核"
              value={reviewedCount}
              prefix={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card
            style={{
              background: duplicateCount > 0 ? '#7f1d1d30' : '#0f172a',
              border: `1px solid ${duplicateCount > 0 ? '#7f1d1d' : '#334155'}`,
            }}
          >
            <Statistic
              title="重复证照"
              value={duplicateCount}
              prefix={<WarningOutlined style={{ color: duplicateCount > 0 ? '#ff4d4f' : '#64748b' }} />}
              valueStyle={{ color: duplicateCount > 0 ? '#ff4d4f' : '#64748b' }}
            />
          </Card>
        </Col>
      </Row>

      <Card style={{ background: '#0f172a', border: '1px solid #334155', marginBottom: 16 }}>
        <Dragger
          accept=".pdf,.jpg,.jpeg,.png,.gif,.bmp,.doc,.docx"
          customRequest={handleUpload}
          multiple
          showUploadList={false}
          style={{ background: '#1e293b', border: '2px dashed #475569' }}
        >
          <p className="ant-upload-drag-icon">
            <InboxOutlined style={{ color: '#60a5fa', fontSize: 48 }} />
          </p>
          <p className="ant-upload-text" style={{ color: '#e2e8f0', fontSize: 16 }}>
            拖拽证照文件到此区域，或点击选择文件
          </p>
          <p className="ant-upload-hint" style={{ color: '#64748b' }}>
            支持批量导入注册证、营业执照、医疗器械经营许可证、授权链文件等
            <br />
            支持 PDF、JPG、PNG、Word 等格式
            <br />
            <span style={{ color: '#90cdf4' }}>
              <BulbOutlined /> 系统将按文件名自动识别证照类型，并检测重复
            </span>
          </p>
        </Dragger>
      </Card>

      <Card
        style={{ background: '#1e293b', border: '1px solid #334155' }}
        title={
          <Space>
            <span>文件列表</span>
            <Tag color="blue">{state.files.length} 个文件</Tag>
            {duplicateCount > 0 && (
              <Tag color="orange" icon={<WarningOutlined />}>
                {duplicateCount} 个重复
              </Tag>
            )}
          </Space>
        }
        extra={
          <Space>
            <Input
              placeholder="搜索文件名/证照编号"
              prefix={<SearchOutlined />}
              value={searchText}
              onChange={e => setSearchText(e.target.value)}
              style={{ width: 200 }}
              size="small"
            />
            <Button size="small" icon={<PaperClipOutlined />} onClick={handleBatchDetect}>
              智能识别
            </Button>
            <Button size="small" type="primary">
              批量编辑
            </Button>
          </Space>
        }
      >
        <Table
          columns={columns}
          dataSource={filteredFiles}
          rowKey="id"
          size="small"
          scroll={{ x: 1100 }}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showTotal: total => `共 ${total} 个文件`,
          }}
        />
      </Card>

      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={14}>
          <Card style={{ background: '#0f172a', border: '1px solid #334155', height: '100%' }} bodyStyle={{ padding: 12 }}>
            <Space direction="vertical" style={{ width: '100%' }} size="small">
              <div style={{ color: '#94a3b8', fontSize: 12, marginBottom: 4 }}>
                <span style={{ marginRight: 8 }}>📦</span>批次筛选
              </div>
              <Select
                style={{ width: '100%' }}
                size="small"
                value={selectedBatchId}
                onChange={val => setSelectedBatchIdState(val)}
                dropdownStyle={{ background: '#1e293b', border: '1px solid #334155' }}
                listHeight={256}
              >
                <Option value="all">
                  <Space>
                    <span>全部批次</span>
                    <Tag color="blue">{state.files.length}</Tag>
                  </Space>
                </Option>
                {allBatchIds.map(bid => (
                  <Option key={bid} value={bid}>
                    <Space>
                      <span>{bid}</span>
                      <Tag color="cyan">{batchFileCountMap[bid] || 0}</Tag>
                      {bid === state.currentBatchId && <Tag color="green">当前</Tag>}
                    </Space>
                  </Option>
                ))}
              </Select>
              {state.currentBatchId && selectedBatchId !== state.currentBatchId && (
                <Button 
                  type="link" 
                  size="small" 
                  style={{ padding: 0, height: 'auto' }} 
                  onClick={() => {
                    setSelectedBatchIdState(state.currentBatchId!);
                    setCurrentBatchId(state.currentBatchId);
                  }}
                >
                  切换到当前批次 {state.currentBatchId}
                </Button>
              )}
            </Space>
          </Card>
        </Col>
        <Col span={10}>
          <Card style={{ background: '#0f172a', border: '1px solid #334155', height: '100%' }} bodyStyle={{ padding: 12 }}>
            <div style={{ color: '#94a3b8', fontSize: 12, marginBottom: 8 }}>
              <span style={{ marginRight: 8 }}>📊</span>批次进度统计
            </div>
            <Row gutter={8}>
              <Col span={8}>
                <div style={{ 
                  background: '#1e293b', 
                  padding: '8px 6px', 
                  borderRadius: 4, 
                  textAlign: 'center',
                  border: '1px solid #334155'
                }}>
                  <div style={{ fontSize: 18, fontWeight: 600, color: '#60a5fa' }}>{batchStats.total}</div>
                  <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>文件总数</div>
                </div>
              </Col>
              <Col span={8}>
                <div style={{ 
                  background: '#1e293b', 
                  padding: '8px 6px', 
                  borderRadius: 4, 
                  textAlign: 'center',
                  border: '1px solid #065f4630'
                }}>
                  <div style={{ fontSize: 18, fontWeight: 600, color: '#52c41a' }}>{batchStats.confirmed}</div>
                  <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>已确认重复</div>
                </div>
              </Col>
              <Col span={8}>
                <div style={{ 
                  background: '#1e293b', 
                  padding: '8px 6px', 
                  borderRadius: 4, 
                  textAlign: 'center',
                  border: batchStats.pendingDup > 0 ? '1px solid #7f1d1d50' : '1px solid #334155'
                }}>
                  <div style={{ fontSize: 18, fontWeight: 600, color: batchStats.pendingDup > 0 ? '#ff4d4f' : '#64748b' }}>{batchStats.pendingDup}</div>
                  <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>待确认重复</div>
                </div>
              </Col>
            </Row>
          </Card>
        </Col>
      </Row>

      <Card
        style={{ background: '#1e293b', border: '1px solid #334155', marginBottom: 16 }}
        title={
          <Space>
            <FileProtectOutlined style={{ color: '#60a5fa' }} />
            <span>导入批次视图</span>
            <Tag color="blue">{batchFilteredFiles.length} 个文件</Tag>
            {selectedBatchId !== 'all' && <Tag color="cyan">{selectedBatchId}</Tag>}
          </Space>
        }
      >
        <Collapse
          defaultActiveKey={typeOrder}
          style={{ background: 'transparent', border: 'none' }}
          items={typeOrder.map(type => {
            const files = groupedFiles[type];
            return {
              key: type,
              label: (
                <Space>
                  {typeIcons[type]}
                  <span>{LicenseTypeLabels[type]}</span>
                  <Tag color={typeTagColors[type]}>{files.length}</Tag>
                </Space>
              ),
              children: (
                <Table
                  columns={batchColumns}
                  dataSource={files}
                  rowKey="id"
                  size="small"
                  pagination={false}
                  locale={{ emptyText: '暂无该类型文件' }}
                />
              ),
              style: { background: '#0f172a', border: '1px solid #334155', marginBottom: 8, borderRadius: 4 },
            };
          })}
        />
      </Card>

      {batchFilteredDuplicates.length > 0 && (
        <Card
          style={{ background: '#1e293b', border: '1px solid #7f1d1d', marginBottom: 16 }}
          title={
            <Space>
              <WarningOutlined style={{ color: '#ff4d4f' }} />
              <span>待确认重复项</span>
              <Tag color="red">{batchFilteredDuplicates.length}</Tag>
              {selectedBatchId !== 'all' && <Tag color="cyan">{selectedBatchId}</Tag>}
            </Space>
          }
          extra={
            <Space>
              <Button size="small" icon={<CheckCircleOutlined />} onClick={handleRetainAll}>
                全部保留
              </Button>
              <Popconfirm title="确认删除全部重复项？将保留每组中上传时间最早的文件" onConfirm={handleDeleteAllDuplicates} okText="确认" cancelText="取消">
                <Button size="small" danger icon={<DeleteOutlined />}>
                  全部删除重复
                </Button>
              </Popconfirm>
            </Space>
          }
        >
          <Table
            columns={duplicateColumns}
            dataSource={batchFilteredDuplicates}
            rowKey={record => record.file.id + '_' + record.reason}
            size="small"
            pagination={false}
          />
        </Card>
      )}

      <Modal
        title="编辑证照信息"
        open={editModalVisible}
        onOk={handleEditSubmit}
        onCancel={() => {
          setEditModalVisible(false);
          setEditingFile(null);
          form.resetFields();
        }}
        width={680}
        okText="保存"
        cancelText="取消"
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Row gutter={16}>
            <Col span={24}>
              <Form.Item label="证照名称" name="name">
                <Input disabled />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="证照类型"
                name="type"
                rules={[{ required: true, message: '请选择证照类型' }]}
              >
                <Select>
                  {Object.entries(LicenseTypeLabels).map(([value, label]) => (
                    <Option key={value} value={value}>
                      {label}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="证照编号"
                name="licenseNumber"
                rules={[{ required: true, message: '请输入证照编号' }]}
              >
                <Input placeholder="请输入证照编号" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="签发日期" name="issueDate">
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="有效期至" name="expiryDate">
                <DatePicker style={{ width: '100%' }} disabled={form.getFieldValue('isPermanent')} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="isPermanent" valuePropName="checked">
            <span style={{ color: '#94a3b8' }}>长期有效</span>
          </Form.Item>
          <Divider style={{ borderColor: '#334155' }} />
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="签发机关" name="issuer">
                <Input placeholder="请输入签发机关" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="授权区域" name="authorizedRegion">
                <Input placeholder="如：全国/华东地区/上海市" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item label="授权机构名称" name="authorizedInstitution">
            <Input placeholder="证照上载明的被授权机构名称" />
          </Form.Item>
          <Form.Item label="备注" name="remark">
            <TextArea rows={2} placeholder="备注信息" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={
          <Space>
            <WarningOutlined style={{ color: '#faad14' }} />
            <span>重复证照提醒</span>
          </Space>
        }
        open={duplicateModalVisible}
        onOk={() => setDuplicateModalVisible(false)}
        onCancel={() => setDuplicateModalVisible(false)}
        width={600}
        okText="知道了"
        cancelText="关闭"
      >
        <div style={{ marginBottom: 12, color: '#94a3b8' }}>
          检测到以下证照可能存在重复，请核对后处理：
        </div>
        <List
          dataSource={newDuplicates}
          renderItem={(item, idx) => {
            const duplicateFiles = item.duplicateWith.map(id => getFileById(id)).filter(Boolean);
            return (
              <List.Item
                style={{
                  padding: '12px 16px',
                  marginBottom: 8,
                  background: '#0f172a',
                  borderRadius: 4,
                  border: '1px solid #92400e50',
                }}
              >
                <div style={{ width: '100%' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <Space>
                      <Tag color={item.reason === 'name' ? 'orange' : item.reason === 'supplier' ? 'purple' : 'red'}>
                        {item.reason === 'name' ? '同名重复' : item.reason === 'supplier' ? '同供应商重复' : '同编号重复'}
                      </Tag>
                      <span style={{ fontWeight: 500 }}>{item.file.name}</span>
                    </Space>
                    <Button
                      type="link"
                      size="small"
                      danger
                      icon={<CloseOutlined />}
                      onClick={() => handleDelete(item.file.id)}
                    >
                      删除此文件
                    </Button>
                  </div>
                  {item.file.licenseNumber && (
                    <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 4 }}>
                      证照编号：{item.file.licenseNumber}
                    </div>
                  )}
                  {duplicateFiles.length > 0 && (
                    <div style={{ fontSize: 12, color: '#f87171' }}>
                      与以下文件重复：
                      <Space wrap style={{ marginLeft: 8 }}>
                        {duplicateFiles.map(f => (
                          <Tag key={f!.id} color="red" style={{ fontSize: 11 }}>
                            {f!.name}
                          </Tag>
                        ))}
                      </Space>
                    </div>
                  )}
                </div>
              </List.Item>
            );
          }}
        />
        <div style={{ marginTop: 12, fontSize: 12, color: '#64748b', padding: 12, background: '#1e293b', borderRadius: 4 }}>
          <BulbOutlined style={{ marginRight: 4 }} />
          提示：同名或同编号证照可能是同一文件多次导入，建议删除重复项。
        </div>
      </Modal>
    </div>
  );
};

export default FileImport;
