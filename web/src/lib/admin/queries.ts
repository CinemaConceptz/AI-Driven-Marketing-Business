import {
  collection,
  getCountFromServer,
  getDocs,
  limit,
  orderBy,
  query,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Submission, Payment, EmailLog, AdminUser } from "./types";

export async function getAdminOverviewCounts() {
  const submissionsCol = collection(db, "submissions");
  const paymentsCol = collection(db, "payments");
  const emailCol = collection(db, "emailLogs");
  const usersCol = collection(db, "users");

  const [subTotal, subPending, payPaid, emailFailed, usersTotal] = await Promise.all([
    getCountFromServer(query(submissionsCol)),
    getCountFromServer(query(submissionsCol, where("status", "in", ["submitted", "reviewing"]))),
    getCountFromServer(query(paymentsCol, where("status", "==", "paid"))),
    getCountFromServer(query(emailCol, where("status", "==", "failed"))),
    getCountFromServer(query(usersCol)),
  ]);

  return {
    submissionsTotal: subTotal.data().count,
    submissionsPending: subPending.data().count,
    paymentsPaid: payPaid.data().count,
    emailFailed: emailFailed.data().count,
    usersTotal: usersTotal.data().count,
  };
}

// ── Phase 4B Analytics Queries ──────────────────────────────────────────────

export async function getAnalyticsData() {
  const usersCol = collection(db, "users");
  const pdfCol = collection(db, "pdfDownloads");
  const contactCol = collection(db, "contactInquiries");
  const chatCol = collection(db, "chatLogs");

  const [
    allUsers,
    tier1Count, tier2Count, tier3Count,
    activeCount, canceledCount, pastDueCount,
    pdfSnap, contactSnap, chatCount,
    recentPdfs,
  ] = await Promise.all([
    getCountFromServer(query(usersCol)),
    getCountFromServer(query(usersCol, where("subscriptionTier", "==", "tier1"))),
    getCountFromServer(query(usersCol, where("subscriptionTier", "==", "tier2"))),
    getCountFromServer(query(usersCol, where("subscriptionTier", "==", "tier3"))),
    getCountFromServer(query(usersCol, where("subscriptionStatus", "==", "active"))),
    getCountFromServer(query(usersCol, where("subscriptionStatus", "==", "canceled"))),
    getCountFromServer(query(usersCol, where("subscriptionStatus", "==", "past_due"))),
    getDocs(query(collection(db, "pdfDownloads"), orderBy("generatedAt", "desc"), limit(100))),
    getCountFromServer(query(contactCol)),
    getCountFromServer(query(chatCol)).catch(() => ({ data: () => ({ count: 0 }) })),
    getDocs(query(collection(db, "pdfDownloads"), orderBy("generatedAt", "desc"), limit(10))),
  ]);

  // PDF breakdown by tier
  const pdfByTier: Record<string, number> = { tier1: 0, tier2: 0, tier3: 0 };
  pdfSnap.docs.forEach((d) => {
    const tier = (d.data().tier as string) || "tier1";
    pdfByTier[tier] = (pdfByTier[tier] || 0) + 1;
  });

  return {
    users: {
      total: allUsers.data().count,
      byTier: {
        tier1: tier1Count.data().count,
        tier2: tier2Count.data().count,
        tier3: tier3Count.data().count,
      },
      byStatus: {
        active: activeCount.data().count,
        canceled: canceledCount.data().count,
        past_due: pastDueCount.data().count,
      },
    },
    pdfs: {
      total: pdfSnap.size,
      byTier: pdfByTier,
      recent: recentPdfs.docs.map((d) => ({ id: d.id, ...d.data() })),
    },
    contacts: {
      total: contactSnap.data().count,
    },
    chat: {
      total: chatCount.data().count,
    },
  };
}

export async function listRecentSubmissions(pageSize = 50): Promise<Submission[]> {
  const q = query(
    collection(db, "submissions"),
    orderBy("submittedAt", "desc"),
    limit(pageSize)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Submission, "id">) }));
}

export async function listPendingSubmissions(pageSize = 50): Promise<Submission[]> {
  const q = query(
    collection(db, "submissions"),
    where("status", "in", ["submitted", "reviewing"]),
    orderBy("submittedAt", "desc"),
    limit(pageSize)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Submission, "id">) }));
}

export async function listRecentPayments(pageSize = 50): Promise<Payment[]> {
  const q = query(
    collection(db, "payments"),
    orderBy("createdAt", "desc"),
    limit(pageSize)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Payment, "id">) }));
}

export async function listEmailFailures(pageSize = 50): Promise<EmailLog[]> {
  const q = query(
    collection(db, "emailLogs"),
    where("status", "==", "failed"),
    orderBy("createdAt", "desc"),
    limit(pageSize)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<EmailLog, "id">) }));
}

export async function listRecentEmailLogs(pageSize = 50): Promise<EmailLog[]> {
  const q = query(
    collection(db, "emailLogs"),
    orderBy("createdAt", "desc"),
    limit(pageSize)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<EmailLog, "id">) }));
}

export async function listRecentUsers(pageSize = 50): Promise<AdminUser[]> {
  const q = query(
    collection(db, "users"),
    orderBy("createdAt", "desc"),
    limit(pageSize)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<AdminUser, "id">) }));
}
