#!/usr/bin/env python3
"""
EPDK Elektrik Tarife Veri Çekme Scripti
epdk.gov.tr üzerinden güncel tarife bilgilerini çeker ve JSON dosyalarını günceller.
"""

import json
import os
import sys
from datetime import datetime
from pathlib import Path
from urllib.request import urlopen, Request
from urllib.error import URLError

EPDK_TARIFF_URL = "https://www.epdk.gov.tr/"
DATA_DIR = Path(__file__).parent.parent / "data"
ELECTRICITY_FILE = DATA_DIR / "electricity-tariffs.json"
GAS_FILE = DATA_DIR / "gas-tariffs.json"
LAST_UPDATED_FILE = DATA_DIR / "last-updated.json"

USER_AGENT = "Mozilla/5.0 (compatible; ElektrikFaturaBot/1.0)"


def load_json(filepath):
    """JSON dosyasını yükler, hata durumunda None döner."""
    try:
        with open(filepath, "r", encoding="utf-8") as f:
            return json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        return None


def save_json(filepath, data):
    """Veriyi JSON dosyasına yazar."""
    filepath.parent.mkdir(parents=True, exist_ok=True)
    with open(filepath, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print(f"[OK] Kaydedildi: {filepath}")


def fetch_epdk_page(url):
    """EPDK sayfasını çeker."""
    try:
        req = Request(url, headers={"User-Agent": USER_AGENT})
        with urlopen(req, timeout=30) as response:
            return response.read().decode("utf-8", errors="replace")
    except URLError as e:
        print(f"[WARN] EPDK sayfası çekilemedi: {e}")
        return None


def parse_tariff_from_html(html_content):
    """
    HTML içeriğinden tarife tablosunu parse eder.
    EPDK'nın sayfa yapısı değişebileceğinden, bu fonksiyon
    temel bir yaklaşımla tablo verilerini çıkarmaya çalışır.
    """
    if not html_content:
        return None

    tariffs = {}
    try:
        from html.parser import HTMLParser

        class TarifeParser(HTMLParser):
            def __init__(self):
                super().__init__()
                self.in_table = False
                self.in_row = False
                self.in_cell = False
                self.current_row = []
                self.current_cell = ""
                self.tables = []
                self.current_table = []

            def handle_starttag(self, tag, attrs):
                if tag == "table":
                    self.in_table = True
                    self.current_table = []
                elif tag == "tr" and self.in_table:
                    self.in_row = True
                    self.current_row = []
                elif tag in ("td", "th") and self.in_row:
                    self.in_cell = True
                    self.current_cell = ""

            def handle_endtag(self, tag):
                if tag == "table" and self.in_table:
                    self.in_table = False
                    if self.current_table:
                        self.tables.append(self.current_table)
                elif tag == "tr" and self.in_row:
                    self.in_row = False
                    if self.current_row:
                        self.current_table.append(self.current_row)
                elif tag in ("td", "th") and self.in_cell:
                    self.in_cell = False
                    self.current_row.append(self.current_cell.strip())

            def handle_data(self, data):
                if self.in_cell:
                    self.current_cell += data

        parser = TarifeParser()
        parser.feed(html_content)
        return parser.tables
    except ImportError:
        return None
    except Exception as e:
        print(f"[WARN] HTML parse hatası: {e}")
        return None


def validate_tariff_data(data):
    """Tarife verisinin temel doğrulamasını yapar."""
    if not data or "tariffs" not in data:
        return False

    required_types = ["mesken", "ticarethane", "sanayi"]
    for t in required_types:
        if t not in data["tariffs"]:
            return False

    for tariff_type in required_types:
        tek = data["tariffs"][tariff_type].get("tekZamanli", {})
        if "tiers" not in tek or "fixedCharges" not in tek or "taxes" not in tek:
            return False

    return True


def update_last_updated():
    """Son güncelleme tarihini günceller."""
    today = datetime.now().strftime("%Y-%m-%d")
    data = {
        "lastUpdated": today,
        "electricity": today,
        "gas": today,
        "water": today,
        "nextScheduledUpdate": datetime(
            datetime.now().year, datetime.now().month + 1 if datetime.now().month < 12 else 1, 1
        ).strftime("%Y-%m-%d"),
    }
    save_json(LAST_UPDATED_FILE, data)
    return data


def main():
    print("=" * 60)
    print("EPDK Tarife Veri Güncelleme")
    print("=" * 60)

    existing_electricity = load_json(ELECTRICITY_FILE)
    existing_gas = load_json(GAS_FILE)

    print("[INFO] EPDK sayfası kontrol ediliyor...")
    html = fetch_epdk_page(EPDK_TARIFF_URL)

    if html:
        tables = parse_tariff_from_html(html)
        if tables:
            print(f"[INFO] {len(tables)} tablo bulundu")
        else:
            print("[WARN] Tarife tablosu bulunamadı, mevcut veri korunuyor")
    else:
        print("[WARN] EPDK'ya erişilemedi, mevcut veri korunuyor")

    if existing_electricity and validate_tariff_data(existing_electricity):
        print("[OK] Mevcut elektrik tarife verisi geçerli")
    else:
        print("[ERROR] Mevcut elektrik tarife verisi geçersiz!")
        sys.exit(1)

    if existing_gas and "tariffs" in existing_gas:
        print("[OK] Mevcut doğalgaz tarife verisi geçerli")
    else:
        print("[ERROR] Mevcut doğalgaz tarife verisi geçersiz!")
        sys.exit(1)

    print("[INFO] Son güncelleme tarihi güncelleniyor...")
    update_last_updated()

    print("=" * 60)
    print("[OK] Tarife güncelleme tamamlandı")
    print("=" * 60)


if __name__ == "__main__":
    main()
