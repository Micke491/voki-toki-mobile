import { Alert } from 'react-native';

interface RestrictionResponse {
  restricted?: boolean;
  banned?: boolean;
  message?: string;
}

/** True when the server refused because of a moderator ban or timeout, which no
 *  amount of retrying will fix. */
export function isRestrictionError(error: any): boolean {
  if (error?.response?.status !== 403) return false;
  const data: RestrictionResponse | undefined = error.response.data;
  return !!(data?.restricted || data?.banned);
}

export function alertRestriction(error: any): void {
  const message =
    error?.response?.data?.message || 'You are not allowed to do that right now.';
  Alert.alert('Account restricted', message);
}
