import { API_BASE_URL } from "../../shared/config/env";
import { apiRequest } from "../../shared/api/client";

export type LoginRequest = {
  accountId: string;
  password: string;
};

export type TokenPair = {
  accessToken: string;
  refreshToken: string;
};

export type SignupRequest = {
  accountId: string;
  email: string;
  password: string;
  profileImage: File;
  profileName: string;
};

export type OAuthProfileSetupRequest = {
  accountId: string;
  password: string;
  pendingToken: string;
  profileImage: File;
  profileName: string;
};

export type OAuthProfileSetupResponse = TokenPair & {
  isProfileCompleted: boolean;
};

export type OAuthProvider = "google" | "naver";

function createAuthProfileForm(
  request: Pick<
    SignupRequest,
    "accountId" | "password" | "profileImage" | "profileName"
  >,
) {
  const form = new FormData();
  form.append("accountId", request.accountId);
  form.append("profileName", request.profileName);
  form.append("profileImage", request.profileImage);
  form.append("password", request.password);

  return form;
}

export function login(request: LoginRequest) {
  return apiRequest<TokenPair>("/auth/login", {
    body: request,
    method: "POST",
  });
}

export function signup(request: SignupRequest) {
  const form = createAuthProfileForm(request);
  form.append("email", request.email);

  return apiRequest<void>("/auth/signup", {
    body: form,
    method: "POST",
  });
}

export function completeOAuthProfileSetup(
  request: OAuthProfileSetupRequest,
) {
  const form = createAuthProfileForm(request);
  const pendingToken = encodeURIComponent(request.pendingToken);

  return apiRequest<OAuthProfileSetupResponse>(
    `/auth/oauth/profile-setup?pendingToken=${pendingToken}`,
    {
      body: form,
      method: "POST",
    },
  );
}

export function reissueTokens(refreshToken: string) {
  return apiRequest<TokenPair>("/auth/reissue", {
    body: { refreshToken },
    method: "POST",
    skipAuthRefresh: true,
  });
}

export function getOAuthAuthorizeUrl(provider: OAuthProvider) {
  return `${API_BASE_URL}/oauth2/authorization/${provider}`;
}
