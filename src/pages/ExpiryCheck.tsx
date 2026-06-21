import React, { useState, useMemo } from 'react';
import {
  Card,
  Table,
  DatePicker,
  InputNumber,
  Button,
  Tag,
  Space,
  Tooltip,
  Progress,
  Row,
  Col,
  Statistic,
  Input,
  Select,
  Alert,
  Divider,
  Modal,
  Form,
  message,
} from 'antd';
import {
  CalendarOutlined,
  WarningOutlined,
  ExclamationCircleOutlined,
  SafetyOutlined,
  SearchOutlined,
  FilterOutlined,
  ReloadOutlined,
  BankOutlined,
  EnvironmentOutlined,
  FileTextOutlined,
  EditOutlined,
} from '@ant-design/icons';
import { useApp } from '../context/AppContext';
import { checkExpiry } from '../utils/storage';
import dayjs from 'dayjs';
import { LicenseType, LicenseTypeLabels, LicenseFile } from '../types';

const { RangePicker } = DatePicker;
const { Option } = Select;

type FilterStatus = 'all' | 'expired' | 'warning' | 'normal';

const ExpiryCheck: React.FC = () => {
  const { state, setAuditDate, setWarningDays, setInstitutionName, updateFile } = useApp();
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('all');
  const [typeFilter, setTypeFilter] = useState<LicenseType | 'all'>('all');
  const [institutionModalVisible, setInstitutionModalVisible] = useState(false);
  const [institutionForm] = Form.useForm();

  const expiryData = useMemo(() => {
    return state.files
      .filter(file => file.expiryDate && file.expiryDate !== '长期有效')
      .map(file => {
        const check = checkExpiry(file.expiryDate, state.currentAuditDate, state.warningDays);
        return {
          ...file,
          daysLeft: check.daysLeft,
          status: check.status,
        };
      })
      .sort((a, b) => (a.daysLeft ?? 0) - (b.daysLeft ?? 0));
  }, [state.files, state.currentAuditDate, state.warningDays]);

  const filteredData = useMemo(() => {
    return expiryData.filter(file => {
      const matchesSearch = file.name.toLowerCase().includes(searchText.toLowerCase()) ||
        file.licenseNumber?.includes(searchText);
      const matchesStatus = statusFilter === 'all' || file.status === statusFilter;
      const matchesType = typeFilter === 'all' || file.type === typeFilter;
      return matchesSearch && matchesStatus && matchesType;
    });
  }, [expiryData, searchText, statusFilter, typeFilter]);

  const expiredCount = expiryData.filter(f => f.status === 'expired').length;
  const warningCount = expiryData.filter(f => f.status === 'warning').length;
  const normalCount = expiryData.filter(f => f.status === 'normal').length;
  const noExpiryCount = state.files.filter(f => !f.expiryDate || f.expiryDate === '长期有效').length;

  const nameMismatchFiles = state.files.filter(f => {
    if (!f.authorizedInstitution) return false;
    return !(f.authorizedInstitution.includes(state.institutionName) || 
             state.institutionName.includes(f.authorizedInstitution));
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'expired': return 'red';
      case 'warning': return 'orange';
      case 'normal': return 'green';
      default: return 'default';
    }
  };

  const getStatusText = (status: string, daysLeft?: number) => {
    switch (status) {
      case 'expired': return `已过期 ${Math.abs(daysLeft!)} 天`;
      case 'warning': return `${daysLeft} 天后到期`;
      case 'normal': return '正常';
      default: return '未知';
    }
  };

  const getProgressColor = (daysLeft?: number) => {
    if (daysLeft === undefined) return '#64748b';
    if (daysLeft < 0) return '#ff4d4f';
    if (daysLeft <= 30) return '#ff4d4f';
    if (daysLeft <= 90) return '#faad14';
    if (daysLeft <= 180) return '#1890ff';
    return '#52c41a';
  };

  const getProgressPercent = (daysLeft?: number) => {
    if (daysLeft === undefined) return 0;
    const maxDays = 365 * 5;
    const percent = Math.max(0, Math.min(100, (daysLeft / maxDays) * 100));
    return percent;
  };

  const columns: any[] = [
    {
      title: '证照名称',
      dataIndex: 'name',
      key: 'name',
      width: 260,
      render: (text: string, record: LicenseFile) => (
        <Space>
          <FileTextOutlined style={{ color: '#60a5fa' }} />
          <span>{text}</span>
        </Space>
      ),
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      width: 140,
      render: (type: LicenseType) => <Tag color="blue">{LicenseTypeLabels[type]}</Tag>,
    },
    {
      title: '证照编号',
      dataIndex: 'licenseNumber',
      key: 'licenseNumber',
      width: 180,
    },
    {
      title: '有效期至',
      dataIndex: 'expiryDate',
      key: 'expiryDate',
      width: 130,
    },
    {
      title: '剩余天数',
      dataIndex: 'daysLeft',
      key: 'daysLeft',
      width: 200,
      render: (daysLeft: number | undefined, record: any) => (
        <Tooltip title={getStatusText(record.status, daysLeft)}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Progress
              percent={getProgressPercent(daysLeft)}
              size="small"
              showInfo={false}
              strokeColor={getProgressColor(daysLeft)}
              style={{ width: 80 }}
            />
            <span style={{ color: getProgressColor(daysLeft), minWidth: 80 }}>
              {daysLeft !== undefined ? `${daysLeft} 天` : '-'}
            </span>
          </div>
        </Tooltip>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (status: string, record: any) => (
        <Tag color={getStatusColor(status)} icon={status === 'expired' ? <ExclamationCircleOutlined /> : status === 'warning' ? <WarningOutlined /> : <SafetyOutlined />}>
          {getStatusText(status, record.daysLeft)}
        </Tag>
      ),
    },
    {
      title: '授权机构',
      dataIndex: 'authorizedInstitution',
      key: 'authorizedInstitution',
      width: 200,
      render: (text: string | undefined, record: any) => {
        const isMismatch = text && !(text.includes(state.institutionName) || state.institutionName.includes(text));
        return (
          <Space>
            <BankOutlined style={{ color: isMismatch ? '#ff4d4f' : '#64748b' }} />
            <span style={{ color: isMismatch ? '#ff4d4f' : undefined }}>
              {text || '未填写'}
            </span>
            {isMismatch && (
              <Tooltip title={`机构名称不一致，本机构为：${state.institutionName}`}>
                <ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />
              </Tooltip>
            )}
          </Space>
        );
      },
    },
    {
      title: '授权区域',
      dataIndex: 'authorizedRegion',
      key: 'authorizedRegion',
      width: 120,
      render: (text?: string) => (
        <Space size={4}>
          <EnvironmentOutlined style={{ color: '#64748b' }} />
          <span>{text || '-'}</span>
        </Space>
      ),
    },
  ];

  const handleAuditDateChange = (date: any) => {
    if (date) {
      setAuditDate(date.format('YYYY-MM-DD'));
    }
  };

  const handleWarningDaysChange = (value: number | null) => {
    if (value !== null) {
      setWarningDays(value);
    }
  };

  const handleInstitutionSubmit = async () => {
    try {
      const values = await institutionForm.validateFields();
      setInstitutionName(values.institutionName);
      setInstitutionModalVisible(false);
      message.success('机构名称已更新');
    } catch (e) {
      console.error(e);
    }
  };

  const sortedExpiryData = [...expiryData].sort((a, b) => (a.daysLeft ?? 9999) - (b.daysLeft ?? 9999));
  const nextExpiring = sortedExpiryData.slice(0, 5);

  return (
    <div style={{ padding: '16px 0' }}>
      <Card
        style={{ background: '#1e293b', border: '1px solid #334155', marginBottom: 16 }}
        title={
          <Space>
            <CalendarOutlined style={{ color: '#60a5fa' }} />
            <span>校验设置</span>
          </Space>
        }
      >
        <Row gutter={24} align="middle">
          <Col span={6}>
            <div style={{ color: '#94a3b8', fontSize: 12, marginBottom: 4 }}>审查日期</div>
            <DatePicker
              value={dayjs(state.currentAuditDate)}
              onChange={handleAuditDateChange}
              style={{ width: '100%' }}
            />
          </Col>
          <Col span={6}>
            <div style={{ color: '#94a3b8', fontSize: 12, marginBottom: 4 }}>到期预警天数</div>
            <InputNumber
              min={1}
              max={365}
              value={state.warningDays}
              onChange={handleWarningDaysChange}
              style={{ width: '100%' }}
              addonAfter="天"
            />
          </Col>
          <Col span={8}>
            <div style={{ color: '#94a3b8', fontSize: 12, marginBottom: 4 }}>本机构名称</div>
            <Space.Compact style={{ width: '100%' }}>
              <Input value={state.institutionName} readOnly />
              <Button type="primary" icon={<EditOutlined />} onClick={() => {
                institutionForm.setFieldsValue({ institutionName: state.institutionName });
                setInstitutionModalVisible(true);
              }}>
                修改
              </Button>
            </Space.Compact>
          </Col>
          <Col span={4}>
            <Button
              icon={<ReloadOutlined />}
              onClick={() => message.success('已重新校验')}
              block
            >
              重新校验
            </Button>
          </Col>
        </Row>
      </Card>

      {nameMismatchFiles.length > 0 && (
        <Alert
          message={`检测到 ${nameMismatchFiles.length} 个证照的授权机构名称与本机构不一致`}
          type="error"
          showIcon
          style={{ marginBottom: 16 }}
          action={
            <Button size="small" type="primary" danger>
              查看详情
            </Button>
          }
        />
      )}

      <Row gutter={16} style={{ marginBottom: 20 }}>
        <Col span={5}>
          <Card style={{ background: '#0f172a', border: '1px solid #334155' }}>
            <Statistic
              title="已过期"
              value={expiredCount}
              prefix={<ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />}
              valueStyle={{ color: '#ff4d4f' }}
            />
          </Card>
        </Col>
        <Col span={5}>
          <Card style={{ background: '#0f172a', border: '1px solid #334155' }}>
            <Statistic
              title="即将到期"
              value={warningCount}
              prefix={<WarningOutlined style={{ color: '#faad14' }} />}
              valueStyle={{ color: '#faad14' }}
              suffix={`/ ${state.warningDays}天内`}
            />
          </Card>
        </Col>
        <Col span={5}>
          <Card style={{ background: '#0f172a', border: '1px solid #334155' }}>
            <Statistic
              title="有效期内"
              value={normalCount}
              prefix={<SafetyOutlined style={{ color: '#52c41a' }} />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col span={5}>
          <Card style={{ background: '#0f172a', border: '1px solid #334155' }}>
            <Statistic
              title="长期有效/未填"
              value={noExpiryCount}
              prefix={<CalendarOutlined style={{ color: '#64748b' }} />}
              valueStyle={{ color: '#94a3b8' }}
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card style={{ background: '#0f172a', border: '1px solid #334155' }}>
            <Statistic
              title="名称不一致"
              value={nameMismatchFiles.length}
              prefix={<BankOutlined style={{ color: nameMismatchFiles.length > 0 ? '#ff4d4f' : '#64748b' }} />}
              valueStyle={{ color: nameMismatchFiles.length > 0 ? '#ff4d4f' : '#64748b' }}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col span={16}>
          <Card
            style={{ background: '#1e293b', border: '1px solid #334155', height: '100%' }}
            title={
              <Space>
                <span>有效期校验列表</span>
                <Tag color="blue">{filteredData.length} 条</Tag>
              </Space>
            }
            extra={
              <Space>
                <Input
                  placeholder="搜索证照名称/编号"
                  prefix={<SearchOutlined />}
                  value={searchText}
                  onChange={e => setSearchText(e.target.value)}
                  style={{ width: 200 }}
                  size="small"
                />
                <Select
                  size="small"
                  style={{ width: 120 }}
                  value={statusFilter}
                  onChange={setStatusFilter}
                  suffixIcon={<FilterOutlined />}
                >
                  <Option value="all">全部状态</Option>
                  <Option value="expired">已过期</Option>
                  <Option value="warning">即将到期</Option>
                  <Option value="normal">正常</Option>
                </Select>
                <Select
                  size="small"
                  style={{ width: 150 }}
                  value={typeFilter}
                  onChange={setTypeFilter}
                >
                  <Option value="all">全部类型</Option>
                  {Object.entries(LicenseTypeLabels).map(([value, label]) => (
                    <Option key={value} value={value}>
                      {label}
                    </Option>
                  ))}
                </Select>
              </Space>
            }
          >
            <Table
              columns={columns}
              dataSource={filteredData}
              rowKey="id"
              size="small"
              scroll={{ x: 1350 }}
              pagination={{
                pageSize: 10,
                showSizeChanger: true,
                showTotal: total => `共 ${total} 条记录`,
              }}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card
            style={{ background: '#1e293b', border: '1px solid #334155' }}
            title={
              <Space>
                <WarningOutlined style={{ color: '#faad14' }} />
                <span>近期到期提醒</span>
              </Space>
            }
          >
            <div style={{ fontSize: 12, color: '#64748b', marginBottom: 12 }}>
              按剩余天数排序，前 5 个即将到期的证照
            </div>
            {nextExpiring.length > 0 ? (
              <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                {nextExpiring.map((file, index) => (
                  <div
                    key={file.id}
                    style={{
                      padding: 12,
                      background: '#0f172a',
                      borderRadius: 6,
                      border: `1px solid ${file.status === 'expired' ? '#7f1d1d' : file.status === 'warning' ? '#92400e' : '#166534'}`,
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <span style={{ fontWeight: 500, color: '#e2e8f0' }}>
                        {index + 1}. {file.name}
                      </span>
                      <Tag color={getStatusColor(file.status)} style={{ fontSize: 12 }}>
                        {getStatusText(file.status, file.daysLeft)}
                      </Tag>
                    </div>
                    <div style={{ fontSize: 12, color: '#64748b' }}>
                      {file.licenseNumber || '未填写编号'}
                    </div>
                    <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>
                      有效期至：{file.expiryDate}
                    </div>
                  </div>
                ))}
              </Space>
            ) : (
              <div style={{ textAlign: 'center', color: '#64748b', padding: '40px 0' }}>
                暂无即将到期的证照
              </div>
            )}

            <Divider style={{ borderColor: '#334155', margin: '20px 0 12px' }} />

            <div style={{ fontSize: 13, color: '#94a3b8', marginBottom: 8 }}>
              机构名称核对
            </div>
            <div style={{ fontSize: 12, color: '#64748b', marginBottom: 12 }}>
              本机构名称：<span style={{ color: '#e2e8f0' }}>{state.institutionName}</span>
            </div>
            {nameMismatchFiles.length > 0 ? (
              <Space direction="vertical" size="small" style={{ width: '100%' }}>
                {nameMismatchFiles.slice(0, 3).map(file => (
                  <div
                    key={file.id}
                    style={{
                      padding: 8,
                      background: '#7f1d1d20',
                      borderRadius: 4,
                      fontSize: 12,
                      border: '1px solid #7f1d1d50',
                    }}
                  >
                    <div style={{ color: '#f87171', fontWeight: 500 }}>{file.name}</div>
                    <div style={{ color: '#fca5a5', marginTop: 2 }}>
                      证照载明：{file.authorizedInstitution}
                    </div>
                  </div>
                ))}
                {nameMismatchFiles.length > 3 && (
                  <div style={{ fontSize: 12, color: '#f87171', textAlign: 'center' }}>
                    还有 {nameMismatchFiles.length - 3} 个...
                  </div>
                )}
              </Space>
            ) : (
              <div style={{ padding: 16, textAlign: 'center', color: '#52c41a', background: '#14532d30', borderRadius: 4, border: '1px solid #16653450' }}>
                <SafetyOutlined style={{ fontSize: 24, marginBottom: 4 }} />
                <div>所有证照机构名称一致</div>
              </div>
            )}
          </Card>
        </Col>
      </Row>

      <Modal
        title="修改机构名称"
        open={institutionModalVisible}
        onOk={handleInstitutionSubmit}
        onCancel={() => setInstitutionModalVisible(false)}
        okText="确认"
        cancelText="取消"
      >
        <Form form={institutionForm} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item
            label="本机构名称"
            name="institutionName"
            rules={[{ required: true, message: '请输入机构名称' }]}
          >
            <Input placeholder="请输入本机构全称" />
          </Form.Item>
          <div style={{ color: '#64748b', fontSize: 12 }}>
            提示：系统将自动比对所有证照的授权机构名称，不一致的将标记为问题。
          </div>
        </Form>
      </Modal>
    </div>
  );
};

export default ExpiryCheck;
