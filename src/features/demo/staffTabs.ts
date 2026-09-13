import { StaffRole } from '../../lib/staffAuth';
import { staffUrl } from '../../lib/routes';

/**
 * Opens a staff screen in its own browser tab, so the customer screen stays where it is. That is the
 * whole point of the demo: client, kitchen and courier run side by side in three tabs.
 *
 * Returns false when the browser blocked the pop-up, so the caller can say so.
 */
export function openStaffTab(role: StaffRole): boolean {
  return window.open(staffUrl(role), '_blank', 'noopener,noreferrer') !== null;
}
