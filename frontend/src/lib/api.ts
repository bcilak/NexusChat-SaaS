let API_BASE = process.env.NEXT_PUBLIC_API_BASE || "";

// Tarayıcı tarafındaysak ve yapılandırmada bir IP/localhost kaldıysa ve next rewrites () ile proxy kullanılıyorsa, 
// doğrudan relative path atılması için API base'i temizliyoruz:
if (typeof window !== "undefined") {
  if (API_BASE.includes("localhost") || API_BASE.includes("127.0.0.1")) {
    API_BASE = "";
  }
}

// --- Token management ---
function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("auth_token");
}

export function setToken(token: string) {
  localStorage.setItem("auth_token", token);
}

export function clearToken() {
  localStorage.removeItem("auth_token");
}

// --- Fetch wrapper ---
export async function apiFetch(path: string, options: RequestInit = {}) {
  const token = getToken();
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  // Don't set Content-Type for FormData
  if (!(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  if (res.status === 401) {
    clearToken();
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
    throw new Error("Unauthorized");
  }

  let data;
  const contentType = res.headers.get("content-type");
  if (contentType && contentType.includes("application/json")) {
    data = await res.json();
  } else {
    const textData = await res.text();
    data = { detail: textData || "Bilinmeyen bir hata oluştu" };
  }

  if (!res.ok) {
    throw new Error(data.detail || "Bir hata oluştu");
  }

  return data;
}

// --- Auth ---
export const authApi = {
  register: (name: string, email: string, password: string) =>
    apiFetch("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({ name, email, password }),
    }),

  login: (email: string, password: string) =>
    apiFetch("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),

  getMe: () => apiFetch("/api/auth/me"),
};

// --- Bots ---
export const botsApi = {
  list: () => apiFetch("/api/bots"),

  get: (id: number) => apiFetch(`/api/bots/${id}`),

  create: (data: Record<string, unknown>) =>
    apiFetch("/api/bots", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  update: (id: number, data: Record<string, unknown>) =>
    apiFetch(`/api/bots/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  delete: (id: number) =>
    apiFetch(`/api/bots/${id}`, { method: "DELETE" }),
};

// --- Training ---
export const trainingApi = {
  upload: (botId: number, file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    return apiFetch(`/api/bots/${botId}/upload`, {
      method: "POST",
      body: formData,
    });
  },

  train: (botId: number) =>
    apiFetch(`/api/bots/${botId}/train`, { method: "POST" }),

  retrain: (botId: number) =>
    apiFetch(`/api/bots/${botId}/retrain`, { method: "POST" }),

  listDocuments: (botId: number) =>
    apiFetch(`/api/bots/${botId}/documents`),

  deleteDocument: (botId: number, docId: number) =>
    apiFetch(`/api/bots/${botId}/documents/${docId}`, { method: "DELETE" }),
};

// --- Web Training ---
export const webTrainApi = {
  trainUrl: (botId: number, url: string) =>
    apiFetch(`/api/bots/${botId}/web/train-url`, {
      method: "POST",
      body: JSON.stringify({ url }),
    }),

  trainWebsite: (botId: number, baseUrl: string, maxPages: number = 50) =>
    apiFetch(`/api/bots/${botId}/web/train-website`, {
      method: "POST",
      body: JSON.stringify({ base_url: baseUrl, max_pages: maxPages }),
    }),

  listPages: (botId: number) =>
    apiFetch(`/api/bots/${botId}/web/pages`),

  deletePage: (botId: number, pageId: number) =>
    apiFetch(`/api/bots/${botId}/web/pages/${pageId}`, { method: "DELETE" }),
};

// --- Chat ---
export const chatApi = {
  send: (botId: number, question: string, sessionId?: string, platform?: string) =>
    apiFetch(`/api/bots/${botId}/chat`, {
      method: "POST",
      body: JSON.stringify({ question, session_id: sessionId, platform: platform || "web" }),
    }),

  history: (botId: number, sessionId?: string, platform?: string) => {
    const params = new URLSearchParams();
    if (sessionId) params.append("session_id", sessionId);
    if (platform) params.append("platform", platform);
    const qs = params.toString();
    return apiFetch(`/api/bots/${botId}/chat/history${qs ? '?' + qs : ''}`);
  },

  deleteSession: (botId: number, sessionId: string) =>
    apiFetch(`/api/bots/${botId}/chat/history?session_id=${sessionId}`, {
      method: "DELETE"
    }),
};

// --- Integrations ---
export const integrationsApi = {
  list: (botId: number) => apiFetch(`/api/integrations/bot/${botId}`),
  create: (data: Record<string, unknown>) => apiFetch(`/api/integrations`, { method: "POST", body: JSON.stringify(data) }),
  delete: (id: number) => apiFetch(`/api/integrations/${id}`, { method: "DELETE" }),
  testConnection: (data: { provider: string; api_url: string; api_key: string; api_secret?: string }) =>
    apiFetch(`/api/integrations/test-connection`, {
      method: "POST",
      body: JSON.stringify(data),
    }),
  exchangeIdeasoft: (data: Record<string, unknown>) => apiFetch(`/api/integrations/ideasoft/callback-exchange`, { method: "POST", body: JSON.stringify(data) }),
};

// --- Analytics ---
export const analyticsApi = {
  getStats: (botId: number) => apiFetch(`/api/analytics/bot/${botId}/stats`),
  getFallbacks: (botId: number) => apiFetch(`/api/analytics/bot/${botId}/fallbacks`),
  getHistory: (botId: number, params: { start_date?: string, end_date?: string, search?: string, platform?: string }) => {
    const q = new URLSearchParams();
    if (params.start_date) q.append("start_date", params.start_date);
    if (params.end_date) q.append("end_date", params.end_date);
    if (params.search) q.append("search", params.search);
    if (params.platform) q.append("platform", params.platform);
    const qs = q.toString();
    return apiFetch(`/api/analytics/bot/${botId}/history${qs ? "?" + qs : ""}`);
  },
  analyzeHistory: (botId: number, data: { start_date?: string, end_date?: string, search?: string }) =>
    apiFetch(`/api/analytics/bot/${botId}/analyze`, {
      method: "POST",
      body: JSON.stringify(data),
    }),
};

// --- Admin ---
export const adminApi = {
  getStats: () => apiFetch(`/api/admin/stats`),

  getUsers: () => apiFetch(`/api/admin/users`),

  updateUser: (userId: number, payload: Record<string, any>) =>
    apiFetch(`/api/admin/users/${userId}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    }),

  updateUserPlan: (userId: number, plan: string) =>
    apiFetch(`/api/admin/users/${userId}/plan`, {
      method: "PUT",
      body: JSON.stringify({ plan }),
    }),

  getBots: () => apiFetch(`/api/admin/bots`),

  deleteBot: (botId: number) =>
    apiFetch(`/api/admin/bots/${botId}`, { method: "DELETE" }),
};

// --- Inbox (Omnichannel & WhatsApp Live Chat) ---
export const inboxApi = {
  getConversations: (botId: number) =>
    apiFetch(`/api/bots/${botId}/inbox/conversations`),

  getMessages: (botId: number, convId: number) =>
    apiFetch(`/api/bots/${botId}/inbox/conversations/${convId}/messages`),

  toggleAi: (botId: number, convId: number, is_ai_active: boolean) =>
    apiFetch(`/api/bots/${botId}/inbox/conversations/${convId}/toggle-ai`, {
      method: "POST",
      body: JSON.stringify({ is_ai_active }),
    }),

  sendMessage: (botId: number, convId: number, content: string) =>
    apiFetch(`/api/bots/${botId}/inbox/conversations/${convId}/send`, {
      method: "POST",
      body: JSON.stringify({ content }),
    }),

  deleteConversation: (botId: number, convId: number) =>
    apiFetch(`/api/bots/${botId}/inbox/conversations/${convId}`, {
      method: "DELETE"
    }),
};

// --- Bot API Tools ---
export const toolsApi = {
  list: (botId: number) =>
    apiFetch(`/api/bots/${botId}/tools`),

  create: (botId: number, data: object) =>
    apiFetch(`/api/bots/${botId}/tools`, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  update: (botId: number, toolId: number, data: object) =>
    apiFetch(`/api/bots/${botId}/tools/${toolId}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  delete: (botId: number, toolId: number) =>
    apiFetch(`/api/bots/${botId}/tools/${toolId}`, { method: "DELETE" }),

  toggle: (botId: number, toolId: number) =>
    apiFetch(`/api/bots/${botId}/tools/${toolId}/toggle`, { method: "PATCH" }),

  test: (botId: number, data: object) =>
    apiFetch(`/api/bots/${botId}/tools/test`, {
      method: "POST",
      body: JSON.stringify(data),
    }),
};

// --- Tickets ---
export const ticketsApi = {
  getTickets: (botId: number) => apiFetch(`/api/bots/${botId}/tickets`),
  updateTicketStatus: (botId: number, ticketId: number, status: string) =>
    apiFetch(`/api/bots/${botId}/tickets/${ticketId}`, {
      method: "PATCH",
      body: JSON.stringify({ status })
    })
};

export { API_BASE };
