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
  configApiRef,
  createApiFactory,
} from '@backstage/core-plugin-api';

export const apis: AnyApiFactory[] = [
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
];
