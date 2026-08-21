import { Firestore } from "firebase-admin/firestore";
import { Organization, Membership, MembershipRole, UserPlanTier } from "../../src/types/tenant";
import { OrganizationRepository, MembershipRepository, AuthorizationRepository } from "./repository";
import { getAdminFirestore } from "../auth/firestoreAdmin";

const VALID_MEMBERSHIP_ROLES: ReadonlyArray<MembershipRole> = ["owner", "admin", "member", "auditor"];
const VALID_PLAN_TIERS: ReadonlyArray<UserPlanTier> = ["free", "pro", "pro_plus", "enterprise"];

/**
 * Validates and sanitizes raw organization data from Firestore.
 */
export function sanitizeOrganization(raw: Record<string, unknown>): Organization | undefined {
  if (!raw || typeof raw !== "object") return undefined;

  const id = typeof raw.id === "string" ? raw.id.trim() : "";
  const name = typeof raw.name === "string" ? raw.name.trim() : "";
  const ownerUid = typeof raw.ownerUid === "string" ? raw.ownerUid.trim() : "";
  const contactEmail = typeof raw.contactEmail === "string" ? raw.contactEmail.trim() : "";

  if (!id || !name || !ownerUid || !contactEmail) {
    return undefined;
  }

  let plan: UserPlanTier = "free";
  if (raw.plan !== undefined && raw.plan !== null) {
    if (typeof raw.plan === "string" && VALID_PLAN_TIERS.includes(raw.plan as UserPlanTier)) {
      plan = raw.plan as UserPlanTier;
    } else {
      return undefined;
    }
  }

  let planStatus: Organization["planStatus"] = "active";
  if (raw.planStatus !== undefined && raw.planStatus !== null) {
    if (typeof raw.planStatus === "string" && ["active", "trial", "past_due", "cancelled"].includes(raw.planStatus)) {
      planStatus = raw.planStatus as Organization["planStatus"];
    } else {
      return undefined;
    }
  }

  const org: Organization = {
    id,
    name,
    legalName: typeof raw.legalName === "string" ? raw.legalName.trim() : undefined,
    taxId: typeof raw.taxId === "string" ? raw.taxId.trim() : undefined,
    ownerUid,
    plan,
    planStatus,
    contactEmail,
    contactPhone: typeof raw.contactPhone === "string" ? raw.contactPhone.trim() : undefined,
    address: typeof raw.address === "string" ? raw.address.trim() : undefined,
    createdAt: typeof raw.createdAt === "string" ? raw.createdAt : new Date().toISOString(),
    updatedAt: typeof raw.updatedAt === "string" ? raw.updatedAt : undefined,
  };

  return org;
}

/**
 * Validates and sanitizes raw membership data from Firestore.
 * Enforces valid roles, boolean active flags, and strictly validated assignedCompanyIds.
 */
export function sanitizeMembership(raw: Record<string, unknown>): Membership | undefined {
  if (!raw || typeof raw !== "object") return undefined;

  const id = typeof raw.id === "string" ? raw.id.trim() : "";
  const orgId = typeof raw.orgId === "string" ? raw.orgId.trim() : "";
  const userId = typeof raw.userId === "string" ? raw.userId.trim() : "";
  const userEmail = typeof raw.userEmail === "string" ? raw.userEmail.trim() : "";

  if (typeof raw.active !== "boolean") {
    return undefined;
  }
  const active: boolean = raw.active;

  if (!id || !orgId || !userId || !userEmail) {
    return undefined;
  }

  // Strict role validation
  const rawRole = typeof raw.role === "string" ? raw.role.trim() : "";
  if (!VALID_MEMBERSHIP_ROLES.includes(rawRole as MembershipRole)) {
    return undefined;
  }
  const role = rawRole as MembershipRole;

  // Validate assignedCompanyIds
  let assignedCompanyIds: string[] | undefined = undefined;
  if (raw.assignedCompanyIds !== undefined && raw.assignedCompanyIds !== null) {
    if (!Array.isArray(raw.assignedCompanyIds)) {
      return undefined;
    }
    for (const item of raw.assignedCompanyIds) {
      if (typeof item !== "string" || item.trim() === "") {
        return undefined;
      }
    }
    assignedCompanyIds = raw.assignedCompanyIds.map((cid: string) => cid.trim());
  }

  const membership: Membership = {
    id,
    orgId,
    userId,
    userEmail,
    userName: typeof raw.userName === "string" ? raw.userName.trim() : undefined,
    role,
    assignedCompanyIds,
    active,
    invitedAt: typeof raw.invitedAt === "string" ? raw.invitedAt : new Date().toISOString(),
    joinedAt: typeof raw.joinedAt === "string" ? raw.joinedAt : undefined,
  };

  return membership;
}

/**
 * Firestore-backed OrganizationRepository using Firebase Admin SDK.
 */
export class FirestoreOrganizationRepository implements OrganizationRepository {
  private readonly db: Firestore;
  private readonly collectionName: string;

  constructor(db?: Firestore, collectionName: string = "organizations") {
    this.db = db || getAdminFirestore();
    this.collectionName = collectionName;
  }

  async getById(id: string): Promise<Organization | undefined> {
    if (!id || typeof id !== "string" || id.trim() === "") {
      return undefined;
    }

    try {
      const docRef = this.db.collection(this.collectionName).doc(id.trim());
      const snapshot = await docRef.get();

      if (!snapshot.exists) {
        return undefined;
      }

      const data = snapshot.data();
      if (!data) return undefined;

      return sanitizeOrganization({ id: snapshot.id, ...data });
    } catch (error) {
      console.error(`[FirestoreOrganizationRepository] Error fetching organization '${id}':`, error);
      // Fail-closed: return undefined on error
      return undefined;
    }
  }

  async save(org: Organization): Promise<Organization> {
    if (!org || !org.id || typeof org.id !== "string" || org.id.trim() === "") {
      throw new Error("Invalid organization payload: ID is mandatory.");
    }

    const sanitized = sanitizeOrganization(org as unknown as Record<string, unknown>);
    if (!sanitized) {
      throw new Error("Failed to save organization: validation failed.");
    }

    const docRef = this.db.collection(this.collectionName).doc(sanitized.id);
    await docRef.set(sanitized, { merge: true });
    return sanitized;
  }

  async getAll(): Promise<Organization[]> {
    try {
      const snapshot = await this.db.collection(this.collectionName).get();
      const list: Organization[] = [];
      for (const doc of snapshot.docs) {
        const item = sanitizeOrganization({ id: doc.id, ...doc.data() });
        if (item) list.push(item);
      }
      return list;
    } catch (error) {
      console.error("[FirestoreOrganizationRepository] Error listing organizations:", error);
      return [];
    }
  }

  async clear(): Promise<void> {
    try {
      const snapshot = await this.db.collection(this.collectionName).get();
      if (snapshot.empty) return;

      const batch = this.db.batch();
      snapshot.docs.forEach((doc) => batch.delete(doc.ref));
      await batch.commit();
    } catch (error) {
      console.error("[FirestoreOrganizationRepository] Error clearing organizations:", error);
    }
  }
}

/**
 * Firestore-backed MembershipRepository using Firebase Admin SDK.
 * Queries are scoped to minimize scanned documents.
 */
export class FirestoreMembershipRepository implements MembershipRepository {
  private readonly db: Firestore;
  private readonly collectionName: string;

  constructor(db?: Firestore, collectionName: string = "memberships") {
    this.db = db || getAdminFirestore();
    this.collectionName = collectionName;
  }

  async getByOrgAndUser(orgId: string, userId: string): Promise<Membership | undefined> {
    if (!orgId || !userId || typeof orgId !== "string" || typeof userId !== "string") {
      return undefined;
    }

    const cleanOrgId = orgId.trim();
    const cleanUserId = userId.trim();
    if (!cleanOrgId || !cleanUserId) {
      return undefined;
    }

    try {
      // Scoped query: orgId == cleanOrgId AND userId == cleanUserId (limit 1)
      const querySnapshot = await this.db
        .collection(this.collectionName)
        .where("orgId", "==", cleanOrgId)
        .where("userId", "==", cleanUserId)
        .limit(1)
        .get();

      if (querySnapshot.empty || querySnapshot.docs.length === 0) {
        return undefined;
      }

      const docSnap = querySnapshot.docs[0];
      const data = docSnap.data();
      const membership = sanitizeMembership({ id: docSnap.id, ...data });

      if (!membership || !membership.active) {
        return undefined;
      }

      return membership;
    } catch (error) {
      console.error(
        `[FirestoreMembershipRepository] Error fetching membership for org '${cleanOrgId}' and user '${cleanUserId}':`,
        error
      );
      // Fail-closed: return undefined on error
      return undefined;
    }
  }

  async getById(id: string): Promise<Membership | undefined> {
    if (!id || typeof id !== "string" || id.trim() === "") {
      return undefined;
    }

    try {
      const docRef = this.db.collection(this.collectionName).doc(id.trim());
      const snapshot = await docRef.get();

      if (!snapshot.exists) {
        return undefined;
      }

      const data = snapshot.data();
      if (!data) return undefined;

      return sanitizeMembership({ id: snapshot.id, ...data });
    } catch (error) {
      console.error(`[FirestoreMembershipRepository] Error fetching membership '${id}':`, error);
      return undefined;
    }
  }

  async getByUser(userId: string): Promise<Membership[]> {
    if (!userId || typeof userId !== "string" || userId.trim() === "") {
      return [];
    }

    const cleanUserId = userId.trim();

    try {
      // Scoped query: userId == cleanUserId AND active == true
      const querySnapshot = await this.db
        .collection(this.collectionName)
        .where("userId", "==", cleanUserId)
        .where("active", "==", true)
        .get();

      const list: Membership[] = [];
      for (const doc of querySnapshot.docs) {
        const item = sanitizeMembership({ id: doc.id, ...doc.data() });
        if (item && item.active) {
          list.push(item);
        }
      }
      return list;
    } catch (error) {
      console.error(`[FirestoreMembershipRepository] Error fetching memberships for user '${cleanUserId}':`, error);
      return [];
    }
  }

  async save(membership: Membership): Promise<Membership> {
    if (!membership || !membership.id || typeof membership.id !== "string" || membership.id.trim() === "") {
      throw new Error("Invalid membership payload: ID is mandatory.");
    }

    const sanitized = sanitizeMembership(membership as unknown as Record<string, unknown>);
    if (!sanitized) {
      throw new Error("Failed to save membership: validation failed.");
    }

    const docRef = this.db.collection(this.collectionName).doc(sanitized.id);
    await docRef.set(sanitized, { merge: true });
    return sanitized;
  }

  async getAll(): Promise<Membership[]> {
    try {
      const snapshot = await this.db.collection(this.collectionName).get();
      const list: Membership[] = [];
      for (const doc of snapshot.docs) {
        const item = sanitizeMembership({ id: doc.id, ...doc.data() });
        if (item) list.push(item);
      }
      return list;
    } catch (error) {
      console.error("[FirestoreMembershipRepository] Error listing memberships:", error);
      return [];
    }
  }

  async clear(): Promise<void> {
    try {
      const snapshot = await this.db.collection(this.collectionName).get();
      if (snapshot.empty) return;

      const batch = this.db.batch();
      snapshot.docs.forEach((doc) => batch.delete(doc.ref));
      await batch.commit();
    } catch (error) {
      console.error("[FirestoreMembershipRepository] Error clearing memberships:", error);
    }
  }
}

/**
 * Composite FirestoreAuthorizationRepository conforming to AuthorizationRepository contract.
 */
export class FirestoreAuthorizationRepository implements AuthorizationRepository {
  public readonly organizations: OrganizationRepository;
  public readonly memberships: MembershipRepository;
  private readonly db: Firestore;

  constructor(db?: Firestore) {
    this.db = db || getAdminFirestore();
    this.organizations = new FirestoreOrganizationRepository(this.db);
    this.memberships = new FirestoreMembershipRepository(this.db);
  }

  async healthCheck(): Promise<boolean> {
    try {
      // Light read check on organizations collection
      await this.db.collection("organizations").limit(1).get();
      return true;
    } catch (error) {
      console.error("[FirestoreAuthorizationRepository] Health check failed:", error);
      return false;
    }
  }

  async clear(): Promise<void> {
    await this.organizations.clear();
    await this.memberships.clear();
  }
}
