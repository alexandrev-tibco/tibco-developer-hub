/*
 * Copyright (c) 2023-2025. Cloud Software Group, Inc. All Rights Reserved. Confidential & Proprietary
 */

import {
  ScmIntegrationsApi,
  scmIntegrationsApiRef,
  ScmAuth,
  scmAuthApiRef,
} from '@backstage/integration-react';
import {
  githubAuthApiRef,
  gitlabAuthApiRef,
  microsoftAuthApiRef,
  bitbucketAuthApiRef,
} from '@backstage/core-plugin-api';
import {
  AnyApiFactory,
  ApiRef,
  BackstageIdentityApi,
  configApiRef,
  createApiFactory,
  createApiRef,
  discoveryApiRef,
  fetchApiRef,
  identityApiRef,
  oauthRequestApiRef,
  OpenIdConnectApi,
  ProfileInfoApi,
  SessionApi,
} from '@backstage/core-plugin-api';
import { OAuth2 } from '@backstage/core-app-api';

export const platformOIDCAuthApiRef: ApiRef<
  OpenIdConnectApi & ProfileInfoApi & BackstageIdentityApi & SessionApi
> = createApiRef({
  id: 'auth.tibco-control-plane',
});

export const apis: AnyApiFactory[] = [
  createApiFactory({
    api: fetchApiRef,
    deps: { identityApi: identityApiRef },
    factory: ({ identityApi }) => ({
      fetch: async (
        input: Parameters<typeof fetch>[0],
        init?: Parameters<typeof fetch>[1],
      ): Promise<Response> => {
        const { token } = await identityApi.getCredentials();
        const headers = new Headers(init?.headers);
        if (token && !headers.has('Authorization')) {
          headers.set('Authorization', `Bearer ${token}`);
        }
        const response = await fetch(input, { ...init, headers });
        if (response.status === 401) {
          await identityApi.signOut();
        }
        return response;
      },
    }),
  }),
  createApiFactory({
    api: scmIntegrationsApiRef,
    deps: { configApi: configApiRef },
    factory: ({ configApi }) => ScmIntegrationsApi.fromConfig(configApi),
  }),
  createApiFactory({
    api: scmAuthApiRef,
    deps: {
      githubAuthApi: githubAuthApiRef,
      gitlabAuthApi: gitlabAuthApiRef,
      microsoftAuthApi: microsoftAuthApiRef,
      bitbucketAuthApi: bitbucketAuthApiRef,
      configApi: configApiRef,
    },
    factory: ({
      githubAuthApi,
      gitlabAuthApi,
      microsoftAuthApi,
      bitbucketAuthApi,
      configApi,
    }) => {
      // Try to read a self-hosted GitLab audience from config
      // Dynamically resolve environment for GitLab provider
      const gitlabEnvs = configApi.getOptionalConfigArray('integrations.gitlab') ?? [];


      let extraGitlabAuths: ReturnType<typeof ScmAuth.forGitlab>[] = [];

      for (let index = 0; index < gitlabEnvs.length; index++) {
        const element = gitlabEnvs[index];
        const host = element.getOptionalString("host") ?? "";
        if (host != "")  {
          try {
            // Avoid duplicating the default gitlab.com entry
            if (host && host !== 'gitlab.com') {
              extraGitlabAuths.push(
                ScmAuth.forGitlab(gitlabAuthApi, { host }),
              );
            }
          } catch (e) {
            // If audience isn't a valid URL, ignore gracefully
            // (Optionally log to console in dev env)
            // console.warn('Invalid GitLab audience URL in config:', audience);
          }
        }
      }

      return ScmAuth.merge(
        // Defaults
        ScmAuth.forGithub(githubAuthApi),
        ScmAuth.forGitlab(gitlabAuthApi),
        ScmAuth.forAzure(microsoftAuthApi),
        ScmAuth.forBitbucket(bitbucketAuthApi),
        // Extra GitLab host(s) from config
        ...extraGitlabAuths,
      );
    },
  }),
  createApiFactory({
    api: platformOIDCAuthApiRef,
    deps: {
      discoveryApi: discoveryApiRef,
      oauthRequestApi: oauthRequestApiRef,
      configApi: configApiRef,
    },
    factory: ({ discoveryApi, oauthRequestApi, configApi }) =>
      OAuth2.create({
        configApi,
        discoveryApi,
        oauthRequestApi,
        provider: {
          id: 'tibco-control-plane',
          title: 'TIBCO® Control Plane',
          icon: () => null,
        },
        environment: configApi.getOptionalString('auth.environment'),
        defaultScopes: ['openid', 'profile', 'email'],
        popupOptions: {
          size: {
            fullscreen: true,
          },
        },
      }),
  }),
];
