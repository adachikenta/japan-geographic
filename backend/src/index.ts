import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';

type Bindings = {
  ENVIRONMENT?: string;
  // R2 Bucket (GeoJSONデータ)
  GEOJSON_BUCKET?: R2Bucket;
  // D1 Database (将来的に使用)
  // DB: D1Database;
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
    environment: c.env?.ENVIRONMENT || 'development',
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

// サンプルGeoJSONデータ（開発用）
const sampleGeoJSON = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: {
        prefCode: '13',
        prefName: '東京都',
        region: '関東地方',
        population: 14047594,
        area: 2194.07,
      },
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [139.5, 35.5],
            [139.9, 35.5],
            [139.9, 35.9],
            [139.5, 35.9],
            [139.5, 35.5],
          ],
        ],
      },
    },
    {
      type: 'Feature',
      properties: {
        prefCode: '27',
        prefName: '大阪府',
        region: '近畿地方',
        population: 8837685,
        area: 1905.32,
      },
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [135.3, 34.4],
            [135.7, 34.4],
            [135.7, 34.8],
            [135.3, 34.8],
            [135.3, 34.4],
          ],
        ],
      },
    },
    {
      type: 'Feature',
      properties: {
        prefCode: '01',
        prefName: '北海道',
        region: '北海道地方',
        population: 5224614,
        area: 83424.31,
      },
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [140.0, 42.5],
            [145.0, 42.5],
            [145.0, 45.5],
            [140.0, 45.5],
            [140.0, 42.5],
          ],
        ],
      },
    },
    {
      type: 'Feature',
      properties: {
        prefCode: '14',
        prefName: '神奈川県',
        region: '関東地方',
        population: 9237337,
        area: 2416.11,
      },
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [139.3, 35.2],
            [139.7, 35.2],
            [139.7, 35.6],
            [139.3, 35.6],
            [139.3, 35.2],
          ],
        ],
      },
    },
    {
      type: 'Feature',
      properties: {
        prefCode: '47',
        prefName: '沖縄県',
        region: '沖縄地方',
        population: 1467480,
        area: 2281.12,
      },
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [127.5, 26.0],
            [128.5, 26.0],
            [128.5, 26.9],
            [127.5, 26.9],
            [127.5, 26.0],
          ],
        ],
      },
    },
  ],
};

// GeoJSONデータ取得エンドポイント
api.get('/geojson/:filename', async (c) => {
  const filename = c.req.param('filename');

  // R2バケットが利用可能かチェック
  if (!c.env?.GEOJSON_BUCKET) {
    // R2が設定されていない場合は、サンプルデータを返す（開発環境用）
    if (filename === 'prefectures-sample.json') {
      return c.json(sampleGeoJSON);
    }
    return c.json(
      {
        error: 'R2 bucket not configured',
        message: 'GeoJSON data storage is not available in this environment',
      },
      503
    );
  }

  try {
    // R2からGeoJSONファイルを取得
    const object = await c.env.GEOJSON_BUCKET.get(filename);

    if (!object) {
      // R2にファイルがない場合もサンプルデータを返す（開発環境用）
      if (filename === 'prefectures-sample.json') {
        return c.json(sampleGeoJSON);
      }
      return c.json(
        {
          error: 'Not Found',
          message: `GeoJSON file '${filename}' not found`,
        },
        404
      );
    }

    // GeoJSONデータを返す
    const geojson = await object.json();
    return c.json(geojson);
  } catch (error) {
    console.error(`Error fetching GeoJSON: ${error}`);
    return c.json(
      {
        error: 'Internal Server Error',
        message: 'Failed to fetch GeoJSON data',
      },
      500
    );
  }
});

// 利用可能なGeoJSONファイル一覧取得
api.get('/geojson', async (c) => {
  // R2バケットが利用可能かチェック
  if (!c.env?.GEOJSON_BUCKET) {
    return c.json(
      {
        error: 'R2 bucket not configured',
        message: 'GeoJSON data storage is not available in this environment',
        availableFiles: [],
      },
      503
    );
  }

  try {
    // R2バケット内のファイル一覧を取得
    const listed = await c.env.GEOJSON_BUCKET.list();
    const files = listed.objects.map((obj) => ({
      name: obj.key,
      size: obj.size,
      uploaded: obj.uploaded,
    }));

    return c.json({
      message: '利用可能なGeoJSONファイル一覧',
      files,
      total: files.length,
    });
  } catch (error) {
    console.error(`Error listing GeoJSON files: ${error}`);
    return c.json(
      {
        error: 'Internal Server Error',
        message: 'Failed to list GeoJSON files',
      },
      500
    );
  }
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
