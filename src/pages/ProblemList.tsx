import React, { useState, useMemo } from 'react';
import {
  Card,
  Table,
  Button,
  Tag,
  Space,
  Modal,
  Form,
  Select,
  Input,
  Row,
  Col,
  Statistic,
  Tooltip,
  Radio,
  message,
  Popconfirm,
  Drawer,
  Descriptions,
  Badge,
  Divider,
  Segmented,
  Timeline,
  List,
} from 'antd';
import {
  WarningOutlined,
  ExclamationCircleOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  FileTextOutlined,
  BankOutlined,
  LinkOutlined,
  EditOutlined,
  SearchOutlined,
  FilterOutlined,
  EyeOutlined,
  MedicineBoxOutlined,
  PlusOutlined,
} from '@ant-design/icons';
import { useApp } from '../context/AppContext';
import {
  AuditProblem,
  ProblemType,
  ProblemTypeLabels,
  ProblemStatus,
  ProblemStatusLabels,
  LicenseFile,
  LicenseTypeLabels,
  ProblemGroupTypeLabels,
  OpinionHistoryItem,
} from '../types';

const { TextArea } = Input;
const { Option } = Select;

const ProblemList: React.FC = () => {
  const { state, updateProblemStatus, getFileById, getMaterialById } = useApp();
  const [searchText, setSearchText] = useState('');
  const [typeFilter, setTypeFilter] = useState<ProblemType | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<ProblemStatus | 'all'>('all');
  const [severityFilter, setSeverityFilter] = useState<'all' | 'high' | 'medium' | 'low'>('all');
  const [detailVisible, setDetailVisible] = useState(false);
  const [selectedProblem, setSelectedProblem] = useState<AuditProblem | null>(null);
  const [handleModalVisible, setHandleModalVisible] = useState(false);
  const [handleForm] = Form.useForm();
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list');
  const [handlerName, setHandlerName] = useState<string>('');

  const handlerOptions = ['张合规', '李质控', '王审核', '赵专员'];

  const filteredProblems = useMemo(() => {
    return state.problems.filter(problem => {
      const file = getFileById(problem.fileId);
      const matchesSearch = !searchText ||
        problem.description.toLowerCase().includes(searchText.toLowerCase()) ||
        file?.name.toLowerCase().includes(searchText.toLowerCase());
      const matchesType = typeFilter === 'all' || problem.type === typeFilter;
      const matchesStatus = statusFilter === 'all' || problem.status === statusFilter;
      const matchesSeverity = severityFilter === 'all' || problem.severity === severityFilter;
      return matchesSearch && matchesType && matchesStatus && matchesSeverity;
    });
  }, [state.problems, searchText, typeFilter, statusFilter, severityFilter, getFileById]);

  const newProblems = useMemo(() => 
    filteredProblems.filter(p => p.isNewProblem === true),
    [filteredProblems]
  );

  const stillExistProblems = useMemo(() => 
    filteredProblems.filter(p => p.isNewProblem === false && p.status === 'pending'),
    [filteredProblems]
  );

  const resolvedProblems = useMemo(() => 
    filteredProblems.filter(p => 
      p.status === 'resolved' || 
      (p.previousStatus !== undefined) || 
      p.description.includes('已消除')
    ),
    [filteredProblems]
  );

  const stillAbnormalProblems = useMemo(() => 
    filteredProblems.filter(p => 
      p.status === 'processing' || 
      (p.status !== 'resolved' && p.lastHandledAt && (p.status === 'pending' || p.status === 'processing'))
    ),
    [filteredProblems]
  );

  const pendingCount = state.problems.filter(p => p.status === 'pending').length;
  const processingCount = state.problems.filter(p => p.status === 'processing').length;
  const resolvedCount = state.problems.filter(p => p.status === 'resolved').length;
  const highCount = state.problems.filter(p => p.severity === 'high').length;
  const isNewCount = state.problems.filter(p => p.isNewProblem).length;

  const severityColors = {
    high: 'red',
    medium: 'orange',
    low: 'blue',
  };

  const severityLabels = {
    high: '高风险',
    medium: '中风险',
    low: '低风险',
  };

  const problemTypeIcons: Record<ProblemType, React.ReactNode> = {
    expired: <ExclamationCircleOutlined />,
    expiring_soon: <ClockCircleOutlined />,
    name_mismatch: <BankOutlined />,
    chain_missing: <LinkOutlined />,
    license_invalid: <WarningOutlined />,
  };

  const handleViewDetail = (problem: AuditProblem) => {
    setSelectedProblem(problem);
    setDetailVisible(true);
  };

  const handleProcess = (problem: AuditProblem) => {
    setSelectedProblem(problem);
    handleForm.setFieldsValue({
      status: problem.status,
      opinion: problem.handlerOpinion || '',
      handler: problem.lastHandledBy || problem.handledBy || handlerName || '',
    });
    setHandleModalVisible(true);
  };

  const handleProcessSubmit = async () => {
    try {
      const values = await handleForm.validateFields();
      if (!selectedProblem) return;

      if (values.handler) {
        setHandlerName(values.handler);
      }

      updateProblemStatus(selectedProblem.id, values.status as ProblemStatus, values.opinion, values.handler);
      setHandleModalVisible(false);
      setSelectedProblem(null);
      handleForm.resetFields();
      message.success('处理意见已保存');
    } catch (e) {
      console.error(e);
    }
  };

  const quickSuggestions = [
    '要求供应商补件',
    '暂停采购',
    '限期整改',
    '已核实无误',
    '更换供应商',
  ];

  const columns = [
    {
      title: '问题类型',
      dataIndex: 'type',
      key: 'type',
      width: 140,
      render: (type: ProblemType, record: AuditProblem) => (
        <Tag color={severityColors[record.severity]} icon={problemTypeIcons[type]}>
          {ProblemTypeLabels[type]}
        </Tag>
      ),
    },
    {
      title: '风险等级',
      dataIndex: 'severity',
      key: 'severity',
      width: 100,
      render: (severity: 'high' | 'medium' | 'low') => (
        <Badge
          status={severity === 'high' ? 'error' : severity === 'medium' ? 'warning' : 'processing'}
          text={severityLabels[severity]}
        />
      ),
    },
    {
      title: '问题描述',
      dataIndex: 'description',
      key: 'description',
      width: 320,
      ellipsis: true,
    },
    {
      title: '关联证照',
      dataIndex: 'fileId',
      key: 'fileId',
      width: 200,
      render: (fileId: string) => {
        const file = getFileById(fileId);
        return file ? (
          <Space size={4}>
            <FileTextOutlined style={{ color: '#60a5fa' }} />
            <span style={{ fontSize: 12 }}>{file.name}</span>
          </Space>
        ) : '-';
      },
    },
    {
      title: '关联材料',
      dataIndex: 'materialId',
      key: 'materialId',
      width: 160,
      render: (materialId?: string) => {
        if (!materialId) return '-';
        const material = getMaterialById(materialId);
        return material ? (
          <Space size={4}>
            <MedicineBoxOutlined style={{ color: '#52c41a' }} />
            <span style={{ fontSize: 12 }}>{material.name}</span>
          </Space>
        ) : '-';
      },
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 130,
      render: (status: ProblemStatus, record: AuditProblem) => (
        <Space size={4}>
          <Tag color={status === 'resolved' ? 'green' : status === 'processing' ? 'orange' : 'red'}>
            {ProblemStatusLabels[status]}
          </Tag>
          {record.isNewProblem && <Tag color="green">新增</Tag>}
        </Space>
      ),
    },
    {
      title: '发现日期',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 110,
    },
    {
      title: '上次处理',
      dataIndex: 'lastHandledAt',
      key: 'lastHandledAt',
      width: 110,
      render: (lastHandledAt?: string) => lastHandledAt || '-',
    },
    {
      title: '操作',
      key: 'action',
      width: 160,
      fixed: 'right' as const,
      render: (_: any, record: AuditProblem) => (
        <Space size="small">
          <Tooltip title="查看详情">
            <Button
              type="link"
              size="small"
              icon={<EyeOutlined />}
              onClick={() => handleViewDetail(record)}
            >
              详情
            </Button>
          </Tooltip>
          <Tooltip title="处理">
            <Button
              type="link"
              size="small"
              icon={<EditOutlined />}
              onClick={() => handleProcess(record)}
            >
              处理
            </Button>
          </Tooltip>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: '16px 0' }}>
      <Row gutter={16} style={{ marginBottom: 20 }}>
        <Col span={4}>
          <Card style={{ background: '#0f172a', border: '1px solid #334155' }}>
            <Statistic
              title="问题总数"
              value={state.problems.length}
              prefix={<WarningOutlined style={{ color: '#faad14' }} />}
              valueStyle={{ color: '#e2e8f0' }}
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card style={{ background: '#0f172a', border: '1px solid #334155' }}>
            <Statistic
              title="高风险"
              value={highCount}
              prefix={<ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />}
              valueStyle={{ color: '#ff4d4f' }}
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card style={{ background: '#0f172a', border: '1px solid #334155' }}>
            <Statistic
              title="待处理"
              value={pendingCount}
              prefix={<ClockCircleOutlined style={{ color: '#faad14' }} />}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card style={{ background: '#0f172a', border: '1px solid #334155' }}>
            <Statistic
              title="处理中"
              value={processingCount}
              prefix={<EditOutlined style={{ color: '#1890ff' }} />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card style={{ background: '#0f172a', border: '1px solid #334155' }}>
            <Statistic
              title="已解决"
              value={resolvedCount}
              prefix={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
              valueStyle={{ color: '#52c41a' }}
              suffix={state.problems.length > 0 ? `(${(resolvedCount / state.problems.length * 100).toFixed(0)}%)` : ''}
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card style={{ background: '#0f172a', border: '1px solid #334155' }}>
            <Statistic
              title="新增问题"
              value={isNewCount}
              prefix={<PlusOutlined style={{ color: '#34d399' }} />}
              valueStyle={{ color: '#34d399' }}
            />
          </Card>
        </Col>
      </Row>

      <Card
        style={{ background: '#1e293b', border: '1px solid #334155', marginBottom: 20 }}
        title={
          <Space>
            <EyeOutlined style={{ color: '#1890ff' }} />
            <span>复核看板</span>
          </Space>
        }
        extra={
          <Segmented
            value={viewMode}
            onChange={(val) => setViewMode(val as 'list' | 'kanban')}
            options={[
              { label: '列表视图', value: 'list' },
              { label: '看板视图', value: 'kanban' },
            ]}
          />
        }
      >
        {viewMode === 'kanban' ? (
          <Row gutter={16}>
            <Col span={6}>
              <Card
                size="small"
                style={{ background: '#0f172a', border: '1px solid #34d399', height: '100%' }}
                title={
                  <Space>
                    <PlusOutlined style={{ color: '#34d399' }} />
                    <span>{ProblemGroupTypeLabels.new}</span>
                    <Tag color="green" style={{ marginLeft: 0 }}>{newProblems.length}</Tag>
                  </Space>
                }
              >
                <List
                  size="small"
                  dataSource={newProblems}
                  locale={{ emptyText: '暂无数据' }}
                  renderItem={(item) => (
                    <List.Item
                      onClick={() => handleViewDetail(item)}
                      style={{ 
                        cursor: 'pointer', 
                        padding: '8px 4px', 
                        borderBottom: '1px solid #334155',
                        background: '#064e3b20'
                      }}
                    >
                      <Space direction="vertical" size={4} style={{ width: '100%' }}>
                        <Space size={4}>
                          <Tag color={severityColors[item.severity]} style={{ fontSize: 11, padding: '0 4px' }}>
                            {ProblemTypeLabels[item.type]}
                          </Tag>
                          <Tag color="green" style={{ fontSize: 11, padding: '0 4px' }}>新增</Tag>
                        </Space>
                        <div style={{ fontSize: 12, color: '#cbd5e1', lineHeight: 1.4 }}>
                          {item.description.length > 60 ? item.description.slice(0, 60) + '...' : item.description}
                        </div>
                      </Space>
                    </List.Item>
                  )}
                />
              </Card>
            </Col>
            <Col span={6}>
              <Card
                size="small"
                style={{ background: '#0f172a', border: '1px solid #faad14', height: '100%' }}
                title={
                  <Space>
                    <ClockCircleOutlined style={{ color: '#faad14' }} />
                    <span>{ProblemGroupTypeLabels.still_exists}</span>
                    <Tag color="orange" style={{ marginLeft: 0 }}>{stillExistProblems.length}</Tag>
                  </Space>
                }
              >
                <List
                  size="small"
                  dataSource={stillExistProblems}
                  locale={{ emptyText: '暂无数据' }}
                  renderItem={(item) => (
                    <List.Item
                      onClick={() => handleViewDetail(item)}
                      style={{ cursor: 'pointer', padding: '8px 4px', borderBottom: '1px solid #334155' }}
                    >
                      <Space direction="vertical" size={4} style={{ width: '100%' }}>
                        <Space size={4}>
                          <Tag color={severityColors[item.severity]} style={{ fontSize: 11, padding: '0 4px' }}>
                            {ProblemTypeLabels[item.type]}
                          </Tag>
                          <Tag color="red" style={{ fontSize: 11, padding: '0 4px' }}>待处理</Tag>
                        </Space>
                        <div style={{ fontSize: 12, color: '#cbd5e1', lineHeight: 1.4 }}>
                          {item.description.length > 60 ? item.description.slice(0, 60) + '...' : item.description}
                        </div>
                      </Space>
                    </List.Item>
                  )}
                />
              </Card>
            </Col>
            <Col span={6}>
              <Card
                size="small"
                style={{ background: '#0f172a', border: '1px solid #52c41a', height: '100%' }}
                title={
                  <Space>
                    <CheckCircleOutlined style={{ color: '#52c41a' }} />
                    <span>{ProblemGroupTypeLabels.resolved}</span>
                    <Tag color="green" style={{ marginLeft: 0 }}>{resolvedProblems.length}</Tag>
                  </Space>
                }
              >
                <List
                  size="small"
                  dataSource={resolvedProblems}
                  locale={{ emptyText: '暂无数据' }}
                  renderItem={(item) => (
                    <List.Item
                      onClick={() => handleViewDetail(item)}
                      style={{ cursor: 'pointer', padding: '8px 4px', borderBottom: '1px solid #334155' }}
                    >
                      <Space direction="vertical" size={4} style={{ width: '100%' }}>
                        <Space size={4}>
                          <Tag color={severityColors[item.severity]} style={{ fontSize: 11, padding: '0 4px' }}>
                            {ProblemTypeLabels[item.type]}
                          </Tag>
                          <Tag color="green" style={{ fontSize: 11, padding: '0 4px' }}>已解决</Tag>
                        </Space>
                        <div style={{ fontSize: 12, color: '#cbd5e1', lineHeight: 1.4 }}>
                          {item.description.length > 60 ? item.description.slice(0, 60) + '...' : item.description}
                        </div>
                      </Space>
                    </List.Item>
                  )}
                />
              </Card>
            </Col>
            <Col span={6}>
              <Card
                size="small"
                style={{ background: '#0f172a', border: '1px solid #ff4d4f', height: '100%' }}
                title={
                  <Space>
                    <ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />
                    <span>{ProblemGroupTypeLabels.still_abnormal_after_handle}</span>
                    <Tag color="red" style={{ marginLeft: 0 }}>{stillAbnormalProblems.length}</Tag>
                  </Space>
                }
              >
                <List
                  size="small"
                  dataSource={stillAbnormalProblems}
                  locale={{ emptyText: '暂无数据' }}
                  renderItem={(item) => (
                    <List.Item
                      onClick={() => handleViewDetail(item)}
                      style={{ cursor: 'pointer', padding: '8px 4px', borderBottom: '1px solid #334155' }}
                    >
                      <Space direction="vertical" size={4} style={{ width: '100%' }}>
                        <Space size={4}>
                          <Tag color={severityColors[item.severity]} style={{ fontSize: 11, padding: '0 4px' }}>
                            {ProblemTypeLabels[item.type]}
                          </Tag>
                          <Tag color={item.status === 'processing' ? 'orange' : 'red'} style={{ fontSize: 11, padding: '0 4px' }}>
                            {ProblemStatusLabels[item.status]}
                          </Tag>
                        </Space>
                        <div style={{ fontSize: 12, color: '#cbd5e1', lineHeight: 1.4 }}>
                          {item.description.length > 60 ? item.description.slice(0, 60) + '...' : item.description}
                        </div>
                      </Space>
                    </List.Item>
                  )}
                />
              </Card>
            </Col>
          </Row>
        ) : (
          <div style={{ color: '#64748b', textAlign: 'center', padding: '20px 0' }}>
            请切换至「看板视图」查看分组
          </div>
        )}
      </Card>

      <Card
        style={{ background: '#1e293b', border: '1px solid #334155' }}
        title={
          <Space>
            <WarningOutlined style={{ color: '#faad14' }} />
            <span>问题清单</span>
            <Tag color="orange">{filteredProblems.length} 条</Tag>
          </Space>
        }
        extra={
          <Space>
            <Input
              placeholder="搜索问题描述/证照名称"
              prefix={<SearchOutlined />}
              value={searchText}
              onChange={e => setSearchText(e.target.value)}
              style={{ width: 220 }}
              size="small"
            />
            <Select
              size="small"
              style={{ width: 150 }}
              placeholder="全局处理人"
              allowClear
              showSearch
              value={handlerName || undefined}
              onChange={(val) => setHandlerName(val || '')}
              filterOption={(input, option) =>
                (option?.children as unknown as string)?.toLowerCase().includes(input.toLowerCase())
              }
            >
              {handlerOptions.map(name => (
                <Option key={name} value={name}>{name}</Option>
              ))}
            </Select>
            <Select
              size="small"
              style={{ width: 130 }}
              value={typeFilter}
              onChange={setTypeFilter}
              suffixIcon={<FilterOutlined />}
            >
              <Option value="all">全部类型</Option>
              {Object.entries(ProblemTypeLabels).map(([value, label]) => (
                <Option key={value} value={value}>
                  {label}
                </Option>
              ))}
            </Select>
            <Select
              size="small"
              style={{ width: 110 }}
              value={statusFilter}
              onChange={setStatusFilter}
            >
              <Option value="all">全部状态</Option>
              {Object.entries(ProblemStatusLabels).map(([value, label]) => (
                <Option key={value} value={value}>
                  {label}
                </Option>
              ))}
            </Select>
            <Select
              size="small"
              style={{ width: 100 }}
              value={severityFilter}
              onChange={setSeverityFilter}
            >
              <Option value="all">全部等级</Option>
              <Option value="high">高风险</Option>
              <Option value="medium">中风险</Option>
              <Option value="low">低风险</Option>
            </Select>
            <Button size="small" type="primary">
              导出问题清单
            </Button>
          </Space>
        }
      >
        <Table
          columns={columns}
          dataSource={filteredProblems}
          rowKey="id"
          size="small"
          scroll={{ x: 1410 }}
          onRow={(record: AuditProblem) => ({
            style: record.isNewProblem ? { background: '#064e3b20' } : {},
          })}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showTotal: total => `共 ${total} 条问题`,
          }}
        />
      </Card>

      <Drawer
        title="问题详情"
        width={640}
        open={detailVisible}
        onClose={() => setDetailVisible(false)}
        extra={
          <Space>
            <Button size="small" onClick={() => {
              if (selectedProblem) handleProcess(selectedProblem);
              setDetailVisible(false);
            }}>
              处理问题
            </Button>
          </Space>
        }
      >
        {selectedProblem && (
          <>
            <Card
              size="small"
              style={{ marginBottom: 16, background: '#0f172a', border: `1px solid ${selectedProblem.severity === 'high' ? '#7f1d1d' : selectedProblem.severity === 'medium' ? '#92400e' : '#1e40af'}` }}
              title={
                <Space>
                  {problemTypeIcons[selectedProblem.type]}
                  <span>{ProblemTypeLabels[selectedProblem.type]}</span>
                  <Tag color={severityColors[selectedProblem.severity]}>
                    {severityLabels[selectedProblem.severity]}
                  </Tag>
                  <Tag color={selectedProblem.status === 'resolved' ? 'green' : selectedProblem.status === 'processing' ? 'orange' : 'red'}>
                    {ProblemStatusLabels[selectedProblem.status]}
                  </Tag>
                </Space>
              }
            >
              <div style={{ fontSize: 14, lineHeight: 1.8 }}>
                {selectedProblem.description}
              </div>
            </Card>

            <Divider style={{ borderColor: '#334155' }} />

            <div style={{ marginBottom: 12, fontWeight: 500 }}>关联信息</div>
            
            {getFileById(selectedProblem.fileId) && (
              <Card size="small" style={{ marginBottom: 12 }} title="关联证照">
                <Descriptions size="small" column={2} labelStyle={{ color: '#64748b' }}>
                  <Descriptions.Item label="文件名称">
                    {getFileById(selectedProblem.fileId)?.name}
                  </Descriptions.Item>
                  <Descriptions.Item label="证照类型">
                    {LicenseTypeLabels[getFileById(selectedProblem.fileId)!.type]}
                  </Descriptions.Item>
                  <Descriptions.Item label="证照编号">
                    {getFileById(selectedProblem.fileId)?.licenseNumber || '未填写'}
                  </Descriptions.Item>
                  <Descriptions.Item label="有效期至">
                    {getFileById(selectedProblem.fileId)?.expiryDate || '未填写'}
                  </Descriptions.Item>
                </Descriptions>
              </Card>
            )}

            {selectedProblem.materialId && getMaterialById(selectedProblem.materialId) && (
              <Card size="small" style={{ marginBottom: 12 }} title="关联材料">
                <Descriptions size="small" column={2} labelStyle={{ color: '#64748b' }}>
                  <Descriptions.Item label="材料名称">
                    {getMaterialById(selectedProblem.materialId)?.name}
                  </Descriptions.Item>
                  <Descriptions.Item label="规格">
                    {getMaterialById(selectedProblem.materialId)?.specification || '-'}
                  </Descriptions.Item>
                  <Descriptions.Item label="生产厂家">
                    {getMaterialById(selectedProblem.materialId)?.manufacturer || '-'}
                  </Descriptions.Item>
                  <Descriptions.Item label="供应商">
                    {getMaterialById(selectedProblem.materialId)?.supplier || '-'}
                  </Descriptions.Item>
                </Descriptions>
              </Card>
            )}

            <Divider style={{ borderColor: '#334155' }} />

            <div style={{ marginBottom: 12, fontWeight: 500 }}>处理记录</div>
            <Descriptions size="small" column={2} labelStyle={{ color: '#64748b' }}>
              <Descriptions.Item label="发现日期">
                {selectedProblem.createdAt}
              </Descriptions.Item>
              <Descriptions.Item label="更新日期">
                {selectedProblem.updatedAt}
              </Descriptions.Item>
              <Descriptions.Item label="处理意见" span={2}>
                {selectedProblem.handlerOpinion || (
                  <span style={{ color: '#64748b' }}>暂无处理意见</span>
                )}
              </Descriptions.Item>
            </Descriptions>
            {(selectedProblem.lastHandledAt || selectedProblem.lastHandledBy || selectedProblem.previousStatus || selectedProblem.previousOpinion) && (
              <>
                <Divider style={{ borderColor: '#334155', margin: '12px 0' }} />
                <div style={{ marginBottom: 12, fontWeight: 500 }}>上次处理记录</div>
                <Descriptions size="small" column={2} labelStyle={{ color: '#64748b' }}>
                  {selectedProblem.lastHandledAt && (
                    <Descriptions.Item label="上次处理时间">
                      {selectedProblem.lastHandledAt}
                    </Descriptions.Item>
                  )}
                  {selectedProblem.lastHandledBy && (
                    <Descriptions.Item label="上次处理人">
                      {selectedProblem.lastHandledBy}
                    </Descriptions.Item>
                  )}
                  {selectedProblem.previousStatus && (
                    <Descriptions.Item label="上次状态">
                      <span style={{ textDecoration: 'line-through', color: '#64748b' }}>
                        {ProblemStatusLabels[selectedProblem.previousStatus]}
                      </span>
                    </Descriptions.Item>
                  )}
                  {selectedProblem.previousOpinion && (
                    <Descriptions.Item label="上次意见" span={selectedProblem.previousStatus ? 1 : 2}>
                      {selectedProblem.previousOpinion}
                    </Descriptions.Item>
                  )}
                </Descriptions>
              </>
            )}

            <Divider style={{ borderColor: '#334155', margin: '12px 0' }} />
            <div style={{ marginBottom: 12, fontWeight: 500 }}>最近两次处理痕迹</div>
            {(() => {
              let history: OpinionHistoryItem[] = [];
              if (selectedProblem.opinionHistory && selectedProblem.opinionHistory.length > 0) {
                history = [...selectedProblem.opinionHistory].slice(-2).reverse();
              } else if (selectedProblem.lastHandledAt || selectedProblem.handlerOpinion || selectedProblem.lastHandledBy) {
                history = [{
                  id: 'current',
                  status: selectedProblem.status,
                  opinion: selectedProblem.handlerOpinion,
                  handledBy: selectedProblem.lastHandledBy || selectedProblem.handledBy,
                  handledAt: selectedProblem.lastHandledAt || selectedProblem.updatedAt,
                }];
              }

              if (history.length === 0) {
                return <div style={{ color: '#64748b', fontSize: 13, padding: '8px 0' }}>暂无处理记录</div>;
              }

              return (
                <Timeline
                  mode="left"
                  style={{ paddingLeft: 8 }}
                  items={history.map((item) => ({
                    color: item.status === 'resolved' ? 'green' : item.status === 'processing' ? 'blue' : 'gray',
                    label: <span style={{ color: '#94a3b8', fontSize: 12 }}>{item.handledAt}</span>,
                    children: (
                      <div style={{ paddingBottom: 8 }}>
                        <Space size={8} style={{ marginBottom: 4 }}>
                          {item.handledBy && (
                            <span style={{ fontSize: 13, color: '#e2e8f0', fontWeight: 500 }}>
                              {item.handledBy}
                            </span>
                          )}
                          <Tag
                            color={item.status === 'resolved' ? 'green' : item.status === 'processing' ? 'orange' : 'red'}
                            style={{ fontSize: 11, padding: '0 6px', margin: 0 }}
                          >
                            {ProblemStatusLabels[item.status]}
                          </Tag>
                        </Space>
                        {item.opinion && (
                          <div style={{ fontSize: 12, color: '#cbd5e1', marginTop: 4, lineHeight: 1.6 }}>
                            {item.opinion}
                          </div>
                        )}
                      </div>
                    ),
                  }))}
                />
              );
            })()}
          </>
        )}
      </Drawer>

      <Modal
        title="处理问题"
        open={handleModalVisible}
        onOk={handleProcessSubmit}
        onCancel={() => {
          setHandleModalVisible(false);
          setSelectedProblem(null);
          handleForm.resetFields();
        }}
        width={520}
        okText="保存"
        cancelText="取消"
      >
        <Form form={handleForm} layout="vertical" style={{ marginTop: 16 }}>
          <div style={{ marginBottom: 16, padding: 12, background: '#0f172a', borderRadius: 4, border: '1px solid #334155' }}>
            <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>问题描述</div>
            <div>{selectedProblem?.description}</div>
          </div>

          <Form.Item
            label="处理状态"
            name="status"
            rules={[{ required: true, message: '请选择处理状态' }]}
          >
            <Radio.Group>
              <Radio.Button value="pending">待处理</Radio.Button>
              <Radio.Button value="processing">处理中</Radio.Button>
              <Radio.Button value="resolved">已解决</Radio.Button>
            </Radio.Group>
          </Form.Item>

          <Form.Item
            label="处理人"
            name="handler"
            rules={[{ required: true, message: '请输入或选择处理人' }]}
          >
            <Select
              placeholder="请输入或选择处理人"
              showSearch
              allowClear
              filterOption={(input, option) =>
                (option?.children as unknown as string)?.toLowerCase().includes(input.toLowerCase())
              }
            >
              {handlerOptions.map(name => (
                <Option key={name} value={name}>{name}</Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item label="处理意见" name="opinion">
            <TextArea rows={4} placeholder="请输入处理意见..." />
          </Form.Item>

          <div style={{ marginBottom: 8, fontSize: 12, color: '#64748b' }}>
            快捷选择：
          </div>
          <Space wrap style={{ marginBottom: 16 }}>
            {quickSuggestions.map(suggestion => (
              <Tag
                key={suggestion}
                color="blue"
                style={{ cursor: 'pointer', padding: '4px 12px' }}
                onClick={() => {
                  const current = handleForm.getFieldValue('opinion') || '';
                  handleForm.setFieldsValue({
                    opinion: current ? current + '；' + suggestion : suggestion,
                  });
                }}
              >
                + {suggestion}
              </Tag>
            ))}
          </Space>
        </Form>
      </Modal>
    </div>
  );
};

export default ProblemList;
