import { useSelector } from 'react-redux';
import { selectCurrentAdmin } from '@/redux/auth/selectors';
export const isAdminRole = role => ['owner', 'admin'].includes(role);
export function useRole() {
  const user = useSelector(selectCurrentAdmin);
  return { user, isAdmin: isAdminRole(user?.role) };
}
