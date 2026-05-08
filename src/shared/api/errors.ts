import { ApiClientError } from "./client";

export function getErrorMessage(error: unknown) {
  if (error instanceof ApiClientError) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "요청 처리에 실패했습니다.";
}
