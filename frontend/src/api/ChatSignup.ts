import axios from "axios";
import { ApiError } from "../shared/errors";
import { trackError } from "../pages/store/ErrorStore";
import { analytics } from "../App";

export async function chatSignup(idToken: string) {
  let response;
  try {
    response = await axios.post(`/api/chat-signup`, undefined, {
      headers: {
        ...(idToken && { Authorization: `Bearer ${idToken}` }),
      },
    });
  } catch (e: any) {
    const error = new ApiError({
      errorId: "ChatSignup",
      message: "An error occurred while signing up for the chat alpha.",
      status: e.status,
      statusText: e.message,
      url: e.request?.url,
      cause: e,
    });
    trackError(error);
    throw error;
  }
  analytics.track("ChatSignup", {
    status: response.status,
  });

  return response.data;
}
