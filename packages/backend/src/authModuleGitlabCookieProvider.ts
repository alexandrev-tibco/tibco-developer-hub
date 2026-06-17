/*
 * Copyright (c) 2023-2025. Cloud Software Group, Inc. All Rights Reserved. Confidential & Proprietary
 */

import {
  coreServices,
  createBackendModule,
} from '@backstage/backend-plugin-api';
import {
  authProvidersExtensionPoint,
  commonSignInResolvers,
  createOAuthProviderFactory,
  AuthProviderFactory,
} from '@backstage/plugin-auth-node';
import {
  gitlabAuthenticator,
  gitlabSignInResolvers,
} from '@backstage/plugin-auth-backend-module-gitlab-provider';
import {
  createPlatformCookieConfigurer,
  resolvePlatformCookieDomain,
} from './cookieConfigurer.ts';

export default createBackendModule({
  pluginId: 'auth',
  moduleId: 'gitlab-cookie',
  register(reg) {
    reg.registerInit({
      deps: { providers: authProvidersExtensionPoint, config: coreServices.rootConfig },
      async init({ providers, config }) {
        const platformCookieDomain = resolvePlatformCookieDomain(
          config,
          '.dp.platform.mk',
        );
        const gitlabFactory = createOAuthProviderFactory({
          authenticator: gitlabAuthenticator,
          signInResolverFactories: {
            ...gitlabSignInResolvers,
            ...commonSignInResolvers,
          },
        });
        const cookieConfiguredFactory: AuthProviderFactory = ctx =>
          gitlabFactory({
            ...ctx,
            cookieConfigurer: createPlatformCookieConfigurer(
              platformCookieDomain,
            ),
          });
        providers.registerProvider({
          providerId: 'gitlab',
          factory: cookieConfiguredFactory,
        });
      },
    });
  },
});
