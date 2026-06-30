import type {
  Application,
  ApplicationCategory,
  ApplicationDetail,
  MockUser,
  TransitionAction,
} from "./types";

const API_BASE =
  (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, "") ||
  "http://localhost:5000/api";

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

const parseResponse = async <T>(response: Response): Promise<T> => {
  const body = await response.json().catch(() => ({}));

  if (!response.ok) {
    const detail =
      typeof body.detail === "string"
        ? body.detail
        : typeof body.error === "string"
          ? body.error
          : "Request failed";
    throw new ApiError(detail, response.status);
  }

  return body as T;
};

const request = async <T>(
  user: MockUser,
  path: string,
  options: RequestInit = {},
): Promise<T> => {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "x-user-id": user.id,
      "x-user-role": user.role,
      ...(options.headers ?? {}),
    },
  });

  return parseResponse<T>(response);
};

export const getApplications = (user: MockUser): Promise<Application[]> => {
  return request<Application[]>(user, "/applications");
};

export const getApplicationDetail = (
  user: MockUser,
  id: string,
): Promise<ApplicationDetail> => {
  return request<ApplicationDetail>(user, `/applications/${id}`);
};

export const createApplication = (
  user: MockUser,
  payload: {
    title: string;
    category: ApplicationCategory;
    description: string;
    amount: number;
  },
): Promise<Application> => {
  return request<Application>(user, "/applications", {
    method: "POST",
    body: JSON.stringify(payload),
  });
};

export const updateDraftApplication = (
  user: MockUser,
  id: string,
  payload: {
    title: string;
    category: ApplicationCategory;
    description: string;
    amount: number;
  },
): Promise<Application> => {
  return request<Application>(user, `/applications/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
};

export const transitionApplication = (
  user: MockUser,
  id: string,
  action: TransitionAction,
  comment?: string,
): Promise<{ message: string; application: Application }> => {
  return request<{ message: string; application: Application }>(
    user,
    `/applications/${id}/transition`,
    {
      method: "POST",
      body: JSON.stringify({ action, comment }),
    },
  );
};
