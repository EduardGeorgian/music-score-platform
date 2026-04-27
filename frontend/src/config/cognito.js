export const cognitoConfig = {
  Auth: {
    Cognito: {
      userPoolId: import.meta.env.VITE_USER_POOL_ID || "eu-north-1_fhcN3i17g",
      userPoolClientId:
        import.meta.env.VITE_CLIENT_ID || "759j1q95dr8ddsgpdiu93pb0jt",
      region: import.meta.env.VITE_REGION || "eu-north-1",
      loginWith: {
        email: true,
        username: false,
      },
    },
  },
};

export const apiConfig = {
  baseURL:
    import.meta.env.VITE_API_URL ||
    "https://tkl02rb5f2.execute-api.eu-north-1.amazonaws.com/prod",
};
