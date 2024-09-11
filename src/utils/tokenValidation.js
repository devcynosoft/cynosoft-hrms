const isTokenValid = (expiresAt) => {
    const currentTime = Math.floor(Date.now() / 1000);
    return currentTime < expiresAt;
  };
  
  export default isTokenValid;
  