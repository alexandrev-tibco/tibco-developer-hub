import {
  createTranslationMessages,
  createFrontendModule,
} from '@backstage/frontend-plugin-api';
import { TranslationBlueprint } from '@backstage/plugin-app-react';
import { catalogTranslationRef } from '@backstage/plugin-catalog';
import { scaffolderTranslationRef } from '@backstage/plugin-scaffolder/alpha';

export const catalogTranslations = createFrontendModule({
  pluginId: 'app',
  extensions: [
    TranslationBlueprint.make({
      name: 'catalog-overrides',
      params: {
        resource: createTranslationMessages({
          ref: catalogTranslationRef,
          messages: {
            'indexPage.createButtonTitle': 'Develop',
          },
        }),
      },
    }),
    TranslationBlueprint.make({
      name: 'scaffolder-overrides',
      params: {
        resource: createTranslationMessages({
          ref: scaffolderTranslationRef,
          messages: {
            'fields.gitlabRepoPicker.owner.title': 'Gitlab Subgroup Path',
          },
        }),
      },
    }),
  ],
});
