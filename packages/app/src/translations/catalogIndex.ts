/*
 * Copyright (c) 2023-2025. Cloud Software Group, Inc. All Rights Reserved. Confidential & Proprietary
 */

import { createTranslationResource } from '@backstage/core-plugin-api/alpha';
import { catalogTranslationRef } from '@backstage/plugin-catalog/alpha';
import { scaffolderTranslationRef } from '@backstage/plugin-scaffolder/alpha';

export const catalogMessages = createTranslationResource({
  ref: catalogTranslationRef,
  translations: {
    en: () =>
      // @ts-ignore
      Promise.resolve({
        default: {
          'indexPage.createButtonTitle': 'Develop',
        },
      }),
  },
});

export const scaffolderMessages = createTranslationResource({
  ref: scaffolderTranslationRef,
  translations: {
    en: () =>
      // @ts-ignore
      Promise.resolve({
        default: {
          'fields.gitlabRepoPicker.owner.title': 'Gitlab Subgroup Path',
        },
      }),
  },
});

