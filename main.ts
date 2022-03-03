import fs = require('fs');
import path = require('path');

import { createServer as createViteServer } from 'vite';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/server/app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // 미들웨어 모드로 Vite 서버를 생성합니다.
  // 이는 Vite의 자체적인 HTML 제공 로직을 비활성화하고, 상위 서버가 제어하도록 합니다.
  //
  // 미들웨어 모드에서 Vite의 자체적인 HTML 제공 로직을 사용하고자 한다면,
  // `middlewareMode`(https://vitejs-kr.github.io/config/#server-middlewaremode)를 `'html'`로 설정하세요.
  const vite = await createViteServer({
    server: { middlewareMode: 'ssr' },
  });
  // Vite를 미들웨어로 사용합니다.
  app.use(vite.middlewares);

  app.use('*', async (req, res, next) => {
    const url = req.originalUrl;

    try {
      // 1. index.html 파일을 읽어들입니다.
      let template = fs.readFileSync(
        path.resolve(__dirname, 'index.html'),
        'utf-8',
      );

      // 2. Vite의 HTML 변환 작업을 통해 Vite HMR 클라이언트를 주입하고,
      //    Vite 플러그인의 HTML 변환도 적용합니다.
      //    (예시: @vitejs/plugin-react의 Global Preambles)
      template = await vite.transformIndexHtml(url, template);

      // 3. 서버의 진입점(Entry)을 로드합니다.
      //    vite.ssrLoadModule은 Node.js에서 사용할 수 있도록 ESM 소스 코드를 자동으로 변환합니다.
      //    추가적인 번들링이 필요하지 않으며, HMR과 유사한 동작을 수행합니다.
      const { render } = await vite.ssrLoadModule('/src/entry-server.jsx');

      // 4. 앱의 HTML을 렌더링합니다.
      //    이는 entry-server.js에서 내보낸(Export) `render` 함수가
      //    ReactDOMServer.renderToString()과 같은 적절한 프레임워크의 SSR API를 호출한다고 가정합니다.
      const appHtml = await render(url);

      // 5. 렌더링된 HTML을 템플릿에 주입합니다.
      const html = template.replace(`<!--ssr-outlet-->`, appHtml);

      // 6. 렌더링된 HTML을 응답으로 전송합니다.
      res.status(200).set({ 'Content-Type': 'text/html' }).end(html);
    } catch (e) {
      // 만약 오류가 발생된다면, Vite는 스택트레이스(Stacktrace)를 수정하여
      // 오류가 실제 코드에 매핑되도록 재구성합니다.
      vite.ssrFixStacktrace(e);
      next(e);
    }
  });

  await app.listen(3000);
}
bootstrap();
