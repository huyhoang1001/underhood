export function getSecret(key: string) {
  return process.env[key];
}
