/*
 * Copyright (c) 2023-2025. Cloud Software Group, Inc. All Rights Reserved. Confidential & Proprietary
 */

import { CookieConfigurer } from '@backstage/plugin-auth-node';

export const PLATFORM_COOKIE_DOMAIN = '.platform.alex';



/**
 * Forces auth related cookies to use the shared platform domain while
 * preserving Backstage's default cookie behaviour. If the current app origin
 * is not part of the platform domain, the original domain is kept to avoid
 * breaking local environments.
 */
export const platformCookieConfigurer: CookieConfigurer = ({
  callbackUrl,
  providerId,
  appOrigin,
}) => {
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
    domain: PLATFORM_COOKIE_DOMAIN,
    path,
    secure,
    sameSite,
  };
};
