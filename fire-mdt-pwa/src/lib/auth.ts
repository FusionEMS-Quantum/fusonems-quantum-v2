import Keycloak from 'keycloak-js';

const keycloak = new Keycloak({
  url: import.meta.env.VITE_KEYCLOAK_URL || 'http://localhost:8080',
  realm: import.meta.env.VITE_KEYCLOAK_REALM || 'fusonems',
  clientId: import.meta.env.VITE_KEYCLOAK_CLIENT_ID || 'fire-mdt',
});

export const initAuth = async (): Promise<boolean> => {
  try {
    const authenticated = await keycloak.init({
      onLoad: 'login-required',
      checkLoginIframe: false,
    });
    return authenticated;
  } catch (error) {
    console.error('Failed to initialize Keycloak', error);
    return false;
  }
};

export const getToken = (): string | undefined => {
  return keycloak.token;
};

export const getUserInfo = () => {
  return keycloak.tokenParsed;
};

export const logout = () => {
  keycloak.logout();
};

export const updateToken = async (): Promise<boolean> => {
  try {
    const refreshed = await keycloak.updateToken(30);
    return refreshed;
  } catch (error) {
    console.error('Failed to refresh token', error);
    return false;
  }
};

export default keycloak;
