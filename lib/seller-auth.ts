import "server-only";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getSellerForUser } from "@/lib/marketplace";

/** Seller pages and actions: the signed-in person must be a seller with a store record. */
export async function requireSeller() {
  const user = await getCurrentUser();
  if (!user || user.role !== "seller") redirect("/login?next=/seller");
  const seller = await getSellerForUser(user.id);
  if (!seller) redirect("/sell");
  return { user, seller };
}

/** A seller whose store may take orders and show products (approved by the team). */
export const canSell = (status: string) => status === "approved";
