// =============================================================
// Clio API HTTP Client with automatic token refresh
// =============================================================

import { readFileSync, writeFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const TOKEN_FILE = resolve(__dirname, "../../.tokens.json");

export class ClioClient {
  constructor() {
    this.baseUrl = process.env.CLIO_BASE_URL || "https://app.clio.com";
    this.clientId = process.env.CLIO_CLIENT_ID;
    this.clientSecret = process.env.CLIO_CLIENT_SECRET;
    this.accessToken = null;
    this.refreshToken = null;
    this.tokenExpiry = null;
    this._loadTokens();
  }

  _loadTokens() {
    // Priority: token file > env vars
    if (existsSync(TOKEN_FILE)) {
      try {
        const data = JSON.parse(readFileSync(TOKEN_FILE, "utf-8"));
        this.accessToken = data.access_token || null;
        this.refreshToken = data.refresh_token || null;
        this.tokenExpiry = data.expires_at ? new Date(data.expires_at) : null;
        return;
      } catch {
        // fall through to env
      }
    }
    this.accessToken = process.env.CLIO_ACCESS_TOKEN || null;
    this.refreshToken = process.env.CLIO_REFRESH_TOKEN || null;
  }

  _saveTokens(accessToken, refreshToken, expiresIn) {
    this.accessToken = accessToken;
    if (refreshToken) this.refreshToken = refreshToken;
    this.tokenExpiry = new Date(Date.now() + expiresIn * 1000);

    const data = {
      access_token: this.accessToken,
      refresh_token: this.refreshToken,
      expires_at: this.tokenExpiry.toISOString(),
      updated_at: new Date().toISOString(),
    };
    writeFileSync(TOKEN_FILE, JSON.stringify(data, null, 2));
  }

  isAuthenticated() {
    return !!(this.accessToken && this.refreshToken);
  }

  isTokenExpired() {
    if (!this.tokenExpiry) return true;
    // Refresh 5 minutes before actual expiry
    return Date.now() > this.tokenExpiry.getTime() - 5 * 60 * 1000;
  }

  async refreshAccessToken() {
    if (!this.refreshToken) {
      throw new Error(
        "No refresh token available. Run `npm run auth` to authenticate."
      );
    }

    const params = new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: this.refreshToken,
      client_id: this.clientId,
      client_secret: this.clientSecret,
    });

    const res = await fetch(`${this.baseUrl}/oauth/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Token refresh failed (${res.status}): ${body}`);
    }

    const data = await res.json();
    this._saveTokens(
      data.access_token,
      data.refresh_token || this.refreshToken,
      data.expires_in
    );
    console.log("[Clio] Access token refreshed successfully.");
  }

  async request(method, path, { params, body } = {}) {
    if (!this.isAuthenticated()) {
      throw new Error("Not authenticated. Run `npm run auth` first.");
    }

    // Auto-refresh if expired
    if (this.isTokenExpired()) {
      await this.refreshAccessToken();
    }

    let url = `${this.baseUrl}/api/v4${path}`;
    if (params) {
      const qs = new URLSearchParams(params).toString();
      url += `?${qs}`;
    }

    const headers = {
      Authorization: `Bearer ${this.accessToken}`,
      "Content-Type": "application/json",
    };

    const opts = { method, headers };
    if (body) opts.body = JSON.stringify(body);

    const res = await fetch(url, opts);

    // If 401, try one refresh and retry
    if (res.status === 401) {
      await this.refreshAccessToken();
      headers.Authorization = `Bearer ${this.accessToken}`;
      const retry = await fetch(url, { ...opts, headers });
      if (!retry.ok) {
        const text = await retry.text();
        throw new Error(`Clio API error (${retry.status}): ${text}`);
      }
      return retry.json();
    }

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Clio API error (${res.status}): ${text}`);
    }

    return res.json();
  }

  // Convenience methods
  async get(path, params) {
    return this.request("GET", path, { params });
  }

  async post(path, body) {
    return this.request("POST", path, { body });
  }

  async patch(path, body) {
    return this.request("PATCH", path, { body });
  }

  async delete(path) {
    return this.request("DELETE", path);
  }
}

// Singleton
let _instance = null;
export function getClioClient() {
  if (!_instance) _instance = new ClioClient();
  return _instance;
}
