import { CatalogBuilder } from '@backstage/plugin-catalog-backend';
import { EntityProvider } from '@backstage/plugin-catalog-node';
import { ScaffolderEntitiesProcessor } from '@backstage/plugin-catalog-backend-module-scaffolder-entity-model';
import { GitLabDiscoveryProcessor, GitlabDiscoveryEntityProvider } from '@backstage/plugin-catalog-backend-module-gitlab';



import {
  GithubEntityProvider,
  GithubOrgEntityProvider,
  GithubLocationAnalyzer,
} from '@backstage/plugin-catalog-backend-module-github';
import { Router } from 'express';
import { PluginEnvironment } from '../types';

export default async function createPlugin(
  env: PluginEnvironment,
): Promise<Router> {
  const builder = await CatalogBuilder.create(env);
  builder.addProcessor(
    GitLabDiscoveryProcessor.fromConfig(env.config, { logger: env.logger }),
  );
  const config = env.config;
  let catalogRefreshDelay: number | undefined = config?.getOptionalNumber(
    'catalogRefreshDelayInSec',
  );

  if (catalogRefreshDelay) {
    if (typeof catalogRefreshDelay === 'number') {
      if (catalogRefreshDelay < 100) {
        catalogRefreshDelay = 100;
        console.warn(
          'Catalog Refresh Delay cannot be less than 100, resetting it to 100',
        );
      } else if (catalogRefreshDelay > 900) {
        catalogRefreshDelay = 900;
        console.warn(
          'Catalog Refresh Delay cannot be greater than 900, resetting it to 900',
        );
      }
      builder.setProcessingIntervalSeconds(catalogRefreshDelay);
    } else {
      console.error(
        'Catalog Refresh Delay must be a number between 100 and 900',
      );
    }
  }

  const gitlabProvider = GitlabDiscoveryEntityProvider.fromConfig(env.config, {
    logger: env.logger,
    // optional: alternatively, use scheduler with schedule defined in app-config.yaml
    schedule: env.scheduler.createScheduledTaskRunner({
      frequency: { minutes: 30 },
      timeout: { minutes: 3 },
    }),
    // optional: alternatively, use schedule
    scheduler: env.scheduler
  });
  builder.addEntityProvider(gitlabProvider);

  builder.addProcessor(new ScaffolderEntitiesProcessor());


  builder.addEntityProvider(getGithubProviders(env));
  builder.addLocationAnalyzers(
    new GithubLocationAnalyzer({
      discovery: env.discovery,
      config: env.config,
      tokenManager: env.tokenManager,
    }),
  );
  const { processingEngine, router } = await builder.build();
  await processingEngine.start();
  return router;
}

function getGithubProviders(env: PluginEnvironment): EntityProvider[] {
  const entityProviders: EntityProvider[] = [];

  entityProviders.push(
    // array will be empty if there are no providers configured under catalog.providers.github
    ...GithubEntityProvider.fromConfig(env.config, {
      logger: env.logger,
      scheduler: env.scheduler,
    }),
  );

  const orgProviderConfig = env.config.getOptionalConfig(
    'orgCatalog.providers.github',
  );
  if (orgProviderConfig) {
    entityProviders.push(
      GithubOrgEntityProvider.fromConfig(env.config, {
        id: orgProviderConfig.getString('providerId'),
        orgUrl: orgProviderConfig.get('orgUrl'),
        logger: env.logger,
        schedule: env.scheduler.createScheduledTaskRunner(
          orgProviderConfig.getOptional('schedule') ?? {
            frequency: { minutes: 60 },
            timeout: { minutes: 15 },
          },
        ),
      }),
    );
  }

  return entityProviders;
}
