import { ConvexHttpClient } from "convex/browser";
import { api } from "./convex/_generated/api";

const CONVEX_URL = process.env.CONVEX_URL || "https://content-dolphin-131.convex.cloud";
const client = new ConvexHttpClient(CONVEX_URL);

async function main() {
    const adminUser = await client.mutation(api.admin.adminLogin, {
        email: "admin@example.com",
        password: "temp-hash-change-on-first-login"
    });
    console.log(`ADMIN_ID:${adminUser.userId}`);
}
main();
