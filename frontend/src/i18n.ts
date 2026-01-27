import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Импортируем JSON-файлы с типом any (или создадим типы позже, если захочешь строгость)
import enApp from './locales/en/app.json';
import ruApp from './locales/ru/app.json';
import beApp from './locales/be/app.json';
import kkApp from './locales/kk/app.json';
import ukApp from './locales/uk/app.json';
import enAuthSelector from './locales/en/authSelector.json';
import ruAuthSelector from './locales/ru/authSelector.json';
import beAuthSelector from './locales/be/authSelector.json';
import kkAuthSelector from './locales/kk/authSelector.json';
import ukAuthSelector from './locales/uk/authSelector.json';
import enProfile from './locales/en/profile.json';
import ruProfile from './locales/ru/profile.json';
import beProfile from './locales/be/profile.json';
import kkProfile from './locales/kk/profile.json';
import ukProfile from './locales/uk/profile.json';
import enLobby from './locales/en/lobby.json';
import ruLobby from './locales/ru/lobby.json';
import beLobby from './locales/be/lobby.json';
import kkLobby from './locales/kk/lobby.json';
import ukLobby from './locales/uk/lobby.json';
import enLogin from './locales/en/login.json';
import ruLogin from './locales/ru/login.json';
import beLogin from './locales/be/login.json';
import kkLogin from './locales/kk/login.json';
import ukLogin from './locales/uk/login.json';
import enRegister from './locales/en/register.json';
import ruRegister from './locales/ru/register.json';
import beRegister from './locales/be/register.json';
import kkRegister from './locales/kk/register.json';
import ukRegister from './locales/uk/register.json';
import enGameClient from './locales/en/gameClient.json';
import ruGameClient from './locales/ru/gameClient.json';
import beGameClient from './locales/be/gameClient.json';
import kkGameClient from './locales/kk/gameClient.json';
import ukGameClient from './locales/uk/gameClient.json';

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
      be: {
        app: beApp,
        authSelector: beAuthSelector,
        profile: beProfile,
        lobby: beLobby,
        login: beLogin,
        register: beRegister,
        gameClient: beGameClient,
      },
      kk: {
        app: kkApp,
        authSelector: kkAuthSelector,
        profile: kkProfile,
        lobby: kkLobby,
        login: kkLogin,
        register: kkRegister,
        gameClient: kkGameClient,
      },
      uk: {
        app: ukApp,
        authSelector: ukAuthSelector,
        profile: ukProfile,
        lobby: ukLobby,
        login: ukLogin,
        register: ukRegister,
        gameClient: ukGameClient,
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