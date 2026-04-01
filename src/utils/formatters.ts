export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatNumber(value: number, decimals = 2): string {
  return new Intl.NumberFormat('tr-TR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(d);
}

export function slugify(text: string): string {
  const trMap: Record<string, string> = {
    ç: 'c',
    Ç: 'C',
    ğ: 'g',
    Ğ: 'G',
    ı: 'i',
    İ: 'I',
    ö: 'o',
    Ö: 'O',
    ş: 's',
    Ş: 'S',
    ü: 'u',
    Ü: 'U',
  };

  return text
    .split('')
    .map((char) => trMap[char] || char)
    .join('')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export function getProvinceName(slug: string): string {
  const nameMap: Record<string, string> = {
    adana: 'Adana',
    adiyaman: 'Adıyaman',
    afyonkarahisar: 'Afyonkarahisar',
    agri: 'Ağrı',
    amasya: 'Amasya',
    ankara: 'Ankara',
    antalya: 'Antalya',
    artvin: 'Artvin',
    aydin: 'Aydın',
    balikesir: 'Balıkesir',
    bilecik: 'Bilecik',
    bingol: 'Bingöl',
    bitlis: 'Bitlis',
    bolu: 'Bolu',
    burdur: 'Burdur',
    bursa: 'Bursa',
    canakkale: 'Çanakkale',
    cankiri: 'Çankırı',
    corum: 'Çorum',
    denizli: 'Denizli',
    diyarbakir: 'Diyarbakır',
    edirne: 'Edirne',
    elazig: 'Elazığ',
    erzincan: 'Erzincan',
    erzurum: 'Erzurum',
    eskisehir: 'Eskişehir',
    gaziantep: 'Gaziantep',
    giresun: 'Giresun',
    gumushane: 'Gümüşhane',
    hakkari: 'Hakkari',
    hatay: 'Hatay',
    isparta: 'Isparta',
    mersin: 'Mersin',
    istanbul: 'İstanbul',
    izmir: 'İzmir',
    kars: 'Kars',
    kastamonu: 'Kastamonu',
    kayseri: 'Kayseri',
    kirklareli: 'Kırklareli',
    kirsehir: 'Kırşehir',
    kocaeli: 'Kocaeli',
    konya: 'Konya',
    kutahya: 'Kütahya',
    malatya: 'Malatya',
    manisa: 'Manisa',
    kahramanmaras: 'Kahramanmaraş',
    mardin: 'Mardin',
    mugla: 'Muğla',
    mus: 'Muş',
    nevsehir: 'Nevşehir',
    nigde: 'Niğde',
    ordu: 'Ordu',
    rize: 'Rize',
    sakarya: 'Sakarya',
    samsun: 'Samsun',
    siirt: 'Siirt',
    sinop: 'Sinop',
    sivas: 'Sivas',
    tekirdag: 'Tekirdağ',
    tokat: 'Tokat',
    trabzon: 'Trabzon',
    tunceli: 'Tunceli',
    sanliurfa: 'Şanlıurfa',
    usak: 'Uşak',
    van: 'Van',
    yozgat: 'Yozgat',
    zonguldak: 'Zonguldak',
    aksaray: 'Aksaray',
    bayburt: 'Bayburt',
    karaman: 'Karaman',
    kirikkale: 'Kırıkkale',
    batman: 'Batman',
    sirnak: 'Şırnak',
    bartin: 'Bartın',
    ardahan: 'Ardahan',
    igdir: 'Iğdır',
    yalova: 'Yalova',
    karabuk: 'Karabük',
    kilis: 'Kilis',
    osmaniye: 'Osmaniye',
    duzce: 'Düzce',
  };

  return nameMap[slug] || slug;
}
