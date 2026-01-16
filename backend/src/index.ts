import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';

type Bindings = {
  // D1 Database (将来的に使用)
  // DB: D1Database;
  // R2 Bucket (将来的に使用)
  // BUCKET: R2Bucket;
  // KV Namespace (将来的に使用)
  // KV: KVNamespace;
};

const app = new Hono<{ Bindings: Bindings }>();

// ミドルウェア設定
app.use('*', logger());
app.use(
  '*',
  cors({
    origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
    exposeHeaders: ['Content-Length'],
    maxAge: 600,
    credentials: true,
  })
);

// ヘルスチェック
app.get('/health', (c) => {
  return c.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'japan-geographic-backend',
  });
});

// API ルート
const api = app.basePath('/api');

// バージョン情報
api.get('/version', (c) => {
  return c.json({
    version: '1.0.0',
    api: 'v1',
    environment: c.env.ENVIRONMENT || 'development',
  });
});

// 地理情報関連のサンプルエンドポイント
api.get('/geography', (c) => {
  return c.json({
    message: '地理情報APIエンドポイント',
    data: [
      {
        id: 1,
        type: '山地',
        name: '日本アルプス',
        region: '中部地方',
      },
      {
        id: 2,
        type: '平野',
        name: '関東平野',
        region: '関東地方',
      },
      {
        id: 3,
        type: '河川',
        name: '利根川',
        region: '関東地方',
      },
    ],
  });
});

// 行政区画関連のサンプルエンドポイント
api.get('/prefectures', (c) => {
  return c.json({
    message: '都道府県情報APIエンドポイント',
    data: [
      {
        code: '13',
        name: '東京都',
        region: '関東地方',
        population: 14047594,
      },
      {
        code: '27',
        name: '大阪府',
        region: '近畿地方',
        population: 8837685,
      },
      {
        code: '01',
        name: '北海道',
        region: '北海道地方',
        population: 5224614,
      },
    ],
  });
});

// 統計データ関連のサンプルエンドポイント
api.get('/statistics', (c) => {
  return c.json({
    message: '統計データAPIエンドポイント',
    data: {
      totalPopulation: 125440000,
      prefectures: 47,
      municipalities: 1718,
      totalArea: 377975.21,
    },
  });
});

// 404 エラーハンドリング
app.notFound((c) => {
  return c.json(
    {
      error: 'Not Found',
      message: 'The requested resource was not found',
      path: c.req.path,
    },
    404
  );
});

// エラーハンドリング
app.onError((err, c) => {
  console.error(`Error: ${err.message}`);
  return c.json(
    {
      error: 'Internal Server Error',
      message: err.message,
    },
    500
  );
});

export default app;
