/** House copy for development until live keys are in. Always accepted. */
export const DEV_ACCOUNT = {
  email: 'praxzisapp@gmail.com',
  password: 'BillionDollars2026@10',
  name: 'Praxzis',
} as const;

export function isDevLogin(email: string, password: string) {
  return email.trim().toLowerCase() === DEV_ACCOUNT.email && password === DEV_ACCOUNT.password;
}
