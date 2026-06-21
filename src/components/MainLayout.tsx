import React, { useState } from 'react';
import { Layout, Tabs, ConfigProvider, theme, Badge, Tag } from 'antd';
import {
  FileAddOutlined,
  AppstoreAddOutlined,
  CalendarOutlined,
  WarningOutlined,
  InboxOutlined,
  FileProtectOutlined,
} from '@ant-design/icons';
import FileImport from '../pages/FileImport';
import MaterialMatch from '../pages/MaterialMatch';
import ExpiryCheck from '../pages/ExpiryCheck';
import ProblemList from '../pages/ProblemList';
import ArchiveExport from '../pages/ArchiveExport';
import { useApp } from '../context/AppContext';

const { Header, Content } = Layout;

const MainLayout: React.FC = () => {
  const { state } = useApp();
  const [activeKey, setActiveKey] = useState('1');

  const problemCount = state.problems.filter(p => p.status !== 'resolved').length;
  const pendingFiles = state.files.filter(f => f.status === 'pending').length;

  const tabItems = [
    {
      key: '1',
      label: (
        <span>
          <FileAddOutlined />
          &nbsp;文件导入
          {pendingFiles > 0 && (
            <Badge
              count={pendingFiles}
              size="small"
              style={{ marginLeft: 8 }}
              color="#faad14"
            />
          )}
        </span>
      ),
      children: <FileImport />,
    },
    {
      key: '2',
      label: (
        <span>
          <AppstoreAddOutlined />
          &nbsp;材料匹配
        </span>
      ),
      children: <MaterialMatch />,
    },
    {
      key: '3',
      label: (
        <span>
          <CalendarOutlined />
          &nbsp;到期校验
        </span>
      ),
      children: <ExpiryCheck />,
    },
    {
      key: '4',
      label: (
        <span>
          <WarningOutlined />
          &nbsp;问题清单
          {problemCount > 0 && (
            <Badge
              count={problemCount}
              size="small"
              style={{ marginLeft: 8 }}
              color="#ff4d4f"
            />
          )}
        </span>
      ),
      children: <ProblemList />,
    },
    {
      key: '5',
      label: (
        <span>
          <InboxOutlined />
          &nbsp;归档导出
        </span>
      ),
      children: <ArchiveExport />,
    },
  ];

  return (
    <ConfigProvider
      theme={{
        algorithm: theme.darkAlgorithm,
        token: {
          colorPrimary: '#1677ff',
          borderRadius: 4,
          fontSize: 13,
          colorBgLayout: '#0f172a',
          colorBgContainer: '#1e293b',
          colorBgElevated: '#334155',
          colorBorder: '#475569',
          colorText: '#e2e8f0',
          colorTextSecondary: '#94a3b8',
          colorTextTertiary: '#64748b',
        },
        components: {
          Table: {
            headerBg: '#334155',
            headerColor: '#e2e8f0',
            rowHoverBg: '#1e293b',
          },
          Tabs: {
            itemColor: '#94a3b8',
            itemActiveColor: '#e2e8f0',
            itemHoverColor: '#cbd5e1',
          },
          Button: {
            controlHeight: 32,
          },
        },
      }}
    >
      <Layout style={{ minHeight: '100vh', background: '#0f172a' }}>
        <Header
          style={{
            background: 'linear-gradient(90deg, #1e3a8a 0%, #0f172a 100%)',
            padding: '0 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid #1e40af',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <FileProtectOutlined style={{ fontSize: 28, color: '#60a5fa' }} />
            <div>
              <div style={{ color: '#fff', fontSize: 18, fontWeight: 600, lineHeight: 1.2 }}>
                证照审查助手
              </div>
              <div style={{ color: '#93c5fd', fontSize: 12 }}>
                医美机构合规管理系统 · v1.0
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <Tag color="blue" style={{ margin: 0 }}>
              审查日期：{state.currentAuditDate}
            </Tag>
            <Tag color="purple" style={{ margin: 0 }}>
              {state.institutionName}
            </Tag>
          </div>
        </Header>
        <Content style={{ padding: '20px 24px' }}>
          <Tabs
            activeKey={activeKey}
            onChange={setActiveKey}
            items={tabItems}
            size="large"
            style={{
              background: '#1e293b',
              borderRadius: 8,
              padding: '0 16px',
              minHeight: 'calc(100vh - 140px)',
            }}
            tabBarStyle={{
              marginBottom: 0,
              paddingTop: 8,
            }}
          />
        </Content>
      </Layout>
    </ConfigProvider>
  );
};

export default MainLayout;
