import {
    createRouter,
    DefaultJenkinsInfoProvider,
  } from '@backstage-community/plugin-jenkins-backend';
  import { CatalogClient } from '@backstage/catalog-client';
  import { Router } from 'express';
  import { PluginEnvironment } from '../types';
  
  export default async function createPlugin(
    env: PluginEnvironment,
  ): Promise<Router> {
    const catalog = new CatalogClient({
      discoveryApi: env.discovery,
    });

    console.log(JSON.stringify(env.config))
  
    return await createRouter({
      logger: env.logger,
      jenkinsInfoProvider: DefaultJenkinsInfoProvider.fromConfig({
        config: env.config,
        catalog: catalog,
        discovery: env.discovery
      }),
      permissions: env.permissions,
      discovery: env.discovery

    });
  }