import React, { useState, useRef } from 'react';
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
} from '@ant-design/icons';
import type { UploadProps } from 'antd';
import { useApp } from '../context/AppContext';
import {
  LicenseType,
  LicenseTypeLabels,
  FileStatus,
  LicenseFile,
} from '../types';
import { formatFileSize, detectLicenseType } from '../utils/storage';
import dayjs from 'dayjs';

const { Dragger } = Upload;
const { Option } = Select;
const { TextArea } = Input;

const FileImport: React.FC = () => {
  const { state, addFiles, updateFile, deleteFile } = useApp();
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingFile, setEditingFile] = useState<LicenseFile | null>(null);
  const [form] = Form.useForm();
  const [searchText, setSearchText] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload: UploadProps['customRequest'] = (options: any) => {
    const { file, fileList } = options;
    const files = fileList?.map((f: any) => f.originFileObj as File) || [file as File];
    addFiles(files.filter(Boolean));
    message.success(`成功导入 ${files.filter(Boolean).length} 个文件`);
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

  return (
    <div style={{ padding: '16px 0' }}>
      <Row gutter={16} style={{ marginBottom: 20 }}>
        <Col span={6}>
          <Card style={{ background: '#0f172a', border: '1px solid #334155' }}>
            <Statistic
              title="文件总数"
              value={state.files.length}
              prefix={<FileProtectOutlined style={{ color: '#60a5fa' }} />}
              valueStyle={{ color: '#e2e8f0' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card style={{ background: '#0f172a', border: '1px solid #334155' }}>
            <Statistic
              title="待处理"
              value={pendingCount}
              prefix={<ClockCircleOutlined style={{ color: '#faad14' }} />}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card style={{ background: '#0f172a', border: '1px solid #334155' }}>
            <Statistic
              title="已匹配"
              value={matchedCount}
              prefix={<PaperClipOutlined style={{ color: '#1890ff' }} />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card style={{ background: '#0f172a', border: '1px solid #334155' }}>
            <Statistic
              title="已审核"
              value={reviewedCount}
              prefix={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
              valueStyle={{ color: '#52c41a' }}
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
          </p>
        </Dragger>
      </Card>

      <Card
        style={{ background: '#1e293b', border: '1px solid #334155' }}
        title={
          <Space>
            <span>文件列表</span>
            <Tag color="blue">{state.files.length} 个文件</Tag>
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
    </div>
  );
};

export default FileImport;
