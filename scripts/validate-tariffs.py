#!/usr/bin/env python3
"""
Tarife Veri Doğrulama Scripti
JSON dosyalarındaki tarife verilerinin bütünlüğünü ve tutarlılığını kontrol eder.
"""

import json
import sys
from pathlib import Path

DATA_DIR = Path(__file__).parent.parent / "data"


def load_json(filepath):
    try:
        with open(filepath, "r", encoding="utf-8") as f:
            return json.load(f)
    except FileNotFoundError:
        print(f"[HATA] Dosya bulunamadı: {filepath}")
        return None
    except json.JSONDecodeError as e:
        print(f"[HATA] JSON parse hatası ({filepath}): {e}")
        return None


def validate_electricity(data):
    hatalar = []
    if not data:
        return ["Veri yüklenemedi"]

    if "lastUpdated" not in data:
        hatalar.append("lastUpdated eksik")

    if "tariffs" not in data:
        hatalar.append("tariffs bölümü eksik")
        return hatalar

    required_types = ["mesken", "ticarethane", "sanayi"]
    for t in required_types:
        if t not in data["tariffs"]:
            hatalar.append(f"'{t}' abone tipi eksik")
            continue

        for meter_type in ["tekZamanli", "cokZamanli"]:
            if meter_type not in data["tariffs"][t]:
                hatalar.append(f"{t}/{meter_type} eksik")
                continue

            mt = data["tariffs"][t][meter_type]

            if "tiers" not in mt and meter_type == "tekZamanli":
                hatalar.append(f"{t}/{meter_type} tiers eksik")
            elif meter_type == "tekZamanli":
                for i, tier in enumerate(mt["tiers"]):
                    if "pricePerKwh" not in tier:
                        hatalar.append(f"{t}/{meter_type} tier {i} pricePerKwh eksik")
                    if "min" not in tier or "max" not in tier:
                        hatalar.append(f"{t}/{meter_type} tier {i} min/max eksik")
                    if tier["pricePerKwh"] <= 0:
                        hatalar.append(f"{t}/{meter_type} tier {i} fiyat pozitif değil")

            if "fixedCharges" not in mt:
                hatalar.append(f"{t}/{meter_type} fixedCharges eksik")
            else:
                fc = mt["fixedCharges"]
                for key in ["distributionFee", "meterReadingFee", "transmissionPerKwh", "distributionPerKwh"]:
                    if key not in fc:
                        hatalar.append(f"{t}/{meter_type} fixedCharges.{key} eksik")
                    elif fc[key] < 0:
                        hatalar.append(f"{t}/{meter_type} fixedCharges.{key} negatif")

            if "taxes" not in mt:
                hatalar.append(f"{t}/{meter_type} taxes eksik")
            else:
                tx = mt["taxes"]
                for key in ["etvPerKwh", "trtBandRate", "municipalTaxRate", "kdvRate"]:
                    if key not in tx:
                        hatalar.append(f"{t}/{meter_type} taxes.{key} eksik")

    return hatalar


def validate_gas(data):
    hatalar = []
    if not data:
        return ["Veri yüklenemedi"]

    if "tariffs" not in data:
        hatalar.append("tariffs bölümü eksik")
        return hatalar

    required_types = ["mesken", "ticarethane", "sanayi"]
    for t in required_types:
        if t not in data["tariffs"]:
            hatalar.append(f"'{t}' abone tipi eksik")
            continue

        tariff = data["tariffs"][t]
        if "tiers" not in tariff:
            hatalar.append(f"{t} tiers eksik")
        else:
            for i, tier in enumerate(tariff["tiers"]):
                if "pricePerSm3" not in tier:
                    hatalar.append(f"{t} tier {i} pricePerSm3 eksik")
                if tier["pricePerSm3"] <= 0:
                    hatalar.append(f"{t} tier {i} fiyat pozitif değil")

    return hatalar


def validate_water(data):
    hatalar = []
    if not data:
        return ["Veri yüklenemedi"]

    if "tariffs" not in data:
        hatalar.append("tariffs bölümü eksik")
        return hatalar

    required_cities = ["istanbul", "ankara", "izmir", "bursa", "antalya", "adana", "kocaeli", "gaziantep", "konya"]
    for city in required_cities:
        if city not in data["tariffs"]:
            hatalar.append(f"'{city}' şehir verisi eksik")
            continue

        t = data["tariffs"][city]
        for key in ["authority", "water", "wastewater", "fixedCharges", "taxes"]:
            if key not in t:
                hatalar.append(f"{city} {key} eksik")

        if "water" in t and "tiers" in t["water"]:
            for i, tier in enumerate(t["water"]["tiers"]):
                if "pricePerM3" not in tier:
                    hatalar.append(f"{city} water tier {i} pricePerM3 eksik")

    return hatalar


def validate_provinces(data):
    hatalar = []
    if not data:
        return ["Veri yüklenemedi"]

    if "provinces" not in data:
        hatalar.append("provinces bölümü eksik")
        return hatalar

    provinces = data["provinces"]
    if len(provinces) != 81:
        hatalar.append(f"İl sayısı 81 değil: {len(provinces)}")

    required_fields = ["id", "name", "slug", "region", "distributionCompany"]
    for p in provinces:
        for field in required_fields:
            if field not in p:
                hatalar.append(f"İl {p.get('name', '?')} {field} eksik")

    ids = [p["id"] for p in provinces if "id" in p]
    if len(ids) != len(set(ids)):
        hatalar.append("Tekrarlayan il kodları var")

    return hatalar


def main():
    print("=" * 60)
    print("Tarife Veri Doğrulama")
    print("=" * 60)

    tum_hatalar = {}

    print("\n[1/4] Elektrik tarifeleri kontrol ediliyor...")
    electricity = load_json(DATA_DIR / "electricity-tariffs.json")
    hatalar = validate_electricity(electricity)
    if hatalar:
        tum_hatalar["electricity"] = hatalar
        for h in hatalar:
            print(f"  [HATA] {h}")
    else:
        print("  [OK] Elektrik tarifeleri geçerli")

    print("\n[2/4] Doğalgaz tarifeleri kontrol ediliyor...")
    gas = load_json(DATA_DIR / "gas-tariffs.json")
    hatalar = validate_gas(gas)
    if hatalar:
        tum_hatalar["gas"] = hatalar
        for h in hatalar:
            print(f"  [HATA] {h}")
    else:
        print("  [OK] Doğalgaz tarifeleri geçerli")

    print("\n[3/4] Su tarifeleri kontrol ediliyor...")
    water = load_json(DATA_DIR / "water-tariffs.json")
    hatalar = validate_water(water)
    if hatalar:
        tum_hatalar["water"] = hatalar
        for h in hatalar:
            print(f"  [HATA] {h}")
    else:
        print("  [OK] Su tarifeleri geçerli")

    print("\n[4/4] İller verisi kontrol ediliyor...")
    provinces = load_json(DATA_DIR / "provinces.json")
    hatalar = validate_provinces(provinces)
    if hatalar:
        tum_hatalar["provinces"] = hatalar
        for h in hatalar:
            print(f"  [HATA] {h}")
    else:
        print("  [OK] İller verisi geçerli (81 il)")

    print("\n" + "=" * 60)
    if tum_hatalar:
        toplam = sum(len(v) for v in tum_hatalar.values())
        print(f"[HATA] {toplam} hata bulundu!")
        sys.exit(1)
    else:
        print("[OK] Tüm veriler geçerli!")
        sys.exit(0)


if __name__ == "__main__":
    main()
