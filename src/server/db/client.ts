import { drizzle } from "drizzle-orm/bun-sql";
import * as schema from "./schema";

// Read-only mirror of the baseball-etl database — never write through this client.
export const db = drizzle(process.env.DATABASE_URL!, { schema });
