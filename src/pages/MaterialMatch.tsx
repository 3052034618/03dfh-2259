import React, { useState } from 'react';
import {
  Card,
  Table,
  Button,
  Tag,
  Modal,
  Form,
  Select,
  Input,
  Space,
  message,
  Popconfirm,
  Drawer,
  Descriptions,
  List,
  Tooltip,
  Row,
  Col,
  Statistic,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  AppstoreOutlined,
  MedicineBoxOutlined,
  FileTextOutlined,
  LinkOutlined,
  CloseOutlined,
  SafetyCertificateOutlined,
  SearchOutlined,
  FilterOutlined,
} from '@ant-design/icons';
import { useApp } from '../context/AppContext';
import {
  Material,
  MaterialCategory,
  MaterialCategoryLabels,
  LicenseFile,
  LicenseTypeLabels,
} from '../types';

const { Option } = Select;

const MaterialMatch: React.FC = () => {
  const { state, addMaterial, updateMaterial, deleteMaterial, getFileById, updateFile } = useApp();
  const [modalVisible, setModalVisible] = useState(false);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<Material | null>(null);
  const [selectedMaterial, setSelectedMaterial] = useState<Material | null>(null);
  const [form] = Form.useForm();
  const [searchText, setSearchText] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<MaterialCategory | 'all'>('all');

  const handleAdd = () => {
    setEditingMaterial(null);
    form.resetFields();
    setModalVisible(true);
  };

  const handleEdit = (material: Material) => {
    setEditingMaterial(material);
    form.setFieldsValue(material);
    setModalVisible(true);
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      
      if (editingMaterial) {
        updateMaterial({ ...editingMaterial, ...values });
        message.success('材料信息已更新');
      } else {
        addMaterial(values);
        message.success('材料已添加');
      }
      
      setModalVisible(false);
      setEditingMaterial(null);
      form.resetFields();
    } catch (e) {
      console.error(e);
    }
  };

  const handleDelete = (materialId: string) => {
    deleteMaterial(materialId);
    message.success('已删除');
  };

  const handleViewDetail = (material: Material) => {
    setSelectedMaterial(material);
    setDrawerVisible(true);
  };

  const handleLinkFile = (fileId: string) => {
    if (!selectedMaterial) return;
    
    const updatedMaterial: Material = {
      ...selectedMaterial,
      licenseFiles: [...selectedMaterial.licenseFiles, fileId],
    };
    updateMaterial(updatedMaterial);
    setSelectedMaterial(updatedMaterial);
    
    const file = getFileById(fileId);
    if (file && file.status === 'pending') {
      updateFile({ ...file, status: 'matched' });
    }
    
    message.success('已关联证照');
  };

  const handleUnlinkFile = (fileId: string) => {
    if (!selectedMaterial) return;
    
    const updatedMaterial: Material = {
      ...selectedMaterial,
      licenseFiles: selectedMaterial.licenseFiles.filter(id => id !== fileId),
    };
    updateMaterial(updatedMaterial);
    setSelectedMaterial(updatedMaterial);
    message.success('已解除关联');
  };

  const filteredMaterials = state.materials.filter(m => {
    const matchesSearch = m.name.toLowerCase().includes(searchText.toLowerCase()) ||
      m.manufacturer?.toLowerCase().includes(searchText.toLowerCase()) ||
      m.supplier?.toLowerCase().includes(searchText.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || m.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const availableFiles = state.files.filter(
    f => !selectedMaterial?.licenseFiles.includes(f.id)
  );

  const categoryColors: Record<MaterialCategory, string> = {
    water_light_needle: 'cyan',
    filler: 'purple',
    repair_dressing: 'green',
    disinfection_supply: 'orange',
  };

  const columns = [
    {
      title: '材料名称',
      dataIndex: 'name',
      key: 'name',
      width: 260,
      render: (text: string, record: Material) => (
        <a onClick={() => handleViewDetail(record)}>{text}</a>
      ),
    },
    {
      title: '分类',
      dataIndex: 'category',
      key: 'category',
      width: 120,
      render: (category: MaterialCategory) => (
        <Tag color={categoryColors[category]}>
          {MaterialCategoryLabels[category]}
        </Tag>
      ),
    },
    {
      title: '规格',
      dataIndex: 'specification',
      key: 'specification',
      width: 150,
    },
    {
      title: '生产厂家',
      dataIndex: 'manufacturer',
      key: 'manufacturer',
      width: 220,
    },
    {
      title: '供应商',
      dataIndex: 'supplier',
      key: 'supplier',
      width: 180,
    },
    {
      title: '关联证照',
      dataIndex: 'licenseFiles',
      key: 'licenseFiles',
      width: 120,
      align: 'center' as const,
      render: (files: string[]) => (
        <Tag color={files.length > 0 ? 'blue' : 'default'}>
          {files.length} 个
        </Tag>
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 180,
      fixed: 'right' as const,
      render: (_: any, record: Material) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            icon={<LinkOutlined />}
            onClick={() => handleViewDetail(record)}
          >
            匹配证照
          </Button>
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
            编辑
          </Button>
          <Popconfirm
            title="确认删除该材料？"
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

  const totalMaterials = state.materials.length;
  const matchedMaterials = state.materials.filter(m => m.licenseFiles.length > 0).length;
  const fullyMatched = state.materials.filter(m => m.licenseFiles.length >= 3).length;

  return (
    <div style={{ padding: '16px 0' }}>
      <Row gutter={16} style={{ marginBottom: 20 }}>
        <Col span={6}>
          <Card style={{ background: '#0f172a', border: '1px solid #334155' }}>
            <Statistic
              title="材料总数"
              value={totalMaterials}
              prefix={<AppstoreOutlined style={{ color: '#60a5fa' }} />}
              valueStyle={{ color: '#e2e8f0' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card style={{ background: '#0f172a', border: '1px solid #334155' }}>
            <Statistic
              title="已匹配证照"
              value={matchedMaterials}
              prefix={<LinkOutlined style={{ color: '#52c41a' }} />}
              valueStyle={{ color: '#52c41a' }}
              suffix={`/ ${totalMaterials}`}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card style={{ background: '#0f172a', border: '1px solid #334155' }}>
            <Statistic
              title="证照齐全"
              value={fullyMatched}
              prefix={<SafetyCertificateOutlined style={{ color: '#13c2c2' }} />}
              valueStyle={{ color: '#13c2c2' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card style={{ background: '#0f172a', border: '1px solid #334155' }}>
            <Statistic
              title="未匹配文件"
              value={state.files.filter(f => f.status === 'pending').length}
              prefix={<FileTextOutlined style={{ color: '#faad14' }} />}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
      </Row>

      <Card
        style={{ background: '#1e293b', border: '1px solid #334155' }}
        title={
          <Space>
            <MedicineBoxOutlined style={{ color: '#60a5fa' }} />
            <span>材料管理</span>
          </Space>
        }
        extra={
          <Space>
            <Input
              placeholder="搜索材料名称/厂家"
              prefix={<SearchOutlined />}
              value={searchText}
              onChange={e => setSearchText(e.target.value)}
              style={{ width: 220 }}
              size="small"
            />
            <Select
              size="small"
              style={{ width: 140 }}
              value={categoryFilter}
              onChange={setCategoryFilter}
              suffixIcon={<FilterOutlined />}
            >
              <Option value="all">全部分类</Option>
              {Object.entries(MaterialCategoryLabels).map(([value, label]) => (
                <Option key={value} value={value}>
                  {label}
                </Option>
              ))}
            </Select>
            <Button type="primary" size="small" icon={<PlusOutlined />} onClick={handleAdd}>
              添加材料
            </Button>
          </Space>
        }
      >
        <Table
          columns={columns}
          dataSource={filteredMaterials}
          rowKey="id"
          size="small"
          scroll={{ x: 1200 }}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showTotal: total => `共 ${total} 种材料`,
          }}
          expandable={{
            expandedRowRender: (record) => (
              <div style={{ padding: '8px 0' }}>
                <div style={{ marginBottom: 8, color: '#94a3b8' }}>已关联证照文件：</div>
                {record.licenseFiles.length > 0 ? (
                  <Space wrap>
                    {record.licenseFiles.map(fileId => {
                      const file = getFileById(fileId);
                      return file ? (
                        <Tag key={fileId} color="blue" style={{ padding: '4px 12px' }}>
                          <FileTextOutlined /> {file.name}
                        </Tag>
                      ) : null;
                    })}
                  </Space>
                ) : (
                  <span style={{ color: '#64748b' }}>暂无关联证照，请点击"匹配证照"添加</span>
                )}
              </div>
            ),
          }}
        />
      </Card>

      <Modal
        title={editingMaterial ? '编辑材料' : '添加材料'}
        open={modalVisible}
        onOk={handleSubmit}
        onCancel={() => {
          setModalVisible(false);
          setEditingMaterial(null);
          form.resetFields();
        }}
        width={560}
        okText="保存"
        cancelText="取消"
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item
            label="材料名称"
            name="name"
            rules={[{ required: true, message: '请输入材料名称' }]}
          >
            <Input placeholder="请输入材料名称" />
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="材料分类"
                name="category"
                rules={[{ required: true, message: '请选择分类' }]}
              >
                <Select placeholder="请选择分类">
                  {Object.entries(MaterialCategoryLabels).map(([value, label]) => (
                    <Option key={value} value={value}>
                      {label}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="规格型号" name="specification">
                <Input placeholder="如：1.0ml/支" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item label="生产厂家" name="manufacturer">
            <Input placeholder="请输入生产厂家名称" />
          </Form.Item>
          <Form.Item label="供应商" name="supplier">
            <Input placeholder="请输入供应商名称" />
          </Form.Item>
        </Form>
      </Modal>

      <Drawer
        title={
          <Space>
            <span>证照匹配 - </span>
            <span style={{ color: '#60a5fa' }}>{selectedMaterial?.name}</span>
          </Space>
        }
        width={720}
        open={drawerVisible}
        onClose={() => setDrawerVisible(false)}
        extra={
          <Button type="primary" size="small" onClick={() => setDrawerVisible(false)}>
            完成
          </Button>
        }
      >
        {selectedMaterial && (
          <>
            <Descriptions
              size="small"
              column={2}
              style={{ marginBottom: 16 }}
              labelStyle={{ color: '#64748b' }}
            >
              <Descriptions.Item label="分类">
                <Tag color={categoryColors[selectedMaterial.category]}>
                  {MaterialCategoryLabels[selectedMaterial.category]}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="规格">
                {selectedMaterial.specification || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="生产厂家">
                {selectedMaterial.manufacturer || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="供应商">
                {selectedMaterial.supplier || '-'}
              </Descriptions.Item>
            </Descriptions>

            <Card
              size="small"
              title={
                <Space>
                  <span>已关联证照</span>
                  <Tag color="blue">{selectedMaterial.licenseFiles.length} 个</Tag>
                </Space>
              }
              style={{ marginBottom: 16 }}
            >
              {selectedMaterial.licenseFiles.length > 0 ? (
                <List
                  size="small"
                  dataSource={selectedMaterial.licenseFiles}
                  renderItem={fileId => {
                    const file = getFileById(fileId);
                    if (!file) return null;
                    return (
                      <List.Item
                        actions={[
                          <Tooltip title="解除关联">
                            <Button
                              type="text"
                              size="small"
                              danger
                              icon={<CloseOutlined />}
                              onClick={() => handleUnlinkFile(fileId)}
                            />
                          </Tooltip>,
                        ]}
                      >
                        <List.Item.Meta
                          avatar={<FileTextOutlined style={{ color: '#60a5fa', fontSize: 20 }} />}
                          title={file.name}
                          description={
                            <Space size={4}>
                              <Tag color="blue" style={{ fontSize: 12 }}>
                                {LicenseTypeLabels[file.type]}
                              </Tag>
                              <span style={{ color: '#64748b', fontSize: 12 }}>
                                {file.licenseNumber || '未填写编号'}
                              </span>
                            </Space>
                          }
                        />
                      </List.Item>
                    );
                  }}
                />
              ) : (
                <div style={{ textAlign: 'center', color: '#64748b', padding: '20px 0' }}>
                  暂无关联证照，请从下方列表添加
                </div>
              )}
            </Card>

            <Card
              size="small"
              title={
                <Space>
                  <span>可关联的证照文件</span>
                  <Tag color="orange">{availableFiles.length} 个待匹配</Tag>
                </Space>
              }
            >
              <List
                size="small"
                dataSource={availableFiles}
                renderItem={file => (
                  <List.Item
                    actions={[
                      <Tooltip title="添加关联">
                        <Button
                          type="primary"
                          size="small"
                          icon={<LinkOutlined />}
                          onClick={() => handleLinkFile(file.id)}
                        >
                          添加
                        </Button>
                      </Tooltip>,
                    ]}
                  >
                    <List.Item.Meta
                      avatar={<FileTextOutlined style={{ color: '#faad14', fontSize: 20 }} />}
                      title={file.name}
                      description={
                        <Space size={4}>
                          <Tag color="orange" style={{ fontSize: 12 }}>
                            {LicenseTypeLabels[file.type]}
                          </Tag>
                          <span style={{ color: '#64748b', fontSize: 12 }}>
                            {file.licenseNumber || '未填写编号'}
                          </span>
                        </Space>
                      }
                    />
                  </List.Item>
                )}
                locale={{ emptyText: '没有可关联的文件' }}
              />
            </Card>
          </>
        )}
      </Drawer>
    </div>
  );
};

export default MaterialMatch;
