import { MenuItem, Order } from '../types';

/** Small square crops used as extra thumbnails. Kept here so the demo data stays self-contained. */
const IMG = {
  paine: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&q=80&w=200',
  galbenus: 'https://images.unsplash.com/photo-1518569656558-1f25e69d93d7?auto=format&fit=crop&q=80&w=200',
  ceapa: 'https://images.unsplash.com/photo-1618512496248-a07fe83aa8cb?auto=format&fit=crop&q=80&w=200',
  rosii: 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?auto=format&fit=crop&q=80&w=200',
  pesto: 'https://images.unsplash.com/photo-1595475207225-428b62bda831?auto=format&fit=crop&q=80&w=200',
  nuci: 'https://images.unsplash.com/photo-1508061253366-f7da158b6d46?auto=format&fit=crop&q=80&w=200',
  branza: 'https://images.unsplash.com/photo-1486297678162-eb2a19b0a32d?auto=format&fit=crop&q=80&w=200',
  parmezan: 'https://images.unsplash.com/photo-1452195100486-9cc805987862?auto=format&fit=crop&q=80&w=200',
  smantana: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?auto=format&fit=crop&q=80&w=200',
  ardei: 'https://images.unsplash.com/photo-1583119022894-919a68a3d0e3?auto=format&fit=crop&q=80&w=200',
  usturoi: 'https://images.unsplash.com/photo-1540148426945-6cf22a6b2383?auto=format&fit=crop&q=80&w=200',
  crutoane: 'https://images.unsplash.com/photo-1550507992-eb63ffee0847?auto=format&fit=crop&q=80&w=200',
  sos: 'https://images.unsplash.com/photo-1472476443507-c7a5948772fc?auto=format&fit=crop&q=80&w=200',
  trufe: 'https://images.unsplash.com/photo-1600335895229-6e75511892c8?auto=format&fit=crop&q=80&w=200',
  hribi: 'https://images.unsplash.com/photo-1518977676601-b53f82aba655?auto=format&fit=crop&q=80&w=200',
  pui: 'https://images.unsplash.com/photo-1604503468506-a8da13d82791?auto=format&fit=crop&q=80&w=200',
  inghetata: 'https://images.unsplash.com/photo-1497034825429-c343d7c6a68f?auto=format&fit=crop&q=80&w=200',
  fructe: 'https://images.unsplash.com/photo-1498557850523-fd3d118b962e?auto=format&fit=crop&q=80&w=200',
  cacao: 'https://images.unsplash.com/photo-1481391319762-47dff72954d9?auto=format&fit=crop&q=80&w=200',
  espresso: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&q=80&w=200',
  limonada: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&q=80&w=200',
  vin: 'https://images.unsplash.com/photo-1506377247377-2a5b3b417ebb?auto=format&fit=crop&q=80&w=200',
  apa: 'https://images.unsplash.com/photo-1560023907-5f339617ea30?auto=format&fit=crop&q=80&w=200',
  lava: 'https://images.unsplash.com/photo-1624353365286-3f8d62daad51?auto=format&fit=crop&q=80&w=200',
};

export const initialMenu: MenuItem[] = [
  // Aperitive
  {
    id: 'm1',
    category: 'Aperitive',
    name: 'Tartar de vită Black Angus',
    description: 'Cu capere, ceapă eșalotă, gălbenuș confiat și pâine cu maia.',
    price: 85,
    image: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&q=80&w=600',
    available: true,
    stock: 10,
    prepTimeMinutes: 15,
    extras: [
      { id: 'e1', name: 'Pâine cu maia extra', price: 10, image: IMG.paine, group: 'ingredient' },
      { id: 'e2', name: 'Fără capere', price: 0, group: 'ingredient' },
      { id: 'e30', name: 'Gălbenuș confiat extra', price: 8, image: IMG.galbenus, group: 'ingredient' },
      { id: 'e31', name: 'Ceapă eșalotă extra', price: 0, image: IMG.ceapa, group: 'ingredient' },
      { id: 'e32', name: 'Limonadă cu mentă', price: 25, image: IMG.limonada, group: 'recommended' },
      { id: 'e33', name: 'Pahar de Fetească Neagră', price: 35, image: IMG.vin, group: 'recommended' }
    ]
  },
  {
    id: 'm2',
    category: 'Aperitive',
    name: 'Burrata artizanală',
    description: 'Roșii de grădină, pesto de busuioc, muguri de pin și ulei de măsline extravirgin.',
    price: 55,
    image: 'https://images.unsplash.com/photo-1577906096429-f73c2c312435?auto=format&fit=crop&q=80&w=600',
    available: true,
    stock: 10,
    prepTimeMinutes: 12,
    extras: [
      { id: 'e3', name: 'Fără muguri de pin', price: 0, group: 'ingredient' },
      { id: 'e34', name: 'Roșii cherry extra', price: 7, image: IMG.rosii, group: 'ingredient' },
      { id: 'e35', name: 'Pesto de busuioc extra', price: 6, image: IMG.pesto, group: 'ingredient' },
      { id: 'e36', name: 'Pâine cu maia', price: 10, image: IMG.paine, group: 'recommended' },
      { id: 'e37', name: 'Apă minerală', price: 15, image: IMG.apa, group: 'recommended' }
    ]
  },
  {
    id: 'm3',
    category: 'Aperitive',
    name: 'Carpaccio de caracatiță',
    description: 'Emulsie de lămâie, piper roz și micro-ierburi proaspete.',
    price: 75,
    image: 'https://images.unsplash.com/photo-1565557623262-b51c2513a641?auto=format&fit=crop&q=80&w=600',
    available: true,
    stock: 10,
    prepTimeMinutes: 18,
  },

  // Ciorbe
  {
    id: 'm13',
    category: 'Ciorbe',
    name: 'Ciorbă de burtă',
    description: 'Smântână, usturoi și ardei iute pe lângă, exact ca la carte.',
    price: 38,
    image: 'https://images.unsplash.com/photo-1547592166-23ac45744acd?auto=format&fit=crop&q=80&w=600',
    available: true,
    stock: 10,
    prepTimeMinutes: 20,
    extras: [
      { id: 'e20', name: 'Ardei iute extra', price: 0, image: IMG.ardei, group: 'ingredient' },
      { id: 'e21', name: 'Smântână extra', price: 5, image: IMG.smantana, group: 'ingredient' },
      { id: 'e38', name: 'Usturoi extra', price: 0, image: IMG.usturoi, group: 'ingredient' },
      { id: 'e39', name: 'Pâine cu maia', price: 10, image: IMG.paine, group: 'recommended' }
    ]
  },
  {
    id: 'm14',
    category: 'Ciorbe',
    name: 'Supă cremă de linte roșie',
    description: 'Lapte de cocos, chimion prăjit și crutoane cu ierburi.',
    price: 32,
    image: 'https://images.unsplash.com/photo-1476718406336-bb5a9690ee2a?auto=format&fit=crop&q=80&w=600',
    available: true,
    stock: 10,
    prepTimeMinutes: 18,
    extras: [
      { id: 'e22', name: 'Crutoane extra', price: 5, image: IMG.crutoane, group: 'ingredient' },
      { id: 'e40', name: 'Limonadă cu mentă', price: 25, image: IMG.limonada, group: 'recommended' }
    ]
  },

  // Feluri principale
  {
    id: 'm4',
    category: 'Feluri principale',
    name: 'Mușchiuleț de vită',
    description: 'Piure de trufe negre, sparanghel tras la tigaie și sos demiglace.',
    price: 120,
    image: 'https://images.unsplash.com/photo-1558030006-450675393462?auto=format&fit=crop&q=80&w=600',
    available: true,
    stock: 10,
    prepTimeMinutes: 25,
    extras: [
      { id: 'e4', name: 'Extra sos demiglace', price: 8, image: IMG.sos, group: 'ingredient' },
      { id: 'e5', name: 'Bine făcut', price: 0, group: 'ingredient' },
      { id: 'e41', name: 'Sparanghel extra', price: 12, group: 'ingredient' },
      { id: 'e42', name: 'Piure de trufe extra', price: 15, image: IMG.trufe, group: 'ingredient' },
      { id: 'e43', name: 'Pahar de Fetească Neagră', price: 35, image: IMG.vin, group: 'recommended' },
      { id: 'e44', name: 'Lava cake artizanal', price: 45, image: IMG.lava, group: 'recommended' }
    ]
  },
  {
    id: 'm5',
    category: 'Feluri principale',
    name: 'File de biban de mare',
    description: 'Cu risotto cu șofran și spumă fină de lămâie.',
    price: 95,
    image: 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?auto=format&fit=crop&q=80&w=600',
    available: true,
    stock: 10,
    prepTimeMinutes: 22,
  },
  {
    id: 'm6',
    category: 'Feluri principale',
    name: 'Risotto cu hribi',
    description: 'Orez carnaroli, hribi de pădure, parmezan maturat 24 de luni.',
    price: 65,
    image: 'https://images.unsplash.com/photo-1595295333158-4742f28fbd85?auto=format&fit=crop&q=80&w=600',
    available: true,
    stock: 10,
    prepTimeMinutes: 20,
    extras: [
      { id: 'e6', name: 'Extra parmezan', price: 10, image: IMG.parmezan, group: 'ingredient' },
      { id: 'e7', name: 'Fără unt', price: 0, group: 'ingredient' },
      { id: 'e45', name: 'Hribi extra', price: 14, image: IMG.hribi, group: 'ingredient' },
      { id: 'e46', name: 'Apă minerală', price: 15, image: IMG.apa, group: 'recommended' }
    ]
  },
  {
    id: 'm7',
    category: 'Feluri principale',
    name: 'Piept de rață confiat',
    description: 'Piure de păstârnac, sos de fructe de pădure și legume sote.',
    price: 85,
    image: 'https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?auto=format&fit=crop&q=80&w=600',
    available: true,
    stock: 10,
    prepTimeMinutes: 28,
  },

  // Salate
  {
    id: 'm15',
    category: 'Salate',
    name: 'Salată Caesar cu pui',
    description: 'Piept de pui la grătar, parmezan ras și dressing clasic de casă.',
    price: 52,
    image: 'https://images.unsplash.com/photo-1546793665-c74683f339c1?auto=format&fit=crop&q=80&w=600',
    available: true,
    stock: 10,
    prepTimeMinutes: 12,
    extras: [
      { id: 'e23', name: 'Fără crutoane', price: 0, image: IMG.crutoane, group: 'ingredient' },
      { id: 'e24', name: 'Parmezan extra', price: 8, image: IMG.parmezan, group: 'ingredient' },
      { id: 'e47', name: 'Piept de pui extra', price: 14, image: IMG.pui, group: 'ingredient' },
      { id: 'e48', name: 'Dressing servit separat', price: 0, group: 'ingredient' },
      { id: 'e49', name: 'Limonadă cu mentă', price: 25, image: IMG.limonada, group: 'recommended' }
    ]
  },
  {
    id: 'm16',
    category: 'Salate',
    name: 'Salată de sfeclă și brânză de capră',
    description: 'Sfeclă coaptă, nuci caramelizate și dressing de portocale.',
    price: 46,
    image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&q=80&w=600',
    available: true,
    stock: 10,
    prepTimeMinutes: 10,
    extras: [
      { id: 'e25', name: 'Nuci extra', price: 6, image: IMG.nuci, group: 'ingredient' },
      { id: 'e50', name: 'Brânză de capră extra', price: 9, image: IMG.branza, group: 'ingredient' },
      { id: 'e51', name: 'Apă minerală', price: 15, image: IMG.apa, group: 'recommended' }
    ]
  },

  // Desert
  {
    id: 'm8',
    category: 'Desert',
    name: 'Lava cake artizanal',
    description: 'Ciocolată belgiană caldă, înghețată artizanală de vanilie de Madagascar.',
    price: 45,
    image: 'https://images.unsplash.com/photo-1624353365286-3f8d62daad51?auto=format&fit=crop&q=80&w=600',
    available: true,
    stock: 10,
    prepTimeMinutes: 14,
    extras: [
      { id: 'e52', name: 'Înghețată de vanilie extra', price: 8, image: IMG.inghetata, group: 'ingredient' },
      { id: 'e53', name: 'Fructe de pădure', price: 6, image: IMG.fructe, group: 'ingredient' },
      { id: 'e56', name: 'Espresso', price: 12, image: IMG.espresso, group: 'recommended' }
    ]
  },
  {
    id: 'm9',
    category: 'Desert',
    name: 'Tiramisu clasic',
    description: 'Pișcoturi însiropate în espresso, cremă de mascarpone fină și cacao.',
    price: 45,
    image: 'https://images.unsplash.com/photo-1571115177098-24ec42ed204d?auto=format&fit=crop&q=80&w=600',
    available: true,
    stock: 10,
    prepTimeMinutes: 8,
    extras: [
      { id: 'e54', name: 'Cacao extra', price: 0, image: IMG.cacao, group: 'ingredient' },
      { id: 'e55', name: 'Fără cacao pudră', price: 0, group: 'ingredient' }
    ]
  },

  // Băuturi
  {
    id: 'm10',
    category: 'Băuturi',
    name: 'Limonadă cu mentă',
    description: 'Lămâi proaspete, mentă, sirop natural de agave. 400ml.',
    price: 25,
    image: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&q=80&w=600',
    available: true,
    stock: 10,
    prepTimeMinutes: 5,
  },
  {
    id: 'm11',
    category: 'Băuturi',
    name: 'Vin roșu Fetească Neagră',
    description: 'Pahar 150ml - note de prune uscate, condimente și vanilie.',
    price: 35,
    image: 'https://images.unsplash.com/photo-1506377247377-2a5b3b417ebb?auto=format&fit=crop&q=80&w=600',
    available: true,
    stock: 10,
    prepTimeMinutes: 3,
  },
  {
    id: 'm12',
    category: 'Băuturi',
    name: 'Apă minerală',
    description: 'Sticlă 750ml, apă minerală naturală.',
    price: 15,
    image: 'https://images.unsplash.com/photo-1560023907-5f339617ea30?auto=format&fit=crop&q=80&w=600',
    available: true,
    stock: 10,
    prepTimeMinutes: 3,
  }
];

export const mockOrders: Order[] = [
  {
    id: 'ORD-001',
    items: [
      { id: 'c1', menuItem: initialMenu[0], quantity: 1, selectedExtras: [] },
      { id: 'c2', menuItem: initialMenu[3], quantity: 1, selectedExtras: [] }
    ],
    status: 'În preparare',
    type: 'livrare',
    total: 205,
    customerName: 'Andrei Ionescu',
    customerPhone: '0740123456',
    time: 'Cât mai repede (30–45 min)',
    paymentMethod: 'card',
    createdAt: new Date(Date.now() - 15 * 60000),
    address: 'Bulevardul Magheru 12, București',
    coordinates: { lat: 44.4383, lng: 26.0976 } // Magheru, near Piata Romana
  },
  {
    id: 'ORD-002',
    items: [
      { id: 'c3', menuItem: initialMenu[1], quantity: 2, selectedExtras: [] },
      { id: 'c4', menuItem: initialMenu[8], quantity: 2, selectedExtras: [] }
    ],
    status: 'Gata de ridicare', // changed from 'Pe drum' to 'Gata de ridicare' so it's ready for the courier to pick up
    type: 'livrare',
    total: 200,
    customerName: 'Maria Popescu',
    customerPhone: '0722987654',
    time: '19:30',
    paymentMethod: 'cash',
    createdAt: new Date(Date.now() - 45 * 60000),
    address: 'Strada Lipscani 19, București',
    coordinates: { lat: 44.4319, lng: 26.1011 } // Centrul vechi
  },
  {
    id: 'ORD-003',
    items: [
      { id: 'c5', menuItem: initialMenu[5], quantity: 1, selectedExtras: [] }
    ],
    status: 'Pe drum',
    type: 'livrare',
    total: 65,
    customerName: 'Cristian Stan',
    customerPhone: '0755112233',
    time: '14:00',
    paymentMethod: 'cash',
    createdAt: new Date(Date.now() - 60 * 60000),
    address: 'Calea Victoriei 100, București',
    coordinates: { lat: 44.4452, lng: 26.0901 } // Piata Victoriei
  }
];
