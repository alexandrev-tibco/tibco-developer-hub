/*
 * Copyright (c) 2023-2025. Cloud Software Group, Inc. All Rights Reserved. Confidential & Proprietary
 */

import {
  coreServices,
  createBackendModule,
} from '@backstage/backend-plugin-api';
import {
  DEFAULT_NAMESPACE,
  stringifyEntityRef,
} from '@backstage/catalog-model';
import {
  AuthProviderFactory,
  authProvidersExtensionPoint,
  createOAuthProviderFactory,
} from '@backstage/plugin-auth-node';
import { oidcAuthenticator } from './authenticator.ts';
import {
  createPlatformCookieConfigurer,
  resolvePlatformCookieDomain,
} from './cookieConfigurer.ts';

export default createBackendModule({
  pluginId: 'auth',
  moduleId: 'tibco-control-plane',
  register(reg) {
    reg.registerInit({
      deps: {
        providers: authProvidersExtensionPoint,
        config: coreServices.rootConfig,
      },
      async init({ providers, config }) {
        const enableAuthProviders = config.getOptionalStringArray(
          'auth.enableAuthProviders',
        );
        if (
          enableAuthProviders &&
          enableAuthProviders.includes('tibco-control-plane')
        ) {
        const tibcoFactory = createOAuthProviderFactory({
          authenticator: oidcAuthenticator(config),
          async signInResolver(info, ctx) {
            if (!info.result.fullProfile.userinfo.email?.split('@')[0]) {
              throw new Error('Email not found in OIDC response');
            }
            const userRef = stringifyEntityRef({
              kind: 'User',
              name: info.result.fullProfile.userinfo.email.split('@')[0],
              namespace: DEFAULT_NAMESPACE,
            });
            return ctx.issueToken({
              claims: {
                sub: userRef,
                ent: [userRef],
              },
            });
          },
        });

        const platformCookieDomain = resolvePlatformCookieDomain(config);
        const cookieConfigurer = createPlatformCookieConfigurer(
          platformCookieDomain,
        );
        const cookieConfiguredFactory: AuthProviderFactory = ctx =>
          tibcoFactory({
            ...ctx,
            cookieConfigurer,
          });

        providers.registerProvider({
          providerId: 'tibco-control-plane',
          factory: cookieConfiguredFactory,
        });
      }
      },
    });
  },
});
