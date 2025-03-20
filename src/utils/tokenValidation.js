const isTokenValid = (expiresAt) => {
  const tokenExpiration = expiresAt.exp * 1000;
  return Date.now() < tokenExpiration;
};

export default isTokenValid;
