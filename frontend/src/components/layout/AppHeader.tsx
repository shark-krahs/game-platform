/**
 * App Header component - navigation and theme controls
 * Designed to work with background images by using transparent/semi-transparent styling
 */

import React from 'react';
import {useNavigate} from 'react-router-dom';
import {Button, Dropdown, type MenuProps, Switch, Typography,} from 'antd';
import {
    DashboardOutlined,
    LoginOutlined,
    LogoutOutlined,
    MenuOutlined,
    MoonOutlined,
    ProfileOutlined,
    SunOutlined,
    TrophyOutlined,
} from '@ant-design/icons';
import {useTranslation} from 'react-i18next';
import {useAuth} from '../../AuthContext';
import styled from 'styled-components';

const {Title} = Typography;

interface AppHeaderProps {
    $isDark: boolean;
    $toggleTheme?: (value?: boolean) => void;
    $hasBackgroundImage?: boolean;
}

const HeaderContainer = styled.header<AppHeaderProps>`
  position: relative;
  z-index: 1000;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 20px;
  min-height: 64px;

  background: ${({$hasBackgroundImage, $isDark}) => {
    if ($hasBackgroundImage) {
        return 'rgba(0, 0, 0, 0.3)';
    }
    return $isDark ? 'rgba(0, 0, 0, 0.8)' : 'rgba(255, 255, 255, 0.95)';
}};
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);

  border-bottom: 1px solid ${({$hasBackgroundImage, $isDark}) => {
    if ($hasBackgroundImage) {
        return 'rgba(255, 255, 255, 0.2)';
    }
    return $isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';
}};

  @media (max-width: 768px) {
    padding: 0 12px;
    flex-direction: column;
    gap: 12px;
    min-height: auto;
    padding-top: 12px;
    padding-bottom: 12px;
  }
`;

const LogoContainer = styled.div<AppHeaderProps>`
  display: flex;
  align-items: center;
  gap: 12px;

  h2 {
    margin: 0;
    color: ${({$hasBackgroundImage, $isDark}) => {
    if ($hasBackgroundImage) return '#fff';
    return $isDark ? '#fff' : '#000000d9';
}};
    text-shadow: ${({$hasBackgroundImage}) =>
    $hasBackgroundImage ? '0 2px 4px rgba(0, 0, 0, 0.5)' : 'none'};
  }

  @media (max-width: 768px) {
    h2 {
      font-size: 18px;
    }
  }
`;

const ControlsContainer = styled.div<AppHeaderProps>`
  display: flex;
  align-items: center;
  gap: 16px;

  .ant-typography {
    color: ${({$hasBackgroundImage, $isDark}) => {
    if ($hasBackgroundImage) return '#fff';
    return $isDark ? '#fff' : '#000000d9';
}};
    text-shadow: ${({$hasBackgroundImage}) =>
    $hasBackgroundImage ? '0 2px 4px rgba(0, 0, 0, 0.5)' : 'none'};
  }

  .ant-dropdown-menu {
    background: ${({$hasBackgroundImage, $isDark}) => {
    if ($hasBackgroundImage) return 'rgba(0, 0, 0, 0.9)';
    return $isDark ? '#1f1f1f' : '#fff';
}};
    border: 1px solid ${({$hasBackgroundImage, $isDark}) => {
    if ($hasBackgroundImage) return 'rgba(255, 255, 255, 0.2)';
    return $isDark ? '#434343' : '#d9d9d9';
}};
  }

  .ant-dropdown-menu-item {
    color: ${({$hasBackgroundImage, $isDark}) => {
    if ($hasBackgroundImage) return '#fff';
    return $isDark ? '#fff' : '#000000d9';
}};
  }

  .ant-dropdown-menu-item:hover {
    background: ${({$hasBackgroundImage, $isDark}) => {
    if ($hasBackgroundImage) return 'rgba(255, 255, 255, 0.1)';
    return $isDark ? '#262626' : '#f5f5f5';
}};
  }

  @media (max-width: 768px) {
    flex-wrap: wrap;
    justify-content: center;
    gap: 8px;
  }
`;

const StyledButton = styled(Button)<AppHeaderProps>`
  color: ${({$hasBackgroundImage, $isDark}) => {
    if ($hasBackgroundImage) return '#fff !important';
    return $isDark ? '#fff !important' : 'inherit';
}} !important;

  border-color: ${({$hasBackgroundImage, $isDark}) => {
    if ($hasBackgroundImage) return 'rgba(255, 255, 255, 0.3) !important';
    return $isDark ? '#434343 !important' : 'inherit';
}} !important;

  &:hover {
    color: ${({$hasBackgroundImage, $isDark}) => {
    if ($hasBackgroundImage) return '#fff !important';
    return $isDark ? '#fff !important' : 'inherit';
}} !important;

    border-color: ${({$hasBackgroundImage, $isDark}) => {
    if ($hasBackgroundImage) return 'rgba(255, 255, 255, 0.5) !important';
    return $isDark ? '#595959 !important' : 'inherit';
}} !important;
  }
`;

const AppHeader: React.FC<AppHeaderProps> = ({
                                                 $isDark,
                                                 $toggleTheme,
                                                 $hasBackgroundImage = false,
                                             }) => {
    const toggleTheme = $toggleTheme;
    const {user, logout} = useAuth();
    const {t} = useTranslation('app');
    const navigate = useNavigate();

    const menuItems: MenuProps['items'] = user
        ? [
            {
                key: 'profile',
                icon: <ProfileOutlined/>,
                label: t('profile'),
                onClick: () => navigate('/profile'),
            },
            {
                key: 'game',
                icon: <DashboardOutlined/>,
                label: t('game'),
                onClick: () => navigate('/game'),
            },
            {
                key: 'lobby',
                icon: <TrophyOutlined/>,
                label: t('lobby'),
                onClick: () => navigate('/lobby'),
            },
            {key: 'divider', type: 'divider'},
            {
                key: 'logout',
                icon: <LogoutOutlined/>,
                label: t('logout'),
                onClick: logout,
            },
        ]
        : [
            {
                key: 'game',
                icon: <DashboardOutlined/>,
                label: t('game'),
                onClick: () => navigate('/game'),
            },
            {
                key: 'lobby',
                icon: <TrophyOutlined/>,
                label: t('lobby'),
                onClick: () => navigate('/lobby'),
            },
            {
                key: 'auth',
                icon: <LoginOutlined/>,
                label: t('loginOrRegister'),
                onClick: () => navigate('/login'),
            },
        ];

    return (
        <HeaderContainer
            $hasBackgroundImage={$hasBackgroundImage}
            $isDark={$isDark}>
            <LogoContainer
                $hasBackgroundImage={$hasBackgroundImage}
                $isDark={$isDark}>
                <Title level={2} style={{margin: 0}}>
                    {t('gamePlatform')}
                </Title>
            </LogoContainer>

            <ControlsContainer
                $hasBackgroundImage={$hasBackgroundImage}
                $isDark={$isDark}>
                <Switch
                    checked={$isDark}
                    onChange={toggleTheme}
                    checkedChildren={<MoonOutlined/>}
                    unCheckedChildren={<SunOutlined/>}
                />

                {user && (
                    <Typography.Text style={{margin: 0}}>
                        {t('welcome')}, {user.username}
                    </Typography.Text>
                )}

                <Dropdown menu={{items: menuItems}} placement="bottomRight" trigger={['click']}>
                    <StyledButton
                        icon={<MenuOutlined/>}
                        $hasBackgroundImage={$hasBackgroundImage}
                        $isDark={$isDark}
                    />
                </Dropdown>

                {!user && (
                    <StyledButton
                        icon={<LoginOutlined/>}
                        onClick={() => navigate('/login')}
                        $hasBackgroundImage={$hasBackgroundImage}
                        $isDark={$isDark}
                    >
                        {t('loginOrRegister')}
                    </StyledButton>
                )}
            </ControlsContainer>
        </HeaderContainer>
    );
};

export default AppHeader;
