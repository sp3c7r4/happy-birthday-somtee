import mongoose from "mongoose";
import { Resolver } from "dns/promises";

// Some networks (phone hotspots, captive portals, some ISP resolvers) return
// SRV/TXT responses that Node's c-ares resolver rejects (EBADRESP), which
// breaks `mongodb+srv://` host discovery. When `DNS_SERVERS` is set, we resolve
// the SRV/TXT records ourselves with a dedicated resolver and connect to the
// cluster directly, bypassing the broken system resolver. Leave unset on
// networks that resolve normally (e.g. Vercel).
const dnsServers = (process.env.DNS_SERVERS ?? "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

type MongooseCache = {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
};

// Reuse one connection across hot reloads in dev and across requests in prod.
const globalForMongoose = globalThis as unknown as { _mongoose?: MongooseCache };
const cached: MongooseCache =
  globalForMongoose._mongoose ?? (globalForMongoose._mongoose = { conn: null, promise: null });

export async function connectToDatabase() {
  if (cached.conn) return cached.conn;

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("MONGODB_URI is not set. Copy .env.example to .env.local and add your connection string.");
  }

  if (!cached.promise) {
    cached.promise = (async () => {
      const target = await resolveTargetUri(uri);
      return mongoose.connect(target, {
        dbName: process.env.MONGODB_DB || "somto_birthday",
        bufferCommands: false,
      });
    })();
  }

  try {
    cached.conn = await cached.promise;
  } catch (err) {
    cached.promise = null;
    throw err;
  }
  return cached.conn;
}

// If DNS_SERVERS is configured and the URI uses the SRV scheme, resolve the
// SRV/TXT records ourselves and return a direct connection string. The direct
// scheme uses getaddrinfo (which works on these networks) instead of SRV.
async function resolveTargetUri(uri: string): Promise<string> {
  if (!uri.startsWith("mongodb+srv://") || dnsServers.length === 0) return uri;

  try {
    const parsed = new URL(uri);
    const hostname = parsed.hostname;

    const resolver = new Resolver();
    resolver.setServers(dnsServers);

    const [srv, txt] = await Promise.all([
      resolver.resolveSrv(`_mongodb._tcp.${hostname}`),
      resolver.resolveTxt(hostname),
    ]);

    const hosts = srv.map((r) => `${r.name}:${r.port}`).join(",");
    const txtParams = new URLSearchParams(txt.flat().join("&"));
    const replicaSet = txtParams.get("replicaSet");
    const authSource = txtParams.get("authSource") ?? "admin";

    const search = new URLSearchParams(parsed.searchParams);
    if (replicaSet && !search.has("replicaSet")) search.set("replicaSet", replicaSet);
    if (!search.has("authSource")) search.set("authSource", authSource);
    search.set("tls", "true"); // mongodb+srv implies TLS; the direct scheme does not

    const userInfo = parsed.username
      ? `${encodeURIComponent(parsed.username)}${parsed.password ? `:${encodeURIComponent(parsed.password)}` : ""}@`
      : "";

    return `mongodb://${userInfo}${hosts}/?${search.toString()}`;
  } catch {
    // Fall back to the original URI and let the driver attempt SRV discovery.
    return uri;
  }
}
