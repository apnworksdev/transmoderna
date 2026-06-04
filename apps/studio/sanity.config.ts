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
  }
});
