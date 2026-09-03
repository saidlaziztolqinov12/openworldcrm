import { User } from '../types';

/**
 * Returns a deduplicated list of instructors for selection in group creation,
 * cohort reassignment, and dashboard filtering.
 *
 * Guarantees:
 * 1. Contains all active teachers (role === 'teacher').
 * 2. Deduplicates any teachers by ID, email, and name.
 * 3. Includes STRICTLY ONE Super Admin instructor option (no duplicates),
 *    preferring the current authenticated Super Admin session if present.
 */
export function getAvailableInstructors(
  users: User[],
  teachers: User[],
  currentUser: User | null,
  isSuperAdmin: boolean
): User[] {
  const result: User[] = [];
  const seenIds = new Set<string>();
  const seenEmails = new Set<string>();
  const seenNames = new Set<string>();

  // 1. Collect all standard teachers (role === 'teacher')
  const allTeachers = [...users.filter((u) => u.role === 'teacher'), ...teachers];
  for (const t of allTeachers) {
    const isSuper =
      t.role === 'super_admin' ||
      (t.role as any) === 'superadmin' ||
      t.id === 'admin-1';
    if (isSuper) continue;

    const idKey = t.id?.trim();
    const emailKey = t.email ? t.email.trim().toLowerCase() : '';
    const nameKey = t.name ? t.name.trim().toLowerCase() : '';

    if (idKey && seenIds.has(idKey)) continue;
    if (emailKey && seenEmails.has(emailKey)) continue;
    if (nameKey && seenNames.has(nameKey)) continue;

    if (idKey) seenIds.add(idKey);
    if (emailKey) seenEmails.add(emailKey);
    if (nameKey) seenNames.add(nameKey);
    result.push(t);
  }

  // 2. Resolve STRICTLY ONE Super Admin instructor profile
  let singleSuperAdmin: User | null = null;

  const currentIsSuper =
    isSuperAdmin ||
    currentUser?.role === 'super_admin' ||
    (currentUser?.role as any) === 'superadmin' ||
    currentUser?.id === 'admin-1';

  if (currentUser && currentIsSuper) {
    singleSuperAdmin = currentUser;
  } else {
    const foundInUsers = users.find(
      (u) =>
        u.role === 'super_admin' ||
        (u.role as any) === 'superadmin' ||
        u.id === 'admin-1'
    );
    if (foundInUsers) {
      singleSuperAdmin = foundInUsers;
    }
  }

  if (singleSuperAdmin) {
    const unifiedSuperAdmin: User = {
      ...singleSuperAdmin,
      role: 'super_admin',
      name: singleSuperAdmin.name || 'MuhammadIso Ermatov',
      title: singleSuperAdmin.title || 'Director'
    };

    const sId = unifiedSuperAdmin.id?.trim();
    const sEmail = unifiedSuperAdmin.email ? unifiedSuperAdmin.email.trim().toLowerCase() : '';
    const sName = unifiedSuperAdmin.name ? unifiedSuperAdmin.name.trim().toLowerCase() : '';

    // Only add if not already in result
    if (
      (!sId || !seenIds.has(sId)) &&
      (!sEmail || !seenEmails.has(sEmail)) &&
      (!sName || !seenNames.has(sName))
    ) {
      result.push(unifiedSuperAdmin);
    }
  }

  return result;
}
