import { Router } from 'express';
import fs from 'fs';
import path from 'path';

const openApiPath = path.resolve(
    __dirname,
    '../../docs/openapi/auth.openapi.json',
);

function readOpenApiSpec() {
    const file = fs.readFileSync(openApiPath, 'utf-8');
    return JSON.parse(file);
}

const swaggerHtml = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>MedSphere Auth Service Docs</title>
    <link
      rel="stylesheet"
      href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css"
    />
    <style>
      body {
        margin: 0;
        background: #f6f8fb;
      }
      .topbar {
        display: none;
      }
    </style>
  </head>
  <body>
    <div id="swagger-ui"></div>
    <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
    <script>
      window.onload = () => {
        window.SwaggerUIBundle({
          url: '/docs/openapi.json',
          dom_id: '#swagger-ui',
          deepLinking: true,
          presets: [window.SwaggerUIBundle.presets.apis],
        });
      };
    </script>
  </body>
</html>`;

export const swaggerRoutes = Router();

swaggerRoutes.get('/', (_req, res) => {
    res.type('html').send(swaggerHtml);
});

swaggerRoutes.get('/openapi.json', (_req, res) => {
    res.json(readOpenApiSpec());
});
