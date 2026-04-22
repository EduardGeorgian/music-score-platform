export const cognitoConfig = {
  Auth: {
    Cognito: {
      userPoolId: "eu-north-1_fhcN3i17g",
      userPoolClientId: "759j1q95dr8ddsgpdiu93pb0jt",
      region: "eu-north-1",
      loginWith: {
        email: true,
        username: false,
      },
      signUpVerificationMethod: "code",
      userAttributes: {
        email: {
          required: true,
        },
      },
    },
  },
};

export const apiConfig = {
  baseURL: "https://tkl02rb5f2.execute-api.eu-north-1.amazonaws.com/prod",
};
