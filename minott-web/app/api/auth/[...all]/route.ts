import { toNextJsHandler } from "better-auth/next-js";
import { auth } from "@/lib/auth/portal";

export const { GET, POST } = toNextJsHandler(auth);
