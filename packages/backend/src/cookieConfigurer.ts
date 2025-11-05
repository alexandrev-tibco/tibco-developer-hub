/*
 * Copyright (c) 2023-2025. Cloud Software Group, Inc. All Rights Reserved. Confidential & Proprietary
 */

import { CookieConfigurer } from '@backstage/plugin-auth-node';

type ConfigReader = {
  getOptionalStringArray(key: string): string[] | undefined;
  getString(key: string): string;
};

export const DEFAULT_PLATFORM_COOKIE_DOMAIN = '.platform.alex';

const getCommonDomainFromHosts = (hosts: string[]): string | undefined => {
  if (hosts.length === 0) {
    return undefined;
  }

  const splitHosts = hosts.map(host => host.split('.'));
  const maxCommonLength = Math.min(...splitHosts.map(parts => parts.length));
  const suffix: string[] = [];

  for (let offset = 1; offset <= maxCommonLength; offset += 1) {
    const candidate = splitHosts[0][splitHosts[0].length - offset];
    if (
      splitHosts.every(parts => parts[parts.length - offset] === candidate)
    ) {
      suffix.unshift(candidate);
    } else {
      break;
    }
  }

  return suffix.length > 0 ? suffix.join('.') : undefined;
};

export const resolvePlatformCookieDomain = (
  config: ConfigReader,
  fallback: string = DEFAULT_PLATFORM_COOKIE_DOMAIN,
): string => {
  const optionalOrigins = config.getOptionalStringArray(
    'auth.experimentalExtraAllowedOrigins',
  );
  const origins =
    optionalOrigins ?? [config.getString('app.baseUrl')];

  const hosts = origins
    .map(origin => {
      try {
        return new URL(origin).hostname.toLowerCase();
      } catch {
        return undefined;
      }
    })
    .filter((host): host is string => Boolean(host));

  const commonHost = getCommonDomainFromHosts(hosts);
  if (commonHost) {
    return `.${commonHost}`;
  }

  return fallback;
};

/**
 * Forces auth related cookies to use the shared platform domain while
 * preserving Backstage's default cookie behaviour.
 */
export const createPlatformCookieConfigurer = (
  platformCookieDomain: string,
): CookieConfigurer => ({ callbackUrl, providerId, appOrigin }) => {
  const { hostname: originalDomain, pathname, protocol } = new URL(callbackUrl);
  const secure = protocol === 'https:';

  let sameSite: ReturnType<CookieConfigurer>['sameSite'] = 'lax';
  if (new URL(appOrigin).hostname !== originalDomain && secure) {
    sameSite = 'none';
  }

  const path = pathname.endsWith(`${providerId}/handler/frame`)
    ? pathname.slice(0, -'/handler/frame'.length)
    : `${pathname}/${providerId}`;

  return {
    domain: platformCookieDomain,
    path,
    secure,
    sameSite,
  };
};
