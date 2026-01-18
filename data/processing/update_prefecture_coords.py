"""
都道府県庁の正確な座標を使用してcreate_population_data.pyを更新
"""

from prefecture_capitals_data import PREFECTURE_CAPITALS_ACCURATE

# 人口データ（既存）
POPULATION_DATA = {
    "北海道": 5140000, "青森県": 1186000, "岩手県": 1180000, "宮城県": 2270000,
    "秋田県": 933000, "山形県": 1029000, "福島県": 1794000, "茨城県": 2843000,
    "栃木県": 1914000, "群馬県": 1919000, "埼玉県": 7345000, "千葉県": 6281000,
    "東京都": 14047000, "神奈川県": 9233000, "新潟県": 2155000, "富山県": 1016000,
    "石川県": 1119000, "福井県": 754000, "山梨県": 804000, "長野県": 2019000,
    "岐阜県": 1950000, "静岡県": 3602000, "愛知県": 7539000, "三重県": 1747000,
    "滋賀県": 1414000, "京都府": 2544000, "大阪府": 8809000, "兵庫県": 5408000,
    "奈良県": 1307000, "和歌山県": 911000, "鳥取県": 548000, "島根県": 663000,
    "岡山県": 1863000, "広島県": 2760000, "山口県": 1312000, "徳島県": 710000,
    "香川県": 944000, "愛媛県": 1316000, "高知県": 682000, "福岡県": 5135000,
    "佐賀県": 807000, "長崎県": 1290000, "熊本県": 1719000, "大分県": 1116000,
    "宮崎県": 1054000, "鹿児島県": 1570000, "沖縄県": 1467000
}

def generate_updated_code():
    """更新されたPREFECTURE_POPULATIONコードを生成"""

    print('# 2024年10月1日時点の都道府県人口データ（総務省統計局）')
    print('# center座標は各都道府県庁の正確な位置（世界測地系）')
    print('PREFECTURE_POPULATION = {')

    for pref_name, population in POPULATION_DATA.items():
        if pref_name in PREFECTURE_CAPITALS_ACCURATE:
            coords = PREFECTURE_CAPITALS_ACCURATE[pref_name]["center"]
            suffix = "庁" if pref_name not in ["東京都", "北海道"] else ("都庁" if pref_name == "東京都" else "道庁")
            print(f'    "{pref_name}": {{"population": {population}, "center": [{coords[0]:.5f}, {coords[1]:.5f}]}},  # {pref_name}{suffix}')

    print('}')

if __name__ == "__main__":
    print("="*70)
    print("create_population_data.py用の更新されたPREFECTURE_POPULATIONコード")
    print("="*70)
    print()
    generate_updated_code()
    print()
    print("="*70)
    print("上記をcreate_population_data.pyのPREFECTURE_POPULATIONに")
    print("コピー&ペーストしてください。")
    print("="*70)
