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
