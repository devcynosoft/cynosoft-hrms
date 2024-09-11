import CryptoJS from "crypto-js";

export const EncryptData = (data) => {
  const stringData = data?.toString()
  const secretKey = process.env.NEXT_PUBLIC_CRYPTO_SECRET_KEY;
  const encryptedData = CryptoJS.AES.encrypt(stringData, secretKey).toString();
  return encryptedData;
};

export const DecryptData = (encryptedData) => {
  const secretKey = process.env.NEXT_PUBLIC_CRYPTO_SECRET_KEY;
  const bytes = CryptoJS.AES.decrypt(encryptedData, secretKey);
  const decryptedData = parseInt(bytes.toString(CryptoJS.enc.Utf8), 10);
  return decryptedData;
};
