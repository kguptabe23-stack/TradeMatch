import { apiFetch } from "../api/client";

export async function hasActiveListing() {
  try {
    const { listings } = await apiFetch("/api/listings/mine");
    return listings.some((l) => l.status === "ACTIVE");
  } catch {
    return false;
  }
}
