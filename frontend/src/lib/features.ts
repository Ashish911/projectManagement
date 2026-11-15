/**
 * Feature flags, set at build time with VITE_FEATURE_* env vars (off unless "true").
 * `clientAdminAnalytics`: the Analytics page for client admins. Hidden for now because it
 * repeats their Dashboard (CA-01); turn it on once it has its own content.
 */
export const FEATURES = {
    clientAdminAnalytics: import.meta.env.VITE_FEATURE_CA_ANALYTICS === "true",
}
