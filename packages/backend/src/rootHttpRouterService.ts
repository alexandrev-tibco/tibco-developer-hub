/*
 * Copyright (c) 2023-2025. Cloud Software Group, Inc. All Rights Reserved. Confidential & Proprietary
 */

import { rootHttpRouterServiceFactory } from '@backstage/backend-defaults/rootHttpRouter';
import express, { Request, Response, Router } from 'express';
import { getCPUrl } from './utils.ts';
import { DevHubConfig } from './config.ts';
import proxy from 'express-http-proxy';
import { idmJwtMiddlewareFunction } from './idmJwtMiddleware.ts';
import { KeyvStore } from './cacheService.ts';
import cookieParser from 'cookie-parser';
import jwtDecode from 'jwt-decode';
import { PLATFORM_COOKIE_DOMAIN } from './cookieConfigurer.ts';

export default rootHttpRouterServiceFactory({
  configure: async ({ app, middleware, routes, logger, config }) => {
    if (process.env.NODE_ENV === 'development') {
      app.use(middleware.cors());
    }

    const platformSuffix = PLATFORM_COOKIE_DOMAIN.slice(1);
    app.use((req, res, next) => {
      const originalSetHeader = res.setHeader.bind(res);
      const host =
        req.hostname || req.headers.host?.toString().split(':')[0] || '';

      res.setHeader = ((name, value) => {
        if (
          typeof name === 'string' &&
          name.toLowerCase() === 'set-cookie' &&
          host &&
          (host === platformSuffix || host.endsWith(`.${platformSuffix}`))
        ) {
          const applyDomain = (cookie: string) => {
            if (!cookie.startsWith('connect.sid=')) {
              return cookie;
            }
            if (/;\s*Domain=/i.test(cookie)) {
              return cookie;
            }
            return `${cookie}; Domain=${PLATFORM_COOKIE_DOMAIN}`;
          };

          if (Array.isArray(value)) {
            const updated = value.map(item =>
              typeof item === 'string' ? applyDomain(item) : item,
            );
            return originalSetHeader(name, updated);
          }
          if (typeof value === 'string') {
            return originalSetHeader(name, applyDomain(value));
          }
        }
        return originalSetHeader(name, value);
      }) as typeof res.setHeader;

      next();
    });

    const router = Router();
    router.use(express.json());
    router.use(express.urlencoded({ extended: true }));
    const cpUrl = getCPUrl();
    if (cpUrl.host && cpUrl.proxy) {
      router.get(
        DevHubConfig.wellKnownApiPath,
        proxy(cpUrl.proxy, {
          proxyReqPathResolver: () => {
            return DevHubConfig.wellKnownApiPath;
          },
          // @ts-ignore
          proxyReqOptDecorator: proxyReqOpts => {
            proxyReqOpts.headers['x-cp-host'] = cpUrl.host;
            proxyReqOpts.method = 'GET';
            return proxyReqOpts;
          },
        }),
      );
    } else {
      logger.error(
        'CP_URL or CP_DOMAIN not found as an environmental variable, .well-known api is not registered',
      );
    }
    router.get('/health', (_request: Request, response: Response) => {
      response.send({ status: 'ok' });
    });
    const enableAuthProviders = config.getOptionalStringArray(
      'auth.enableAuthProviders',
    );
    if (
      enableAuthProviders &&
      enableAuthProviders.includes('tibco-control-plane')
    ) {
      router.post(
        '/api/oidc/backchannel-logout',
        async (request: Request, response: Response) => {
          try {
            const logout_token = request.body?.logout_token;
            if (!logout_token) {
              logger.error('No logout_token found in payload');
              response.status(500).send(`No logout_token found in payload`);
            }
            const decoded: { secondaryKeys: string[] } =
              jwtDecode(logout_token);
            if (
              !(decoded.secondaryKeys && Array.isArray(decoded.secondaryKeys))
            ) {
              logger.error('No secondaryKeys array in decoded payload');
              response
                .status(500)
                .send(`No secondaryKeys array in decoded payload`);
            }
            const keys = decoded.secondaryKeys;
            for (const key of keys) {
              const token = await KeyvStore.keyv.get(key);
              if (token) {
                await KeyvStore.keyv.delete(token);
                await KeyvStore.keyv.delete(`${token}-info`);
                await KeyvStore.keyvMemory.delete(token);
              }
              await KeyvStore.keyv.delete(key);
            }
            response.send('OK');
          } catch (err) {
            logger.error('Error in backchannel logout:', err as Error);
            response
              .status(500)
              .send(`Internal Server Error: ${(err as Error).message}`);
          }
        },
      );
      app.use(cookieParser());
      // @ts-ignore
      app.use(idmJwtMiddlewareFunction(logger));
    }
    // @ts-ignore
    app.use(router);
    app.use(routes);
    app.use(middleware.notFound());
    app.use(middleware.error());
  },
});
