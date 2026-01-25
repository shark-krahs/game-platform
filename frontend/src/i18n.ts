import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Импортируем JSON-файлы с типом any (или создадим типы позже, если захочешь строгость)
import enApp from './locales/en/app.json';
import ruApp from './locales/ru/app.json';
import enAuthSelector from './locales/en/authSelector.json';
import ruAuthSelector from './locales/ru/authSelector.json';
import enProfile from './locales/en/profile.json';
import ruProfile from './locales/ru/profile.json';
import enLobby from './locales/en/lobby.json';
import ruLobby from './locales/ru/lobby.json';
import enLogin from './locales/en/login.json';
import ruLogin from './locales/ru/login.json';
import enRegister from './locales/en/register.json';
import ruRegister from './locales/ru/register.json';
import enGameClient from './locales/en/gameClient.json';
import ruGameClient from './locales/ru/gameClient.json';

// Опционально: тип для ресурсов (если хочешь строгую типизацию переводов)
declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'app';
    resources: {
      app: typeof enApp;
      authSelector: typeof enAuthSelector;
      profile: typeof enProfile;
      lobby: typeof enLobby;
      login: typeof enLogin;
      register: typeof enRegister;
      gameClient: typeof enGameClient;
    };
  }
}

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: {
        app: enApp,
        authSelector: enAuthSelector,
        profile: enProfile,
        lobby: enLobby,
        login: enLogin,
        register: enRegister,
        gameClient: enGameClient,
      },
      ru: {
        app: ruApp,
        authSelector: ruAuthSelector,
        profile: ruProfile,
        lobby: ruLobby,
        login: ruLogin,
        register: ruRegister,
        gameClient: ruGameClient,
      },
    },
    fallbackLng: 'en',
    debug: import.meta.env.DEV, // В продакшене отключится (лучше, чем true)
    interpolation: {
      escapeValue: false, // React уже экранирует
    },
    ns: ['app', 'authSelector', 'gameClient', 'profile', 'lobby', 'login', 'register'],
    defaultNS: 'app',
  });

export default i18n;