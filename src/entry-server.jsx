// eslint-disable-next-line @typescript-eslint/no-var-requires
import fs from 'fs';
import ReactDOMServer from 'react-dom/server';
import { StaticRouter } from 'react-router-dom';

const pagesPath = '/src/client/pages';

const ROUTES_PATH = fs
  .readdirSync(pagesPath, {
    encoding: 'utf-8',
  })
  .map((path) => {
    const routePath = `/${path}`;
    if (routePath === '/home') {
      return '/';
    }
    return routePath;
  });

export function render(url, context) {
  return ReactDOMServer.renderToString(
    ROUTES_PATH.map((path) => (
      <StaticRouter location={url} context={context}>
        {import(`${pagesPath}/${path}`)}
      </StaticRouter>
    )),
  );
}
