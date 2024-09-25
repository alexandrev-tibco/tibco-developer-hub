import { CatalogClient } from '@backstage/catalog-client';
import { createRouter } from '@backstage/plugin-scaffolder-backend';
import { Router } from 'express';
import type { PluginEnvironment } from '../types';
import { createBuiltinActions } from '@backstage/plugin-scaffolder-backend';
import { ScmIntegrations } from '@backstage/integration';
import {
  createAzurePipelineAction,
  permitAzurePipelineAction,
  runAzurePipelineAction,
} from "@parfuemerie-douglas/scaffolder-backend-module-azure-pipelines";

export default async function createPlugin(
  env: PluginEnvironment,
): Promise<Router> {
  const catalogClient = new CatalogClient({
    discoveryApi: env.discovery,
  });


  
  const integrations = ScmIntegrations.fromConfig(env.config);

  const actions = [
    createAzurePipelineAction({ integrations }),
    permitAzurePipelineAction({ integrations }),
    runAzurePipelineAction({ integrations }),
    ...createBuiltinActions({
      integrations,
      catalogClient,
      config: env.config,
      reader: env.reader,
    })
  ];


  return await createRouter({
    catalogClient,
    actions,
    // catalogClient: catalogClient,
    logger: env.logger,
    config: env.config,
    database: env.database,
    reader: env.reader,
    permissions: env.permissions,
    identity: env.identity,
    catalogClient,
  });
}
