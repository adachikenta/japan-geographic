"""
座標マッチングの問題を修正

同名の市区町村（府中市など）を都道府県コードで区別して
正しい座標を割り当てる
"""
import pandas as pd
import json

def load_city_population():
    """既存の人口データを読み込み"""
    from fetch_city_population import CITY_POPULATION_30K_PLUS
    return CITY_POPULATION_30K_PLUS

def load_official_coords():
    """国土数値情報を読み込み、都道府県コードも含める"""
    df = pd.read_csv('all_city_halls.csv')

    # 市区町村名から座標マップを作成（都道府県コード付き）
    coords_by_pref = {}

    for idx, row in df.iterrows():
        pref_code = str(row['prefecture_code']).zfill(2)
        city_name = row['city_name']
        key = f"{pref_code}_{city_name}"

        if key not in coords_by_pref:
            coords_by_pref[key] = {
                'coords': [row['longitude'], row['latitude']],
                'address': row['address']
            }

    return coords_by_pref, df

# 都道府県名→コードマッピング
PREF_CODE_MAP = {
    '北海道': '01', '青森県': '02', '岩手県': '03', '宮城県': '04', '秋田県': '05',
    '山形県': '06', '福島県': '07', '茨城県': '08', '栃木県': '09', '群馬県': '10',
    '埼玉県': '11', '千葉県': '12', '東京都': '13', '神奈川県': '14', '新潟県': '15',
    '富山県': '16', '石川県': '17', '福井県': '18', '山梨県': '19', '長野県': '20',
    '岐阜県': '21', '静岡県': '22', '愛知県': '23', '三重県': '24', '滋賀県': '25',
    '京都府': '26', '大阪府': '27', '兵庫県': '28', '奈良県': '29', '和歌山県': '30',
    '鳥取県': '31', '島根県': '32', '岡山県': '33', '広島県': '34', '山口県': '35',
    '徳島県': '36', '香川県': '37', '愛媛県': '38', '高知県': '39', '福岡県': '40',
    '佐賀県': '41', '長崎県': '42', '熊本県': '43', '大分県': '44', '宮崎県': '45',
    '鹿児島県': '46', '沖縄県': '47'
}

def match_with_prefecture_awareness(city_pop, coords_by_pref, df_all):
    """都道府県を考慮してマッチング"""
    print("=" * 80)
    print("都道府県を考慮した座標マッチング")
    print("=" * 80)

    matched = 0
    fuzzy_matched = 0
    not_matched = []
    updated_data = {}
    large_diff = []

    for city, data in city_pop.items():
        old_coords = data['center']
        pref_name = data['prefecture']
        pref_code = PREF_CODE_MAP.get(pref_name, '')

        # 1. 都道府県コード + 市名で完全一致を試す
        key = f"{pref_code}_{city}"

        if key in coords_by_pref:
            new_coords = coords_by_pref[key]['coords']
            matched += 1
        else:
            # 2. 市名だけでマッチ（都道府県なしの場合）
            matches = df_all[df_all['city_name'] == city]

            if len(matches) == 1:
                # 1件のみヒット
                new_coords = [matches.iloc[0]['longitude'], matches.iloc[0]['latitude']]
                fuzzy_matched += 1
            elif len(matches) > 1:
                # 複数ヒット→都道府県コードでフィルタ
                pref_matches = matches[matches['prefecture_code'] == pref_code]
                if len(pref_matches) > 0:
                    new_coords = [pref_matches.iloc[0]['longitude'], pref_matches.iloc[0]['latitude']]
                    fuzzy_matched += 1
                    print(f"⚠️  {city}（{pref_name}）: 複数候補から選択")
                else:
                    not_matched.append(f"{city}（{pref_name}）")
                    new_coords = old_coords
            else:
                not_matched.append(f"{city}（{pref_name}）")
                new_coords = old_coords

        # 差分チェック
        diff_lon = abs(new_coords[0] - old_coords[0])
        diff_lat = abs(new_coords[1] - old_coords[1])
        distance_km = ((diff_lon * 111) ** 2 + (diff_lat * 111) ** 2) ** 0.5

        if distance_km > 1.0:  # 1km以上の差
            large_diff.append({
                'city': city,
                'prefecture': pref_name,
                'old': old_coords,
                'new': new_coords,
                'diff_km': distance_km
            })

        updated_data[city] = {
            'population': data['population'],
            'center': new_coords,
            'prefecture': pref_name
        }

    print(f"\n✅ マッチング完了")
    print(f"   完全一致: {matched}都市")
    print(f"   曖昧一致: {fuzzy_matched}都市")
    print(f"   不一致: {len(not_matched)}都市")

    if large_diff:
        print(f"\n📍 1km以上の差分がある都市（上位20件）:")
        for item in sorted(large_diff, key=lambda x: x['diff_km'], reverse=True)[:20]:
            print(f"   {item['city']}（{item['prefecture']}）: {item['diff_km']:.2f}km")
            print(f"      旧: [{item['old'][0]:.6f}, {item['old'][1]:.6f}]")
            print(f"      新: [{item['new'][0]:.6f}, {item['new'][1]:.6f}]")

    if not_matched:
        print(f"\n⚠️  マッチしなかった都市:")
        for city_pref in not_matched:
            print(f"   - {city_pref}")

    return updated_data

def save_final_output(updated_data):
    """最終的な更新ファイルを生成"""
    output_path = 'fetch_city_population_FINAL.py'

    with open(output_path, 'w', encoding='utf-8') as f:
        f.write('"""\n')
        f.write('人口30,000人以上の都市データ\n')
        f.write('\n')
        f.write('人口データ: 2024年推計\n')
        f.write('座標データ: 国土数値情報 市町村役場データ（2014年度）\n')
        f.write('出典: https://nlftp.mlit.go.jp/ksj/gml/datalist/KsjTmplt-P34.html\n')
        f.write('更新日: 2026-01-19\n')
        f.write('"""\n\n')
        f.write('CITY_POPULATION_30K_PLUS = {\n')

        for city in sorted(updated_data.keys()):
            data = updated_data[city]
            pop = data['population']
            lon, lat = data['center']
            pref = data['prefecture']

            f.write(f'    "{city}": {{\n')
            f.write(f'        "population": {pop},\n')
            f.write(f'        "center": [{lon:.7f}, {lat:.7f}],\n')
            f.write(f'        "prefecture": "{pref}"\n')
            f.write(f'    }},\n')

        f.write('}\n')

    print(f"\n✅ 最終ファイル生成: {output_path}")
    print(f"   内容を確認後、fetch_city_population.pyと置き換えてください")

def main():
    print("\n🗾 座標修正処理（都道府県考慮版）\n")

    city_pop = load_city_population()
    coords_by_pref, df_all = load_official_coords()

    updated_data = match_with_prefecture_awareness(city_pop, coords_by_pref, df_all)
    save_final_output(updated_data)

    print("\n" + "=" * 80)
    print("✅ 処理完了")
    print("=" * 80)

if __name__ == '__main__':
    main()
