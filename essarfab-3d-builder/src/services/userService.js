import {
  doc,
  setDoc,
  getDoc,
  getDocs,
  deleteDoc,
  updateDoc,
  collection,
  serverTimestamp,
  onSnapshot,
  query,
  orderBy,
  where
} from "firebase/firestore";
import { db } from "../firebase/firebase";

// ─── Real-time listener (returns unsubscribe function) ───────────────────────
export function subscribeToUsers(callback) {
  const q = query(collection(db, "users"), orderBy("createdAt", "asc"));
  return onSnapshot(q,
    (snapshot) => {
      const list = [];
      snapshot.forEach((docSnap) => {
        list.push({ id: docSnap.id, ...docSnap.data() });
      });
      callback(list);
    },
    (error) => {
      console.error("Firestore realtime error:", error);
      callback([], error.message);
    }
  );
}

// ─── Check if user exists ───────────────────────────────────────────────────
export async function userExists(userId) {
  const snap = await getDoc(doc(db, "users", userId));
  return snap.exists();
}

// ─── Get a single user by userId ────────────────────────────────────────────
export async function getUser(userId) {
  const snap = await getDoc(doc(db, "users", userId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() };
}

// ─── Get user by email ──────────────────────────────────────────────────────
export async function getUserByEmail(email) {
  const q = query(collection(db, "users"), where("email", "==", email));
  const snapshot = await getDocs(q);
  if (snapshot.empty) return null;
  const docSnap = snapshot.docs[0];
  return { id: docSnap.id, ...docSnap.data() };
}

// ─── Add user (only if not exists) ──────────────────────────────────────────
export async function addUser(userId, username, email, company = "") {
  const existing = await getDoc(doc(db, "users", userId));
  if (existing.exists()) {
    throw new Error("User already exists");
  }
  await setDoc(doc(db, "users", userId), {
    userId,
    username,
    email,
    company,
    role: "user",
    active: true,
    createdAt: serverTimestamp(),
    createdBy: "admin"
  });
}

// ─── Delete user ────────────────────────────────────────────────────────────
export async function deleteUser(userId) {
  await deleteDoc(doc(db, "users", userId));
}

// ─── Rename username ────────────────────────────────────────────────────────
export async function renameUser(userId, newUsername) {
  await updateDoc(doc(db, "users", userId), { username: newUsername });
}

// ─── Toggle active status ────────────────────────────────────────────────────
export async function toggleUserActive(userId, currentActive) {
  await updateDoc(doc(db, "users", userId), { active: !currentActive });
}

// ─── Verify user by email for login ─────────────────────────────────────────
export async function verifyUserByEmail(email) {
  const userData = await getUserByEmail(email);
  if (!userData) {
    throw new Error("User not found");
  }
  if (userData.active === false) {
    throw new Error("Account is inactive");
  }
  return userData;
}

// ─── Device operations ──────────────────────────────────────────────────────

export function subscribeToDevices(callback) {
  const q = query(collection(db, "devices"), orderBy("lastLogin", "desc"));
  return onSnapshot(q,
    (snapshot) => {
      const list = [];
      snapshot.forEach((docSnap) => {
        list.push({ id: docSnap.id, ...docSnap.data() });
      });
      callback(list);
    },
    (error) => {
      console.error("Firestore devices realtime error:", error);
      callback([], error.message);
    }
  );
}

export async function upsertDevice(deviceId, deviceInfo) {
  const ref = doc(db, "devices", deviceId);
  const snap = await getDoc(ref);
  const now = new Date().toISOString();

  if (snap.exists()) {
    await updateDoc(ref, {
      lastLogin: now,
      deviceType: deviceInfo.deviceType,
      browser: deviceInfo.browser,
      os: deviceInfo.os || snap.data().os,
    });
  } else {
    await setDoc(ref, {
      deviceId,
      userName: "",
      deviceType: deviceInfo.deviceType,
      browser: deviceInfo.browser,
      os: deviceInfo.os || getOS(),
      screenW: screen.width,
      screenH: screen.height,
      firstLogin: now,
      lastLogin: now,
    });
  }
}

export async function removeDevice(deviceId) {
  await deleteDoc(doc(db, "devices", deviceId));
}

export async function renameDevice(deviceId, newName) {
  await updateDoc(doc(db, "devices", deviceId), { userName: newName });
}

function getOS() {
  const ua = navigator.userAgent;
  if (ua.includes("Windows")) return "Windows";
  if (ua.includes("Mac OS X")) return "macOS";
  if (ua.includes("Linux")) return "Linux";
  if (ua.includes("Android")) return "Android";
  if (ua.includes("iOS") || ua.includes("iPhone") || ua.includes("iPad")) return "iOS";
  return "Unknown";
}