import { withSentryConfig } from '@sentry/nextjs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: { ignoreDuringBuilds: false },
  typescript: { ignoreBuildErrors: false },
  webpack: (config) => {
    // Workaround for Sentry loader referencing a non-existent internal template path
    // '@sentry/nextjs/esm/config/templates/requestAsyncStorageShim.js'.
    // We alias it to a local no-op shim until SDK provides the file or fixes reference.
    config.resolve = config.resolve || {};
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      '@sentry/nextjs/esm/config/templates/requestAsyncStorageShim.js': path.resolve(
        __dirname,
        'src/sentry-request-async-storage-shim.ts'
      ),
    };
    return config;
  },
};

const sentryWebpackPluginOptions = {
  silent: true,
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  disable: !process.env.SENTRY_AUTH_TOKEN,
};

export default withSentryConfig(nextConfig, sentryWebpackPluginOptions);
