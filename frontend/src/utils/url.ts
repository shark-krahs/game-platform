/**
 * URL helpers for API/WebSocket endpoints.
 * Supports env values with or without protocol.
 */

const extractProtocol = (value: string): { protocol?: string; host: string } => {
  const match = value.match(/^(https?|wss?|ws):\/\//i);
  if (match) {
    return {
      protocol: match[1]!.toLowerCase(),
      host: value.replace(/^(https?|wss?|ws):\/\//i, '').replace(/\/+$/, ''),
    };
  }

  return { host: value.replace(/\/+$/, '') };
};

const buildPortPart = (host: string, port?: string): string => {
  if (!port || host.includes(':')) {
    return '';
  }
  return `:${port}`;
};

const getHttpProtocol = (protocol?: string): 'http' | 'https' => {
  if (!protocol) {
    return 'https';
  }
  if (protocol === 'ws') {
    return 'http';
  }
  if (protocol === 'wss') {
    return 'https';
  }
  return protocol as 'http' | 'https';
};

const getWsProtocol = (protocol?: string): 'ws' | 'wss' => {
  if (!protocol) {
    return 'wss';
  }
  if (protocol === 'http') {
    return 'ws';
  }
  if (protocol === 'https') {
    return 'wss';
  }
  return protocol as 'ws' | 'wss';
};

const normalizeApiBaseUrl = (value: string): string => value.replace(/\/+$/, '');

const toWsProtocol = (value: string): string =>
  value.replace(/^http:\/\//, 'ws://').replace(/^https:\/\//, 'wss://');

export const buildHttpApiBaseUrl = (): string => {
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;
  if (apiBaseUrl) {
    return normalizeApiBaseUrl(apiBaseUrl);
  }

  const backendHostRaw = import.meta.env.VITE_BACKEND_HOST || 'localhost';
  const backendPort = import.meta.env.VITE_BACKEND_PORT || '8000';
  const { protocol, host } = extractProtocol(backendHostRaw);
  const portPart = buildPortPart(host, backendPort);
  const proto = getHttpProtocol(protocol);

  return `${proto}://${host}${portPart}/api`;
};

export const buildWsApiBaseUrl = (): string => {
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;
  if (apiBaseUrl) {
    return normalizeApiBaseUrl(toWsProtocol(apiBaseUrl));
  }

  const backendHostRaw = import.meta.env.VITE_BACKEND_HOST || 'localhost';
  const backendPort = import.meta.env.VITE_BACKEND_PORT || '8000';
  const { protocol, host } = extractProtocol(backendHostRaw);
  const portPart = buildPortPart(host, backendPort);
  const proto = getWsProtocol(protocol);

  return `${proto}://${host}${portPart}/api`;
};

export const buildWsHostBaseUrl = (): string => {
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;
  if (apiBaseUrl) {
    const wsBase = normalizeApiBaseUrl(toWsProtocol(apiBaseUrl));
    return wsBase.replace(/\/api\/?$/, '');
  }

  const backendHostRaw = import.meta.env.VITE_BACKEND_HOST || 'localhost';
  const backendPort = import.meta.env.VITE_BACKEND_PORT || '8000';
  const { protocol, host } = extractProtocol(backendHostRaw);
  const portPart = buildPortPart(host, backendPort);
  const proto = getWsProtocol(protocol);

  return `${proto}://${host}${portPart}`;
};