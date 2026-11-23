import { defineConfig } from 'sanity';
import { structureTool } from 'sanity/structure';
import { schemaTypes } from './schemaTypes';
import { structure } from './structure';

export default defineConfig({
  name: 'default',
  title: 'Transmoderna Studio',
  projectId: process.env.SANITY_STUDIO_PROJECT_ID ?? 'replace-with-project-id',
  dataset: process.env.SANITY_STUDIO_DATASET ?? 'production',
  plugins: [structureTool({ structure })],
  schema: {
    types: schemaTypes
  },
  document: {
    newDocumentOptions: (prev, { creationContext }) => {
      if (creationContext.type === 'global') {
        return prev.filter((item) => item.templateId !== 'siteFooter');
      }
      return prev;
    },
    actions: (prev, { schemaType }) => {
      if (schemaType === 'siteFooter') {
        return prev.filter(
          (action) => action.action !== 'delete' && action.action !== 'duplicate'
        );
      }
      return prev;
    }
  }
});
