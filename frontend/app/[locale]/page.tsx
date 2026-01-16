import { useTranslations } from 'next-intl';
import Header from '@/components/Header';

export default function HomePage() {
  const t = useTranslations('');

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <main className="container mx-auto px-4 py-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-primary mb-4">
            {t('system')}
          </h1>
          <p className="text-lg text-gray-600">
            日本の地理情報と社会経済データを統合的に可視化
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* 地理情報カード */}
          <div className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow">
            <h2 className="text-xl font-semibold text-gray-800 mb-3">
              地理情報
            </h2>
            <p className="text-gray-600">
              山地、平野、盆地、河川などの地理情報を地図上に表示
            </p>
          </div>

          {/* 行政区画カード */}
          <div className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow">
            <h2 className="text-xl font-semibold text-gray-800 mb-3">
              行政区画
            </h2>
            <p className="text-gray-600">
              都道府県、市区町村などの行政区画境界を可視化
            </p>
          </div>

          {/* インフラ情報カード */}
          <div className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow">
            <h2 className="text-xl font-semibold text-gray-800 mb-3">
              インフラ
            </h2>
            <p className="text-gray-600">
              鉄道、道路、空港、港湾などのインフラ情報を表示
            </p>
          </div>

          {/* 統計データカード */}
          <div className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow">
            <h2 className="text-xl font-semibold text-gray-800 mb-3">
              統計データ
            </h2>
            <p className="text-gray-600">
              人口、人口密度、経済規模などの統計情報を分析
            </p>
          </div>

          {/* 時系列データカード */}
          <div className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow">
            <h2 className="text-xl font-semibold text-gray-800 mb-3">
              時系列分析
            </h2>
            <p className="text-gray-600">
              人口推移、経済規模推移などの時系列データを可視化
            </p>
          </div>

          {/* 可視化ツールカード */}
          <div className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow">
            <h2 className="text-xl font-semibold text-gray-800 mb-3">
              可視化ツール
            </h2>
            <p className="text-gray-600">
              Kepler.glによる高度な地理データ探索UI
            </p>
          </div>
        </div>

        <div className="mt-12 text-center">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 inline-block">
            <h3 className="text-lg font-semibold text-blue-900 mb-2">
              🚧 開発中
            </h3>
            <p className="text-blue-700">
              このアプリケーションは現在開発中です。<br />
              機能は順次追加されていきます。
            </p>
          </div>
        </div>
      </main>

      <footer className="bg-gray-800 text-white py-6 mt-12">
        <div className="container mx-auto px-4 text-center">
          <p>&copy; 2026 Japan Geographic. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
