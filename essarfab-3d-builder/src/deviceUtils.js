const DEVICE_HISTORY_KEY = "deviceHistory";
const USER_NAMES_KEY = "userNames";

export function getDeviceId() {
  const ua = navigator.userAgent;
  const screenW = screen.width;
  const screenH = screen.height;
  const raw = `${ua}|${screenW}|${screenH}`;

  let hash = 0;
  for (let i = 0; i < raw.length; i++) {
    const char = raw.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return `dev_${Math.abs(hash).toString(36)}_${screenW}x${screenH}`;
}

export function getDeviceInfo() {
  const ua = navigator.userAgent;
  let deviceType = "Desktop";
  if (/tablet|ipad|playbook|silk/i.test(ua)) deviceType = "Tablet";
  else if (/mobile|android|iphone|ipod|blackberry|opera mini|iemobile|wpdesktop/i.test(ua)) deviceType = "Mobile";

  let browser = "Unknown";
  if (ua.includes("Edg/")) browser = "Edge";
  else if (ua.includes("Chrome/")) browser = "Chrome";
  else if (ua.includes("Safari/") && !ua.includes("Chrome")) browser = "Safari";
  else if (ua.includes("Firefox/")) browser = "Firefox";

  return { deviceType, browser };
}

export function loadDeviceHistory() {
  try {
    const raw = localStorage.getItem(DEVICE_HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveDeviceHistory(history) {
  localStorage.setItem(DEVICE_HISTORY_KEY, JSON.stringify(history));
}

export function loadUserNames() {
  try {
    const raw = localStorage.getItem(USER_NAMES_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function saveUserNames(names) {
  localStorage.setItem(USER_NAMES_KEY, JSON.stringify(names));
}

export function upsertDevice(history, deviceId, deviceInfo) {
  const existing = history.find(d => d.deviceId === deviceId);
  if (existing) {
    existing.lastLogin = new Date().toISOString();
    existing.deviceType = deviceInfo.deviceType;
    existing.browser = deviceInfo.browser;
    return history;
  }
  return [
    ...history,
    {
      deviceId,
      userName: "",
      deviceType: deviceInfo.deviceType,
      browser: deviceInfo.browser,
      lastLogin: new Date().toISOString(),
    },
  ];
}

export function removeDevice(history, deviceId) {
  return history.filter(d => d.deviceId !== deviceId);
}

export function renameDevice(history, userNames, deviceId, newName) {
  const updatedHistory = history.map(d =>
    d.deviceId === deviceId ? { ...d, userName: newName } : d
  );
  const updatedNames = { ...userNames, [deviceId]: newName };
  saveUserNames(updatedNames);
  saveDeviceHistory(updatedHistory);
  return { updatedHistory, updatedNames };
}

export function formatTime(isoString) {
  if (!isoString) return "Never";
  const d = new Date(isoString);
  return d.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}