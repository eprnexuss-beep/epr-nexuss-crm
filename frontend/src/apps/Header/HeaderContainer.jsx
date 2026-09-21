import { useSelector } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom';
import { Avatar, Dropdown, Layout, Badge, Tooltip, List, Typography, Input } from 'antd';
import { BellOutlined, UserOutlined, LogoutOutlined, ToolOutlined } from '@ant-design/icons';
import { useState, useEffect, useCallback } from 'react';
import storePersist from '@/redux/storePersist';
import { ArrowLeftOutlined } from '@ant-design/icons';

import { selectCurrentAdmin } from '@/redux/auth/selectors';
import { FILE_BASE_URL } from '@/config/serverApiConfig';
import useLanguage from '@/locale/useLanguage';

import UpgradeButton from './UpgradeButton';

const { Text } = Typography;

export default function HeaderContent() {
  const currentAdmin = useSelector(selectCurrentAdmin);
  const { Header } = Layout;
  const translate = useLanguage();
  const navigate = useNavigate();
const handleBack = () => {
  navigate(-1);
};

  const [followUpNotifications, setFollowUpNotifications] = useState([]);
  const [bellVisible, setBellVisible] = useState(false);

  const handleSearch = (value) => {
    if (value.trim()) {
      navigate(`/lead?search=${encodeURIComponent(value.trim())}`);
    }
  };

  // Reusable function to fetch upcoming follow-ups
  const fetchUpcomingFollowUps = useCallback(async () => {
    try {
      const auth = storePersist.get('auth');
      const token = auth?.current?.token;

      const response = await fetch(`${FILE_BASE_URL}lead`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const result = await response.json();

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      let upcoming = [];

      result.data.forEach(lead => {
        if (lead.followUps && lead.followUps.length > 0) {
          const pendingFollowUps = lead.followUps.filter(fu =>
            fu.date && fu.status !== 'done'
          );

          if (pendingFollowUps.length > 0) {
            const sortedFollowUps = pendingFollowUps.sort((a, b) =>
              new Date(b.date) - new Date(a.date)
            );

            const latestUpcoming = sortedFollowUps.find(fu =>
              new Date(fu.date) >= today
            );

            if (latestUpcoming) {
              upcoming.push({
                ...lead,
                followUpDate: latestUpcoming.date,
                followUpMessage: latestUpcoming.message || '',
              });
            }
          }
        }
      });

      console.log('Notifications Updated:', upcoming); // Debug
      setFollowUpNotifications(upcoming);
    } catch (error) {
      console.error('Failed to fetch follow-ups', error);
    }
  }, []);

  useEffect(() => {
    fetchUpcomingFollowUps();
  }, [fetchUpcomingFollowUps]);

  useEffect(() => {
    window.refreshNotifications = fetchUpcomingFollowUps;
    return () => {
      delete window.refreshNotifications;
    };
  }, [fetchUpcomingFollowUps]);

  const ProfileDropdown = () => {
    const navigate = useNavigate();
    return (
      <div className="profileDropdown" onClick={() => navigate('/profile')}>
        <Avatar
          size="large"
          className="last"
          src={currentAdmin?.photo ? FILE_BASE_URL + currentAdmin?.photo : undefined}
          style={{
            color: '#f56a00',
            backgroundColor: currentAdmin?.photo ? 'none' : '#fde3cf',
            boxShadow: 'rgba(150, 190, 238, 0.35) 0px 0px 6px 1px',
          }}
        >
          {currentAdmin?.name?.charAt(0)?.toUpperCase()}
        </Avatar>
        <div className="profileDropdownInfo">
          <p>
            {currentAdmin?.name} {currentAdmin?.surname}
          </p>
          <p>{currentAdmin?.email}</p>
        </div>
      </div>
    );
  };

  const DropdownMenu = ({ text }) => {
    return <span>{text}</span>;
  };

  const items = [
    {
      label: <ProfileDropdown className="headerDropDownMenu" />,
      key: 'ProfileDropdown',
    },
    { type: 'divider' },
    {
      icon: <UserOutlined />,
      key: 'settingProfile',
      label: (
        <Link to={'/profile'}>
          <DropdownMenu text={translate('profile_settings')} />
        </Link>
      ),
    },
    {
      icon: <ToolOutlined />,
      key: 'settingApp',
      label: <Link to={'/settings'}>{translate('app_settings')}</Link>,
    },
    { type: 'divider' },
    {
      icon: <LogoutOutlined />,
      key: 'logout',
      label: <Link to={'/logout'}>{translate('logout')}</Link>,
    },
  ];

  return (
  <Header
    style={{
      padding: '20px',
      background: '#ffffff',
      display: 'flex',
      flexDirection: 'row',          // normal left → right
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: '15px',
    }}
  >
    {/* LEFT SIDE */}
    <Tooltip title="Go back">
      <ArrowLeftOutlined
        onClick={handleBack}
        style={{
          fontSize: '20px',
          cursor: 'pointer',
          padding: '8px',
        }}
      />
    </Tooltip>

    {/* RIGHT SIDE */}
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '15px',
        marginLeft: 'auto',
      }}
    >
      <Input.Search
        placeholder="Search leads by name, phone, email..."
        onSearch={handleSearch}
        style={{ width: 260 }}
        allowClear
      />

      {/* Notification Bell */}
      <Dropdown
        trigger={['click']}
        open={bellVisible}
        onOpenChange={setBellVisible}
        dropdownRender={() => (
          <div
            style={{
              background: '#fff',
              borderRadius: '8px',
              boxShadow: '0 6px 16px rgba(0,0,0,0.1)',
              width: 340,
              maxHeight: 450,
              overflow: 'auto',
            }}
          >
            <div
              style={{
                padding: '12px 16px',
                borderBottom: '1px solid #f0f0f0',
                fontWeight: 'bold',
              }}
            >
              Upcoming Follow-ups ({followUpNotifications.length})
            </div>
            <List
              dataSource={followUpNotifications}
              renderItem={(item) => (
                <List.Item
                  style={{ padding: '12px 16px', cursor: 'pointer' }}
                  onClick={() => {
                    setBellVisible(false);
                    navigate(`/lead?openLead=${item._id}`);
                  }}
                >
                  <div style={{ width: '100%' }}>
                    <Text strong>{item.leadName}</Text>
                    <div style={{ fontSize: '12px', color: '#666' }}>
                      {item.assignedTo} •{' '}
                      {new Date(item.followUpDate).toLocaleString()}
                    </div>
                    {item.followUpMessage && (
                      <div
                        style={{
                          fontSize: '13px',
                          marginTop: 4,
                          color: '#555',
                        }}
                      >
                        {item.followUpMessage.substring(0, 85)}...
                      </div>
                    )}
                  </div>
                </List.Item>
              )}
              locale={{ emptyText: 'No upcoming follow-ups' }}
            />
          </div>
        )}
      >
        <Tooltip title="Follow-up Notifications">
          <Badge
            count={followUpNotifications.length}
            overflowCount={99}
            dot={followUpNotifications.length > 0}
          >
            <BellOutlined
              style={{
                fontSize: '22px',
                cursor: 'pointer',
                padding: '8px',
              }}
            />
          </Badge>
        </Tooltip>
      </Dropdown>

      {/* Profile Dropdown */}
      <Dropdown menu={{ items }} trigger={['click']} placement="bottomRight">
        <Avatar
          className="last"
          src={
            currentAdmin?.photo
              ? FILE_BASE_URL + currentAdmin?.photo
              : undefined
          }
          style={{
            color: '#f56a00',
            backgroundColor: currentAdmin?.photo ? 'none' : '#fde3cf',
            boxShadow: 'rgba(150, 190, 238, 0.35) 0px 0px 10px 2px',
            cursor: 'pointer',
          }}
          size="large"
        >
          {currentAdmin?.name?.charAt(0)?.toUpperCase()}
        </Avatar>
      </Dropdown>

      <UpgradeButton />
    </div>
  </Header>
);
} 